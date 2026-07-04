"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Flag,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { getReports, bulkAction } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge, PriorityBadge } from "@/components/ui/Badge";

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

const selectClass =
  "px-3 py-2 rounded-lg border border-input bg-card/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer appearance-none";

const inputClass =
  "w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all";

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
    <div className="space-y-5">
      <PageHeader
        title="Reports Queue"
        subtitle="Review and manage user reports"
        actions={
          <Button variant="outline" size="md" onClick={fetchReports}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className={inputClass}
            />
          </div>

          <select value={targetFilter} onChange={(e) => { setTargetFilter(e.target.value); setPage(1); }} className={selectClass}>
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={selectClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className={selectClass}>
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 glass rounded-xl border border-primary/25 shadow-soft">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="secondary" size="sm" onClick={() => handleBulkAction("dismiss")} disabled={bulkLoading}>
            Dismiss All
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleBulkAction("escalate")} disabled={bulkLoading}>
            Escalate All
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleBulkAction("close")} disabled={bulkLoading}>
            Close All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Reports Table */}
      <Card glass={false} className="bg-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header">
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === reports.length && reports.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border accent-[var(--color-primary)]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reporter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin-slow" />
                      Loading reports…
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Flag size={32} className="opacity-20" />
                      <p className="text-sm">No reports found</p>
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
                        "transition-colors hover:bg-accent/40",
                        selectedIds.includes(id) && "bg-primary/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelect(id)}
                          className="rounded border-border accent-[var(--color-primary)]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" className="capitalize">{report.targetType}</Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate font-medium">{report.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{report.reporter?.name || "Anonymous"}</td>
                      <td className="px-4 py-3"><StatusBadge status={report.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={report.priority} /></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{timeAgo(report.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/reports/${id}`}
                          className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:gap-1.5 transition-all"
                        >
                          Review <ChevronRight size={13} />
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
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
