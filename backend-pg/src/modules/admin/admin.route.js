import express from 'express';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import {
  getDashboardStats,
  getUserStats,
  trackEvent,
  getAnalytics,
  getGeographyAnalytics,
  getDeviceAnalytics,
  getRetentionAnalytics,
  getUsersList,
  updateUserRole,
  listAuditLogs,
  getModerationSLA,
} from './admin.controller.js';

const router = express.Router();

// All admin routes require authentication
router.use(protect);

// ─── Analytics tracking (any authenticated user can track events) ─────────────
router.post('/events', trackEvent);

// ─── Admin & Analyst ──────────────────────────────────────────────────────────
router.get('/dashboard', restrictTo('moderator', 'analyst', 'admin', 'super_admin'), getDashboardStats);
router.get('/users/stats', restrictTo('analyst', 'admin', 'super_admin'), getUserStats);
router.get('/analytics', restrictTo('analyst', 'admin', 'super_admin'), getAnalytics);
router.get('/analytics/geography', restrictTo('analyst', 'admin', 'super_admin'), getGeographyAnalytics);
router.get('/analytics/devices', restrictTo('analyst', 'admin', 'super_admin'), getDeviceAnalytics);
router.get('/analytics/retention', restrictTo('analyst', 'admin', 'super_admin'), getRetentionAnalytics);
router.get('/moderation/sla', restrictTo('moderator', 'analyst', 'admin', 'super_admin'), getModerationSLA);

// ─── User management ───────────────────────────────────────────────────────────
router.get('/users', restrictTo('admin', 'super_admin'), getUsersList);
router.patch('/users/:userId/role', restrictTo('admin', 'super_admin'), updateUserRole);

// ─── Audit logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', restrictTo('admin', 'super_admin'), listAuditLogs);

export default router;
