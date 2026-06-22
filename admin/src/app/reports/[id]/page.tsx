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
  Send,
  History,
} from "lucide-react";
import {
  getReport,
  updateReportStatus,
  moderateReport,
  assignReport,
  addCaseNote,
} from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";

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
        const data = res.data.data || res.data;
        if (data && data.report) {
          setReport({
            ...data.report,
            notes: data.notes || [],
            auditLog: data.actions || [],
            target: data.target || null,
          });
        } else {
          setReport(data);
        }
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
      const newNote = res.data.data || res.data;
      const formattedNote = {
        id: newNote.id,
        content: newNote.content,
        admin_name: newNote.admin?.name || "Admin",
        created_at: newNote.created_at || newNote.createdAt || new Date().toISOString(),
      };
      setReport((prev) => {
        if (!prev) return null;
        const currentNotes = (prev.notes as CaseNote[]) || [];
        return {
          ...prev,
          notes: [...currentNotes, formattedNote]
        };
      });
      setNoteInput("");
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-8 w-40 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="shimmer h-64 rounded-xl" />
            <div className="shimmer h-64 rounded-xl" />
          </div>
          <div className="shimmer h-64 rounded-xl" />
        </div>
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
  const status = report.status as string;

  const inputClass =
    "flex-1 px-3 py-2 rounded-lg border border-input bg-card/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all";

  const actionBtnClass = (extra: string) =>
    cn(
      "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] disabled:opacity-50",
      extra
    );

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} /> Back to reports
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold">Report Details</h2>
                <p className="text-sm text-muted-foreground mt-1">Created {timeAgo(report.createdAt as string)}</p>
              </div>
              <StatusBadge status={status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Target Type</p>
                <p className="font-medium capitalize mt-0.5">{report.targetType as string}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Target ID</p>
                <p className="font-medium font-mono text-xs truncate mt-0.5">{report.targetId as string}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Priority</p>
                <div className="mt-0.5"><PriorityBadge priority={report.priority as string} /></div>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Assigned To</p>
                <p className="font-medium mt-0.5">{(report.assignedTo as string) || "Unassigned"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Reason</p>
                <p className="font-medium mt-0.5">{report.reason as string}</p>
              </div>
              {(report.details as string) && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Details</p>
                  <p className="text-sm mt-1 whitespace-pre-wrap rounded-lg bg-muted/50 p-3">{report.details as string}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Target Content Preview */}
          {target && (
            <Card className="p-6">
              <h3 className="font-semibold mb-3">Target Content</h3>
              <div className="text-sm space-y-2 rounded-lg bg-muted/50 p-4">
                {target.content != null ? <p>{String(target.content)}</p> : null}
                {target.text != null ? <p>{String(target.text)}</p> : null}
                {target.name != null ? <p className="font-medium">{String(target.name)}</p> : null}
                {target.email != null ? <p className="text-muted-foreground">{String(target.email)}</p> : null}
              </div>
            </Card>
          )}

          {/* Case Notes */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Case Notes</h3>

            {caseNotes.length > 0 && (
              <div className="space-y-3 mb-4">
                {caseNotes.map((note: CaseNote, i: number) => (
                  <div key={note.id || i} className="p-3 rounded-lg bg-muted/50 border border-border">
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
                placeholder="Add a case note…"
                className={inputClass}
                onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
              />
              <Button onClick={handleAddNote} disabled={!noteInput.trim() || noteLoading}>
                <Send size={14} /> Send
              </Button>
            </div>
          </Card>

          {/* Audit Log */}
          {auditLog.length > 0 && (
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <History size={16} className="text-muted-foreground" />
                <CardTitle className="text-base">Audit Trail</CardTitle>
              </CardHeader>
              <div className="relative space-y-4 pl-2">
                {auditLog.map((entry: AuditEntry, i: number) => (
                  <div key={entry.id || i} className="relative flex items-start gap-3 text-sm pl-4">
                    <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                    <div className="flex-1">
                      <span className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground"> by {entry.admin_name || "System"}</span>
                      {entry.reason && <p className="text-muted-foreground text-xs mt-0.5">{entry.reason}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(entry.created_at)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar - Actions Panel */}
        <div className="space-y-4">
          {/* Status Transitions */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Status</h3>
            <div className="space-y-2">
              {["in_review", "dismissed", "escalated", "closed"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={actionLoading === s || status === s}
                  className={cn(
                    "w-full px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] disabled:opacity-50 capitalize",
                    status === s
                      ? "bg-primary/12 border-primary/30 text-primary"
                      : "border-border hover:bg-accent"
                  )}
                >
                  Mark as {s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </Card>

          {/* Moderation Actions */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleModerate("delete_content")}
                disabled={!!actionLoading}
                className={actionBtnClass("border-destructive/25 text-destructive hover:bg-destructive/10")}
              >
                <Trash2 size={14} /> Delete Content
              </button>
              <button
                onClick={() => handleModerate("restore_content")}
                disabled={!!actionLoading}
                className={actionBtnClass("border-border hover:bg-accent")}
              >
                <Undo2 size={14} /> Restore Content
              </button>
              <button
                onClick={() => handleModerate("warn_user")}
                disabled={!!actionLoading}
                className={actionBtnClass("border-warning/30 text-warning hover:bg-warning/10")}
              >
                <AlertTriangle size={14} /> Warn User
              </button>
              <button
                onClick={() => handleModerate("suspend_user", { suspendDays: 3 })}
                disabled={!!actionLoading}
                className={actionBtnClass("border-warning/40 text-warning hover:bg-warning/10")}
              >
                <UserX size={14} /> Suspend (3d)
              </button>
              <button
                onClick={() => handleModerate("ban_user")}
                disabled={!!actionLoading}
                className={actionBtnClass("border-destructive/25 text-destructive hover:bg-destructive/10")}
              >
                <Ban size={14} /> Ban User
              </button>
            </div>
          </Card>

          {/* Assign */}
          <Card className="p-5">
            <h3 className="font-semibold mb-3">Assignment</h3>
            <input
              type="text"
              placeholder="Assign to admin ID…"
              className={inputClass}
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
            <p className="text-xs text-muted-foreground mt-1.5">Enter admin ID and press Enter</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
