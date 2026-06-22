import pool from '../../config/pgDatabase.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { writeAuditLog, extractRequestMeta } from '../../services/audit.service.js';

// ─── Valid target types ──────────────────────────────────────────────────────
const VALID_TARGET_TYPES = ['post', 'comment', 'story', 'message', 'group', 'user', 'media'];
const VALID_STATUSES = ['open', 'in_review', 'dismissed', 'action_taken', 'escalated', 'closed'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'critical'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPopulatedReport = async (reportId) => {
  const { rows } = await pool.query(
    `SELECT
       r.id, r.reporter_id as "reporterId", r.target_type as "targetType",
       r.target_id as "targetId", r.reason, r.details, r.status, r.priority,
       r.assigned_to as "assignedTo", r.escalated_at as "escalatedAt",
       r.created_at as "createdAt", r.updated_at as "updatedAt",
       json_build_object('id', rep.id, 'name', rep.name, 'avatar', rep.avatar) as reporter,
       CASE WHEN r.assigned_to IS NOT NULL THEN
         json_build_object('id', a.id, 'name', a.name, 'email', a.email)
       ELSE NULL END as assignee
     FROM reports r
     JOIN users rep ON r.reporter_id = rep.id
     LEFT JOIN users a ON r.assigned_to = a.id
     WHERE r.id = $1`,
    [reportId]
  );
  return rows[0] || null;
};

const getTargetContent = async (targetType, targetId) => {
  const queries = {
    post:       'SELECT id, user_id as "userId", content, image, created_at as "createdAt" FROM posts WHERE id = $1',
    comment:    'SELECT pc.id, pc.text, pc.user_id as "userId", pc.post_id as "postId", pc.created_at as "createdAt" FROM post_comments pc WHERE pc.id = $1',
    story:      'SELECT id, user_id as "userId", image, text, created_at as "createdAt" FROM stories WHERE id = $1',
    message:    'SELECT id, sender_id as "senderId", text, image, created_at as "createdAt" FROM messages WHERE id = $1',
    group:      'SELECT id, name, creator_id as "creatorId", created_at as "createdAt" FROM groups WHERE id = $1',
    user:       'SELECT id, name, email, avatar, bio, created_at as "createdAt" FROM users WHERE id = $1',
    media:      'SELECT id, user_id as "userId", image, created_at as "createdAt" FROM stories WHERE id = $1',
  };

  const sql = queries[targetType];
  if (!sql) return null;

  const { rows } = await pool.query(sql, [targetId]);
  return rows[0] || null;
};

// ─── Public: create a report (any authenticated user) ─────────────────────────

export const createReport = asyncHandler(async (req, res) => {
  const { targetType, targetId, reason, details } = req.body;

  if (!targetType || !targetId || !reason) {
    throw AppError.badRequest('targetType, targetId, and reason are required');
  }

  if (!VALID_TARGET_TYPES.includes(targetType)) {
    throw AppError.badRequest(`Invalid targetType. Must be one of: ${VALID_TARGET_TYPES.join(', ')}`);
  }

  if (reason.length < 2 || reason.length > 500) {
    throw AppError.badRequest('Reason must be between 2 and 500 characters');
  }

  // Check if the target exists
  const target = await getTargetContent(targetType, targetId);
  if (!target) {
    throw AppError.notFound(`Target ${targetType} not found`);
  }

  // Prevent self-reporting
  const targetUserId = target.userId || target.senderId || target.creatorId || target.id;
  if (targetUserId === req.user.id) {
    throw AppError.badRequest('You cannot report yourself or your own content');
  }

  // Prevent duplicate rapid reports from same reporter on same target
  const { rows: existing } = await pool.query(
    `SELECT id FROM reports
     WHERE reporter_id = $1 AND target_type = $2 AND target_id = $3
       AND status IN ('open', 'in_review')
     LIMIT 1`,
    [req.user.id, targetType, targetId]
  );

  if (existing.length > 0) {
    throw AppError.conflict('You have already submitted an active report for this content');
  }

  const { rows } = await pool.query(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, details, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id`,
    [req.user.id, targetType, targetId, reason, details || null]
  );

  const report = await getPopulatedReport(rows[0].id);

  sendSuccess(res, report, 201);
});

// ─── Admin: list reports with filters ────────────────────────────────────────

export const getReports = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    targetType,
    priority,
    assignedTo,
    reporterId,
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = req.query;

  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`r.status = $${paramIndex++}`);
    values.push(status);
  }
  if (targetType) {
    conditions.push(`r.target_type = $${paramIndex++}`);
    values.push(targetType);
  }
  if (priority) {
    conditions.push(`r.priority = $${paramIndex++}`);
    values.push(priority);
  }
  if (assignedTo) {
    if (assignedTo === 'unassigned') {
      conditions.push('r.assigned_to IS NULL');
    } else if (assignedTo === 'me') {
      conditions.push(`r.assigned_to = $${paramIndex++}`);
      values.push(req.user.id);
    } else {
      conditions.push(`r.assigned_to = $${paramIndex++}`);
      values.push(assignedTo);
    }
  }
  if (reporterId) {
    conditions.push(`r.reporter_id = $${paramIndex++}`);
    values.push(reporterId);
  }
  if (search) {
    conditions.push(`(r.reason ILIKE $${paramIndex} OR r.details ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  // Limit accessible statuses for moderators
  if (req.user.role === 'moderator') {
    conditions.push(`r.status IN ('open', 'in_review', 'escalated')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  // Validate sort
  const validSorts = ['created_at', 'updated_at', 'priority', 'status'];
  const orderCol = validSorts.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const countSql = `SELECT COUNT(*) FROM reports r ${where}`;
  const dataSql = `
    SELECT
       r.id, r.reporter_id as "reporterId", r.target_type as "targetType",
       r.target_id as "targetId", r.reason, r.details, r.status, r.priority,
       r.assigned_to as "assignedTo", r.escalated_at as "escalatedAt",
       r.created_at as "createdAt", r.updated_at as "updatedAt",
       json_build_object('id', rep.id, 'name', rep.name, 'avatar', rep.avatar) as reporter,
       CASE WHEN r.assigned_to IS NOT NULL THEN
         json_build_object('id', a.id, 'name', a.name, 'email', a.email)
       ELSE NULL END as assignee
    FROM reports r
    JOIN users rep ON r.reporter_id = rep.id
    LEFT JOIN users a ON r.assigned_to = a.id
    ${where}
    ORDER BY r.${orderCol} ${order}
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query(countSql, values),
    pool.query(dataSql, [...values, limit, offset]),
  ]);

  const total = parseInt(countRows[0].count, 10);

  sendPaginated(res, {
    data: rows,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) },
  });
});

// ─── Admin: get single report ─────────────────────────────────────────────────

export const getReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const report = await getPopulatedReport(reportId);

  if (!report) {
    throw AppError.notFound('Report not found');
  }

  // Get attached case notes
  const { rows: notes } = await pool.query(
    `SELECT
       cn.id, cn.report_id as "reportId", cn.admin_id as "adminId",
       cn.content, cn.created_at as "createdAt", cn.updated_at as "updatedAt",
       json_build_object('id', u.id, 'name', u.name) as admin
     FROM case_notes cn
     JOIN users u ON cn.admin_id = u.id
     WHERE cn.report_id = $1
     ORDER BY cn.created_at ASC`,
    [reportId]
  );

  // Get admin actions for this report
  const { rows: actions } = await pool.query(
    `SELECT
       aa.id, aa.report_id as "reportId", aa.admin_id as "adminId",
       aa.action_type as "actionType", aa.target_type as "targetType",
       aa.target_id as "targetId", aa.details, aa.reason,
       aa.created_at as "createdAt",
       json_build_object('id', u.id, 'name', u.name) as admin
     FROM admin_actions aa
     JOIN users u ON aa.admin_id = u.id
     WHERE aa.report_id = $1
     ORDER BY aa.created_at ASC`,
    [reportId]
  );

  // Get target content
  const target = await getTargetContent(report.targetType, report.targetId);

  sendSuccess(res, { report, notes, actions, target });
});

// ─── Admin: update report status ──────────────────────────────────────────────

export const updateReportStatus = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { status, reason } = req.body;

  if (!status || !VALID_STATUSES.includes(status)) {
    throw AppError.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const report = await getPopulatedReport(reportId);
  if (!report) {
    throw AppError.notFound('Report not found');
  }

  const before = { status: report.status, priority: report.priority, assignedTo: report.assignedTo };

  // Build update
  const updates = [];
  const values = [];
  let paramIndex = 1;

  updates.push(`status = $${paramIndex++}`);
  values.push(status);

  if (status === 'escalated') {
    updates.push(`escalated_at = NOW()`);
  }

  updates.push(`updated_at = NOW()`);
  values.push(reportId);

  await pool.query(
    `UPDATE reports SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  // Audit log
  const meta = extractRequestMeta(req);
  await writeAuditLog({
    adminId: req.user.id,
    action: 'report.status_changed',
    targetType: 'report',
    targetId: reportId,
    before,
    after: { status, priority: report.priority, assignedTo: report.assignedTo },
    reason: reason || null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const updated = await getPopulatedReport(reportId);
  sendSuccess(res, updated);
});

// ─── Admin: assign report ─────────────────────────────────────────────────────

export const assignReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { assignTo } = req.body;

  const report = await getPopulatedReport(reportId);
  if (!report) {
    throw AppError.notFound('Report not found');
  }

  // If assignTo is provided, verify that user exists and has admin/moderator role
  if (assignTo) {
    const { rows: admins } = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role IN ('moderator', 'admin', 'super_admin')",
      [assignTo]
    );
    if (admins.length === 0) {
      throw AppError.badRequest('Assigned user not found or does not have moderator/admin role');
    }
  }

  const before = { assignedTo: report.assignedTo };
  const after = { assignedTo: assignTo || null };

  await pool.query(
    `UPDATE reports SET assigned_to = $1, status = CASE WHEN $1 IS NOT NULL AND status = 'open' THEN 'in_review' ELSE status END, updated_at = NOW()
     WHERE id = $2`,
    [assignTo || null, reportId]
  );

  const meta = extractRequestMeta(req);
  await writeAuditLog({
    adminId: req.user.id,
    action: 'report.assigned',
    targetType: 'report',
    targetId: reportId,
    before,
    after,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const updated = await getPopulatedReport(reportId);
  sendSuccess(res, updated);
});

// ─── Admin: moderate (take action on reported content) ────────────────────────

export const moderateReport = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { action, reason } = req.body;

  const VALID_ACTIONS = [
    'dismiss',
    'delete_content',
    'restore_content',
    'warn_user',
    'suspend_user',
    'ban_user',
    'escalate',
  ];

  if (!action || !VALID_ACTIONS.includes(action)) {
    throw AppError.badRequest(`Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  const report = await getPopulatedReport(reportId);
  if (!report) {
    throw AppError.notFound('Report not found');
  }

  const meta = extractRequestMeta(req);
  let targetContent = null;
  let targetUserId = null;

  // Get the user who owns the reported content
  if (report.targetType !== 'user') {
    targetContent = await getTargetContent(report.targetType, report.targetId);
    targetUserId = targetContent?.userId || targetContent?.senderId || targetContent?.creatorId;
  } else {
    targetUserId = report.targetId;
  }

  switch (action) {
    case 'dismiss': {
      await pool.query(
        `UPDATE reports SET status = 'dismissed', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );
      break;
    }

    case 'delete_content': {
      if (!targetContent) throw AppError.badRequest('Target content not found');
      // Soft-delete depending on target type
      const deleteQueries = {
        post:    'UPDATE posts SET deleted_at = NOW() WHERE id = $1',
        comment: 'DELETE FROM post_comments WHERE id = $1',
        story:   'UPDATE stories SET deleted_at = NOW() WHERE id = $1',
        message: 'UPDATE messages SET deleted_at = NOW() WHERE id = $1',
        group:   'DELETE FROM groups WHERE id = $1',
        user:    'UPDATE users SET banned_at = NOW() WHERE id = $1',
        // media is typically a story, so same treatment
      };
      const deleteSql = deleteQueries[report.targetType];
      if (deleteSql) {
        await pool.query(deleteSql, [report.targetId]);
      }

      await pool.query(
        `UPDATE reports SET status = 'action_taken', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      // Record the admin action
      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [reportId, req.user.id, 'delete_content', report.targetType, report.targetId, reason || null]
      );
      break;
    }

    case 'restore_content': {
      const restoreQueries = {
        post:    'UPDATE posts SET deleted_at = NULL WHERE id = $1',
        story:   'UPDATE stories SET deleted_at = NULL WHERE id = $1',
        message: 'UPDATE messages SET deleted_at = NULL WHERE id = $1',
      };
      const restoreSql = restoreQueries[report.targetType];
      if (restoreSql) {
        await pool.query(restoreSql, [report.targetId]);
      }

      await pool.query(
        `UPDATE reports SET status = 'closed', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [reportId, req.user.id, 'restore_content', report.targetType, report.targetId, reason || null]
      );
      break;
    }

    case 'warn_user': {
      if (!targetUserId) throw AppError.badRequest('Cannot identify target user');

      // Append warning to user's warnings array
      const warning = {
        issued_by: req.user.id,
        reason: reason || 'No reason provided',
        report_id: reportId,
        issued_at: new Date().toISOString(),
      };

      await pool.query(
        `UPDATE users SET warnings = warnings || $1::jsonb WHERE id = $2`,
        [JSON.stringify(warning), targetUserId]
      );

      await pool.query(
        `UPDATE reports SET status = 'action_taken', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [reportId, req.user.id, 'warn_user', 'user', targetUserId, reason || null]
      );
      break;
    }

    case 'suspend_user': {
      if (!targetUserId) throw AppError.badRequest('Cannot identify target user');
      const { suspendDays = 3 } = req.body;

      await pool.query(
        `UPDATE users SET suspended_at = NOW(), suspended_until = NOW() + INTERVAL '1 day' * $1 WHERE id = $2`,
        [suspendDays, targetUserId]
      );

      await pool.query(
        `UPDATE reports SET status = 'action_taken', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, details, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [reportId, req.user.id, 'suspend_user', 'user', targetUserId, JSON.stringify({ suspendDays }), reason || null]
      );
      break;
    }

    case 'ban_user': {
      if (!targetUserId) throw AppError.badRequest('Cannot identify target user');

      await pool.query(
        `UPDATE users SET banned_at = NOW() WHERE id = $1`,
        [targetUserId]
      );

      await pool.query(
        `UPDATE reports SET status = 'action_taken', updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [reportId, req.user.id, 'ban_user', 'user', targetUserId, reason || null]
      );

      // Also close all open reports against this user
      await pool.query(
        `UPDATE reports SET status = 'closed', updated_at = NOW() WHERE target_type = 'user' AND target_id = $1 AND status IN ('open', 'in_review')`,
        [targetUserId]
      );
      break;
    }

    case 'escalate': {
      await pool.query(
        `UPDATE reports SET status = 'escalated', escalated_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [reportId]
      );

      await pool.query(
        `INSERT INTO admin_actions (report_id, admin_id, action_type, target_type, target_id, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [reportId, req.user.id, 'escalate', report.targetType, report.targetId, reason || null]
      );
      break;
    }

    default:
      throw AppError.badRequest(`Unknown action: ${action}`);
  }

  // Write audit log
  await writeAuditLog({
    adminId: req.user.id,
    action: `report.moderate.${action}`,
    targetType: 'report',
    targetId: reportId,
    before: { status: report.status },
    after: { action, reason },
    reason: reason || null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const updated = await getPopulatedReport(reportId);
  sendSuccess(res, updated);
});

// ─── Admin: add case note ─────────────────────────────────────────────────────

export const addCaseNote = asyncHandler(async (req, res) => {
  const { reportId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw AppError.badRequest('Note content is required');
  }

  const report = await getPopulatedReport(reportId);
  if (!report) {
    throw AppError.notFound('Report not found');
  }

  const { rows } = await pool.query(
    `INSERT INTO case_notes (report_id, admin_id, content, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id, content, created_at as "createdAt"`,
    [reportId, req.user.id, content.trim()]
  );

  const note = {
    ...rows[0],
    admin: { id: req.user.id, name: req.user.name || 'Admin' },
  };

  sendSuccess(res, note, 201);
});

// ─── Admin: bulk actions ──────────────────────────────────────────────────────

export const bulkAction = asyncHandler(async (req, res) => {
  const { reportIds, action, reason } = req.body;

  if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
    throw AppError.badRequest('reportIds must be a non-empty array');
  }

  if (!action || !VALID_STATUSES.includes(action)) {
    throw AppError.badRequest(`Invalid action. Must be a valid status: ${VALID_STATUSES.join(', ')}`);
  }

  const meta = extractRequestMeta(req);
  const results = [];

  for (const reportId of reportIds) {
    try {
      const report = await getPopulatedReport(reportId);
      if (!report) continue;

      const before = { status: report.status };

      await pool.query(
        `UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2`,
        [action, reportId]
      );

      await writeAuditLog({
        adminId: req.user.id,
        action: `report.bulk.${action}`,
        targetType: 'report',
        targetId: reportId,
        before,
        after: { status: action },
        reason: reason || null,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      results.push({ reportId, status: 'updated' });
    } catch (err) {
      results.push({ reportId, status: 'error', error: err.message });
    }
  }

  sendSuccess(res, { affected: results.length, results });
});

// ─── Admin: get reports summary stats ─────────────────────────────────────────

export const getReportStats = asyncHandler(async (req, res) => {
  const { rows: statusCounts } = await pool.query(`
    SELECT status, COUNT(*)::int as count FROM reports GROUP BY status
  `);

  const { rows: typeCounts } = await pool.query(`
    SELECT target_type as "targetType", COUNT(*)::int as count FROM reports GROUP BY target_type ORDER BY count DESC
  `);

  const { rows: priorityCounts } = await pool.query(`
    SELECT priority, COUNT(*)::int as count FROM reports GROUP BY priority
  `);

  const { rows: topReasons } = await pool.query(`
    SELECT reason, COUNT(*)::int as count FROM reports GROUP BY reason ORDER BY count DESC LIMIT 10
  `);

  const { rows: todayCounts } = await pool.query(`
    SELECT COUNT(*)::int as "totalToday",
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int as "lastHour"
    FROM reports WHERE created_at > NOW() - INTERVAL '24 hours'
  `);

  sendSuccess(res, {
    statusCounts,
    typeCounts,
    priorityCounts,
    topReasons,
    ...todayCounts[0],
  });
});
