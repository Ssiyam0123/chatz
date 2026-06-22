"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Flag,
  Trash2,
  Undo2,
  AlertTriangle,
  Ban,
  UserX,
  MessageSquare,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  History,
  MoreHorizontal,
} from "lucide-react";
import {
  getReport,
  updateReportStatus,
  moderateReport,
  assignReport,
  addCaseNote,
} from "@/lib/api";
import { formatDateTime, timeAgo, cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_review: "bg-blue-100 text-blue-700",
  dismissed: "bg-gray-100 text-gray-600",
  action_taken: "bg-green-100 text-green-700",
  escalated: "bg-red-100 text-red-700",
  closed: "bg-purple-100 text-purple-700",
};

interface AuditEntry {
  id: string;
  action: string;
  admin_name: string;
  reason: string;
  created_at: string;
}

interface CaseNote {
  id: string;
  content: string;
  admin_name: string;
  created_at: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await getReport(params.id as string);
        setReport(res.data.data || res.data);
      } catch (err) {
        console.error("Failed to fetch report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [params.id]);

  const handleStatusChange = async (status: string) => {
    setActionLoading(status);
    try {
      const res = await updateReportStatus(params.id as string, status);
      setReport((prev) => ({ ...prev, ...(res.data.data || res.data) }));
    } catch (err) {
      console.error("Status update failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleModerate = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(action);
    try {
      const res = await moderateReport(params.id as string, action, extra);
      setReport((prev) => ({ ...prev, ...(res.data.data || res.data) }));
    } catch (err) {
      console.error("Moderation action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setNoteLoading(true);
    try {
      const res = await addCaseNote(params.id as string, noteInput.trim());
      const updatedReport = res.data.data || res.data;
      setReport((prev) => ({ ...prev, ...updatedReport }));
      setNoteInput("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
        <Flag size={32} className="opacity-30" />
        <p>Report not found</p>
      </div>
    );
  }

  const auditLog = (report.auditLog as AuditEntry[]) || [];
  const caseNotes = (report.notes as CaseNote[]) || [];
  const target = report.target as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to reports
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Report Details</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Created {timeAgo(report.createdAt as string)}
                </p>
              </div>
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  STATUS_COLORS[report.status as string] || "bg-gray-100"
                )}
              >
                {(report.status as string)?.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Target Type</p>
                <p className="font-medium capitalize">{report.targetType as string}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target ID</p>
                <p className="font-medium font-mono text-xs truncate">{report.targetId as string}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Priority</p>
                <p className="font-medium capitalize">{report.priority as string}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned To</p>
                <p className="font-medium">{(report.assignedTo as string) || "Unassigned"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Reason</p>
                <p className="font-medium">{report.reason as string}</p>
              </div>
              {(report.details as string) && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Details</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{report.details as string}</p>
                </div>
              )}
            </div>
          </div>

          {/* Target Content Preview */}
          {target && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
              <h3 className="font-semibold mb-3">Target Content</h3>
              <div className="text-sm space-y-2">
                {target.content != null ? <p>{String(target.content)}</p> : null}
                {target.text != null ? <p>{String(target.text)}</p> : null}
                {target.name != null ? <p className="font-medium">{String(target.name)}</p> : null}
                {target.email != null ? <p className="text-muted-foreground">{String(target.email)}</p> : null}
              </div>
            </div>
          )}

          {/* Case Notes */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">Case Notes</h3>

            {caseNotes.length > 0 && (
              <div className="space-y-3 mb-4">
                {caseNotes.map((note: CaseNote, i: number) => (
                  <div key={note.id || i} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{note.admin_name || "Admin"}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(note.created_at as string)}</span>
                    </div>
                    <p className="text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a case note..."
                className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={!noteInput.trim() || noteLoading}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50 flex items-center gap-1"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>

          {/* Audit Log */}
          {auditLog.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-muted-foreground" />
                <h3 className="font-semibold">Audit Trail</h3>
              </div>
              <div className="space-y-2">
                {auditLog.map((entry: AuditEntry, i: number) => (
                  <div key={entry.id || i} className="flex items-start gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium capitalize">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}by {entry.admin_name || "System"}
                      </span>
                      {entry.reason && (
                        <p className="text-muted-foreground text-xs mt-0.5">{entry.reason}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {timeAgo(entry.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Actions Panel */}
        <div className="space-y-4">
          {/* Status Transitions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Status</h3>
            <div className="space-y-2">
              {["in_review", "dismissed", "escalated", "closed"].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={actionLoading === status || report.status === status}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                    report.status === status
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border hover:bg-muted"
                  )}
                >
                  Mark as {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Moderation Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleModerate("delete_content")}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete Content
              </button>
              <button
                onClick={() => handleModerate("restore_content")}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted disabled:opacity-50"
              >
                <Undo2 size={14} /> Restore Content
              </button>
              <button
                onClick={() => handleModerate("warn_user")}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
              >
                <AlertTriangle size={14} /> Warn User
              </button>
              <button
                onClick={() => handleModerate("suspend_user", { suspendDays: 3 })}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
              >
                <UserX size={14} /> Suspend (3d)
              </button>
              <button
                onClick={() => handleModerate("ban_user")}
                disabled={!!actionLoading}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                <Ban size={14} /> Ban User
              </button>
            </div>
          </div>

          {/* Assign */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5">
            <h3 className="font-semibold mb-3">Assignment</h3>
            <input
              type="text"
              placeholder="Assign to admin ID..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={async (e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  try {
                    const res = await assignReport(params.id as string, (e.target as HTMLInputElement).value.trim());
                    setReport((prev) => ({ ...prev, ...(res.data.data || res.data) }));
                    (e.target as HTMLInputElement).value = "";
                  } catch (err) {
                    console.error("Assignment failed:", err);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">Enter admin ID and press Enter</p>
          </div>
        </div>
      </div>
    </div>
  );
}
