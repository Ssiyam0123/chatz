import express from 'express';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import {
  createReport,
  getReports,
  getReport,
  updateReportStatus,
  assignReport,
  moderateReport,
  addCaseNote,
  bulkAction,
  getReportStats,
} from './report.controller.js';

const router = express.Router();

// ─── Public (any authenticated user) ──────────────────────────────────────────
router.post('/', protect, createReport);

// ─── Admin & Moderator ────────────────────────────────────────────────────────
router.get('/stats', protect, restrictTo('moderator', 'analyst', 'admin', 'super_admin'), getReportStats);
router.get('/', protect, restrictTo('moderator', 'analyst', 'admin', 'super_admin'), getReports);

// ─── Admin only (write operations) ────────────────────────────────────────────
router.get('/:reportId', protect, restrictTo('moderator', 'admin', 'super_admin'), getReport);
router.patch('/:reportId/status', protect, restrictTo('moderator', 'admin', 'super_admin'), updateReportStatus);
router.patch('/:reportId/assign', protect, restrictTo('admin', 'super_admin'), assignReport);
router.post('/:reportId/moderate', protect, restrictTo('moderator', 'admin', 'super_admin'), moderateReport);
router.post('/:reportId/notes', protect, restrictTo('moderator', 'admin', 'super_admin'), addCaseNote);
router.post('/bulk', protect, restrictTo('admin', 'super_admin'), bulkAction);

export default router;
