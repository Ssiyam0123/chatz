import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ───────────────────────────────────────────────────────────
export const adminLogin = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

// ─── Dashboard ──────────────────────────────────────────────────────
export const getDashboardStats = () => api.get("/admin/dashboard/stats");
export const getUserStats = (range = "30d") =>
  api.get(`/admin/users/stats?range=${range}`);
export const getAnalytics = (params?: Record<string, string>) =>
  api.get("/admin/analytics", { params });
export const getGeographyAnalytics = () =>
  api.get("/admin/analytics/geography");
export const getDeviceAnalytics = () =>
  api.get("/admin/analytics/device");
export const getRetentionAnalytics = () =>
  api.get("/admin/analytics/retention");
export const getModerationSLA = () =>
  api.get("/admin/moderation/sla");

// ─── Reports ────────────────────────────────────────────────────────
export const getReports = (params?: Record<string, string>) =>
  api.get("/reports", { params });
export const getReport = (reportId: string) =>
  api.get(`/reports/${reportId}`);
export const updateReportStatus = (reportId: string, status: string, reason?: string) =>
  api.patch(`/reports/${reportId}/status`, { status, reason });
export const moderateReport = (reportId: string, action: string, params?: Record<string, unknown>) =>
  api.post(`/reports/${reportId}/moderate`, { action, ...params });
export const assignReport = (reportId: string, assignedTo: string) =>
  api.patch(`/reports/${reportId}/assign`, { assignedTo });
export const addCaseNote = (reportId: string, content: string) =>
  api.post(`/reports/${reportId}/notes`, { content });
export const bulkAction = (reportIds: string[], action: string) =>
  api.post("/reports/bulk", { reportIds, action });
export const getReportStats = () => api.get("/reports/stats");

// ─── Admin ──────────────────────────────────────────────────────────
export const getUsersList = (params?: Record<string, string>) =>
  api.get("/admin/users", { params });
export const updateUserRole = (userId: string, role: string) =>
  api.patch(`/admin/users/${userId}/role`, { role });
export const listAuditLogs = (params?: Record<string, string>) =>
  api.get("/admin/audit-logs", { params });
