/**
 * Audit logging service for admin actions.
 *
 * Every admin action that mutates state MUST call one of these helpers to
 * produce an audit trail.  Never create an admin action without audit logging.
 */
import pool from '../config/pgDatabase.js';

/**
 * Write an audit log entry.
 *
 * @param {Object} params
 * @param {string} params.adminId       - UUID of the admin performing the action
 * @param {string} params.action        - Machine-readable action name (e.g. 'report.status_changed')
 * @param {string} [params.targetType]  - e.g. 'report', 'post', 'user', 'message'
 * @param {string} [params.targetId]    - UUID of the target resource
 * @param {Object} [params.before]      - Snapshot of the resource before the mutation
 * @param {Object} [params.after]       - Snapshot of the resource after the mutation
 * @param {string} [params.reason]      - Why the action was taken
 * @param {string} [params.notes]       - Additional notes
 * @param {string} [params.ipAddress]   - IP address from the request
 * @param {string} [params.userAgent]   - User-Agent header from the request
 * @returns {Promise<Object>} The inserted audit log row
 */
export const writeAuditLog = async ({
  adminId,
  action,
  targetType = null,
  targetId = null,
  before = null,
  after = null,
  reason = null,
  notes = null,
  ipAddress = null,
  userAgent = null,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, before_snapshot, after_snapshot, reason, notes, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, action, target_type, target_id, created_at as "createdAt"`,
    [
      adminId,
      action,
      targetType,
      targetId,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      reason,
      notes,
      ipAddress,
      userAgent,
    ]
  );
  return rows[0];
};

/**
 * Convenience: extracts IP and User-Agent from an Express request object.
 */
export const extractRequestMeta = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress || null,
  userAgent: req.headers?.['user-agent'] || null,
});

/**
 * Query audit logs with pagination and optional filters.
 */
export const getAuditLogs = async ({
  adminId = null,
  action = null,
  targetType = null,
  targetId = null,
  page = 1,
  limit = 20,
}) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (adminId) {
    conditions.push(`admin_id = $${paramIndex++}`);
    values.push(adminId);
  }
  if (action) {
    conditions.push(`action = $${paramIndex++}`);
    values.push(action);
  }
  if (targetType) {
    conditions.push(`target_type = $${paramIndex++}`);
    values.push(targetType);
  }
  if (targetId) {
    conditions.push(`target_id = $${paramIndex++}`);
    values.push(targetId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countSql = `SELECT COUNT(*) FROM audit_logs ${where}`;
  const dataSql = `
    SELECT al.*, json_build_object('id', u.id, 'name', u.name, 'email', u.email) as admin
    FROM audit_logs al
    JOIN users u ON al.admin_id = u.id
    ${where}
    ORDER BY al.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++}
  `;

  const [{ rows: countRows }, { rows }] = await Promise.all([
    pool.query(countSql, values),
    pool.query(dataSql, [...values, limit, offset]),
  ]);

  const total = parseInt(countRows[0].count, 10);

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
