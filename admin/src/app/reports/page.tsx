"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ChevronDown,
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { getReports, bulkAction } from "@/lib/api";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";

const TARGET_TYPES = [
  { value: "", label: "All Types" },
  { value: "post", label: "Posts" },
  { value: "comment", label: "Comments" },
  { value: "story", label: "Stories" },
  { value: "message", label: "Messages" },
  { value: "group", label: "Groups" },
  { value: "user", label: "Users" },
  { value: "media", label: "Media" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "dismissed", label: "Dismissed" },
  { value: "action_taken", label: "Action Taken" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700 border-yellow-200",
  in_review: "bg-blue-100 text-blue-700 border-blue-200",
  dismissed: "bg-gray-100 text-gray-600 border-gray-200",
  action_taken: "bg-green-100 text-green-700 border-green-200",
  escalated: "bg-red-100 text-red-700 border-red-200",
  closed: "bg-purple-100 text-purple-700 border-purple-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

interface Report {
  id: string;
  _id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: string;
  priority: string;
  reporterId: string;
  assignedTo: string | null;
  createdAt: string;
  reporter?: { name: string };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: "20",
      };
      if (statusFilter) params.status = statusFilter;
      if (targetFilter) params.targetType = targetFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;

      const res = await getReports(params);
      const data = res.data.data || res.data;
      const list = data.reports || data.results || data || [];
      setReports(Array.isArray(list) ? list : []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, targetFilter, priorityFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkAction(selectedIds, action);
      setSelectedIds([]);
      fetchReports();
    } catch (err) {
      console.error("Bulk action failed:", err);
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((r) => r.id || r._id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review and manage user reports
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={targetFilter}
            onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-border mx-2" />
          <button
            onClick={() => handleBulkAction("dismiss")}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            Dismiss All
          </button>
          <button
            onClick={() => handleBulkAction("escalate")}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-md bg-orange-100 text-orange-700 text-sm hover:bg-orange-200 disabled:opacity-50"
          >
            Escalate All
          </button>
          <button
            onClick={() => handleBulkAction("close")}
            disabled={bulkLoading}
            className="px-3 py-1.5 rounded-md bg-purple-100 text-purple-700 text-sm hover:bg-purple-200 disabled:opacity-50"
          >
            Close All
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        </div>
      )}

      {/* Reports Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === reports.length && reports.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      Loading reports...
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Flag size={32} className="opacity-30" />
                      <p>No reports found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const id = report.id || report._id;
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "border-b border-border hover:bg-muted/30 transition-colors",
                        selectedIds.includes(id) && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelect(id)}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                          {report.targetType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate font-medium">
                        {report.reason}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {report.reporter?.name || "Anonymous"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs font-medium border",
                            STATUS_COLORS[report.status] || "bg-gray-100 text-gray-700"
                          )}
                        >
                          {report.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                            PRIORITY_COLORS[report.priority] || "bg-gray-100 text-gray-600"
                          )}
                        >
                          {report.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {timeAgo(report.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports/${id}`}
                          className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                        >
                          Review <ChevronDown size={14} className="rotate-[-90deg]" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
