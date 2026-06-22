import pool from '../../config/pgDatabase.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../../utils/response.js';
import { writeAuditLog, extractRequestMeta, getAuditLogs } from '../../services/audit.service.js';

// ─── Dashboard Overview ──────────────────────────────────────────────────────

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [users, posts, messages, groups, reports, stories, activeToday] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as total FROM users'),
    pool.query('SELECT COUNT(*)::int as total FROM posts WHERE deleted_at IS NULL'),
    pool.query('SELECT COUNT(*)::int as total FROM messages'),
    pool.query('SELECT COUNT(*)::int as total FROM groups'),
    pool.query('SELECT COUNT(*)::int as total FROM reports'),
    pool.query('SELECT COUNT(*)::int as total FROM stories'),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM analytics_events
      WHERE event_type IN ('app_open', 'login', 'post_create', 'message_sent')
        AND created_at > NOW() - INTERVAL '24 hours'
    `),
  ]);

  // Growth (past 7 days)
  const { rows: userGrowth } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*)::int as count
    FROM users
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  // Report stats
  const { rows: reportStatusCounts } = await pool.query(`
    SELECT status, COUNT(*)::int as count FROM reports GROUP BY status
  `);

  sendSuccess(res, {
    users: users.rows[0].total,
    posts: posts.rows[0].total,
    messages: messages.rows[0].total,
    groups: groups.rows[0].total,
    reports: reports.rows[0].total,
    stories: stories.rows[0].total,
    activeToday: activeToday.rows[0].count,
    userGrowth,
    reportStatusCounts,
  });
});

// ─── User stats ───────────────────────────────────────────────────────────────

export const getUserStats = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const interval = period === '7d' ? "7 days" : period === '90d' ? "90 days" : "30 days";

  const [total, signups, byRole, dau, mau, wau] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as total FROM users'),
    pool.query(`SELECT COUNT(*)::int as count FROM users WHERE created_at > NOW() - INTERVAL '${interval}'`),
    pool.query('SELECT role, COUNT(*)::int as count FROM users GROUP BY role ORDER BY count DESC'),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM analytics_events
      WHERE event_type IN ('app_open', 'login')
        AND created_at > NOW() - INTERVAL '24 hours'
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM analytics_events
      WHERE event_type IN ('app_open', 'login')
        AND created_at > NOW() - INTERVAL '30 days'
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM analytics_events
      WHERE event_type IN ('app_open', 'login')
        AND created_at > NOW() - INTERVAL '7 days'
    `),
  ]);

  // Daily signups for chart
  const { rows: dailySignups } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*)::int as count
    FROM users
    WHERE created_at > NOW() - INTERVAL '${interval}'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);

  sendSuccess(res, {
    total: total.rows[0].total,
    signups: signups.rows[0].count,
    byRole: byRole.rows,
    dau: dau.rows[0].count,
    wau: wau.rows[0].count,
    mau: mau.rows[0].count,
    dailySignups,
  });
});

// ─── Analytics events (tracked from backend) ──────────────────────────────────

export const trackEvent = asyncHandler(async (req, res) => {
  const { eventType, sessionId, deviceType, platform, appVersion, country, region, city, metadata } = req.body;

  if (!eventType) {
    return res.status(400).json({ status: 'error', error: { message: 'eventType is required' } });
  }

  await pool.query(
    `INSERT INTO analytics_events (event_type, user_id, session_id, device_type, platform, app_version, country, region, city, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      eventType,
      req.user?.id || null,
      sessionId || null,
      deviceType || null,
      platform || null,
      appVersion || null,
      country || null,
      region || null,
      city || null,
      metadata ? JSON.stringify(metadata) : '{}',
    ]
  );

  sendSuccess(res, { tracked: true });
});

// ─── Analytics queries ────────────────────────────────────────────────────────

export const getAnalytics = asyncHandler(async (req, res) => {
  const { eventType, period = '30d', granularity = 'day' } = req.query;
  const interval = period === '7d' ? "7 days" : period === '90d' ? "90 days" : "30 days";
  const dateTrunc = granularity === 'hour' ? 'hour' : 'day';

  let whereClause = '';
  const values = [];

  if (eventType) {
    whereClause = 'WHERE event_type = $1';
    values.push(eventType);
  }

  const { rows: events } = await pool.query(`
    SELECT DATE_TRUNC('${dateTrunc}', created_at) as bucket,
           event_type as "eventType",
           COUNT(*)::int as count
    FROM analytics_events
    ${whereClause ? whereClause + ' AND' : 'WHERE'}
    created_at > NOW() - INTERVAL '${interval}'
    GROUP BY bucket, event_type
    ORDER BY bucket ASC
  `, values);

  // Top events
  const { rows: topEvents } = await pool.query(`
    SELECT event_type as "eventType", COUNT(*)::int as count
    FROM analytics_events
    WHERE created_at > NOW() - INTERVAL '${interval}'
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT 20
  `);

  sendSuccess(res, { events, topEvents });
});

// ─── Geography breakdown ──────────────────────────────────────────────────────

export const getGeographyAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const interval = period === '7d' ? "7 days" : period === '90d' ? "90 days" : "30 days";

  const { rows: byCountry } = await pool.query(`
    SELECT country, COUNT(*)::int as count,
           COUNT(DISTINCT user_id)::int as users
    FROM analytics_events
    WHERE country IS NOT NULL AND created_at > NOW() - INTERVAL '${interval}'
    GROUP BY country
    ORDER BY count DESC
    LIMIT 20
  `);

  const { rows: byRegion } = await pool.query(`
    SELECT country, region, COUNT(*)::int as count
    FROM analytics_events
    WHERE region IS NOT NULL AND created_at > NOW() - INTERVAL '${interval}'
    GROUP BY country, region
    ORDER BY count DESC
    LIMIT 20
  `);

  sendSuccess(res, { byCountry, byRegion });
});

// ─── Device/platform breakdown ────────────────────────────────────────────────

export const getDeviceAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  const interval = period === '7d' ? "7 days" : period === '90d' ? "90 days" : "30 days";

  const [byDevice, byPlatform, byVersion] = await Promise.all([
    pool.query(`
      SELECT device_type as "deviceType", COUNT(*)::int as count
      FROM analytics_events
      WHERE device_type IS NOT NULL AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY device_type ORDER BY count DESC
    `),
    pool.query(`
      SELECT platform, COUNT(*)::int as count
      FROM analytics_events
      WHERE platform IS NOT NULL AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY platform ORDER BY count DESC
    `),
    pool.query(`
      SELECT app_version as "appVersion", platform, COUNT(*)::int as count
      FROM analytics_events
      WHERE app_version IS NOT NULL AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY app_version, platform ORDER BY count DESC
      LIMIT 15
    `),
  ]);

  sendSuccess(res, {
    byDevice: byDevice.rows,
    byPlatform: byPlatform.rows,
    byVersion: byVersion.rows,
  });
});

// ─── Retention cohorts ───────────────────────────────────────────────────────

export const getRetentionAnalytics = asyncHandler(async (req, res) => {
  // Compute weekly cohorts: users who signed up in a given week,
  // and how many were active in subsequent weeks.
  const { rows: cohorts } = await pool.query(`
    WITH cohort_users AS (
      SELECT
        id,
        DATE_TRUNC('week', created_at)::date as cohort_week
      FROM users
      WHERE created_at > NOW() - INTERVAL '90 days'
    ),
    weekly_activity AS (
      SELECT
        cu.id,
        cu.cohort_week,
        DATE_TRUNC('week', ae.created_at)::date as active_week
      FROM cohort_users cu
      JOIN analytics_events ae ON ae.user_id = cu.id
        AND ae.event_type IN ('app_open', 'login', 'post_create', 'message_sent')
        AND ae.created_at >= cu.cohort_week
      GROUP BY cu.id, cu.cohort_week, DATE_TRUNC('week', ae.created_at)::date
    )
    SELECT
      cohort_week as "cohortWeek",
      COUNT(DISTINCT id) as "cohortSize",
      active_week as "activeWeek",
      COUNT(DISTINCT id) as "activeUsers",
      ROUND(COUNT(DISTINCT id) * 100.0 / MAX(COUNT(DISTINCT id)) OVER (PARTITION BY cohort_week), 1) as retention
    FROM weekly_activity
    GROUP BY cohort_week, active_week
    ORDER BY cohort_week, active_week
  `);

  sendSuccess(res, { cohorts });
});

// ─── User management ─────────────────────────────────────────────────────────

export const getUsersList = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }
  if (role) {
    conditions.push(`u.role = $${paramIndex++}`);
    values.push(role);
  }
  if (status === 'banned') {
    conditions.push('u.banned_at IS NOT NULL');
  } else if (status === 'suspended') {
    conditions.push('u.suspended_at IS NOT NULL');
  } else if (status === 'active') {
    conditions.push('u.banned_at IS NULL');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM users u ${where}`, values
  );
  const total = parseInt(countRows[0].count, 10);

  const { rows } = await pool.query(`
    SELECT u.id, u.name, u.email, u.avatar, u.bio, u.role,
           u.banned_at as "bannedAt", u.suspended_at as "suspendedAt",
           u.suspended_until as "suspendedUntil",
           u.created_at as "createdAt", u.updated_at as "updatedAt"
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `, [...values, limit, offset]);

  sendPaginated(res, {
    data: rows,
    pagination: { total, page: parseInt(page, 10), limit: parseInt(limit, 10), totalPages: Math.ceil(total / limit) },
  });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const validRoles = ['user', 'moderator', 'analyst', 'admin', 'super_admin'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ status: 'error', error: { message: `Invalid role. Must be one of: ${validRoles.join(', ')}` } });
  }

  // Only super_admin can assign super_admin
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ status: 'error', error: { message: 'Only super_admins can assign super_admin role' } });
  }

  const { rows: users } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  if (!users[0]) {
    return res.status(404).json({ status: 'error', error: { message: 'User not found' } });
  }

  const before = { role: users[0].role };
  const after = { role };

  await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, userId]);

  const meta = extractRequestMeta(req);
  await writeAuditLog({
    adminId: req.user.id,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: userId,
    before,
    after,
    reason: req.body.reason || null,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const { rows: updated } = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  sendSuccess(res, updated[0]);
});

// ─── Audit logs ──────────────────────────────────────────────────────────────

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { adminId, action, targetType, targetId, page = 1, limit = 20 } = req.query;

  const result = await getAuditLogs({
    adminId: adminId || null,
    action: action || null,
    targetType: targetType || null,
    targetId: targetId || null,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  sendPaginated(res, result);
});

// ─── Moderation SLA ──────────────────────────────────────────────────────────

export const getModerationSLA = asyncHandler(async (req, res) => {
  const { rows: sla } = await pool.query(`
    SELECT
      COUNT(*)::int as "totalResolved",
      ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1) as "avgHoursToResolve",
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at))) / 3600
      , 1) as "medianHoursToResolve",
      COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (updated_at - created_at)) < 3600)::int as "resolvedWithin1Hour",
      COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (updated_at - created_at)) < 86400)::int as "resolvedWithin24Hours"
    FROM reports
    WHERE status IN ('dismissed', 'action_taken', 'closed')
      AND updated_at > NOW() - INTERVAL '30 days'
  `);

  const { rows: byAdmin } = await pool.query(`
    SELECT
      u.id, u.name,
      COUNT(*)::int as "resolved",
      ROUND(AVG(EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) / 3600)::numeric, 1) as "avgHours"
    FROM reports r
    JOIN users u ON r.assigned_to = u.id
    WHERE r.status IN ('dismissed', 'action_taken', 'closed')
      AND r.updated_at > NOW() - INTERVAL '30 days'
    GROUP BY u.id, u.name
    ORDER BY "resolved" DESC
  `);

  sendSuccess(res, { ...sla[0], byAdmin });
});
