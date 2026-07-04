"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, UserCheck, Mail } from "lucide-react";
import { getUsersList, updateUserRole } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, RoleBadge } from "@/components/ui/Badge";

const ROLES = ["user", "moderator", "analyst", "admin", "super_admin"];

interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: string;
  banned_at: string | null;
  created_at: string;
  createdAt: string;
  posts_count?: number;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;

      const res = await getUsersList(params);
      const data = res.data.data || res.data;
      const list = data.users || data.results || data || [];
      setUsers(Array.isArray(list) ? list : []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdatingUserId(userId);
    setError("");
    try {
      await updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => ((u.id || u._id) === userId ? { ...u, role } : u))
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Failed to update role";
      setError(msg);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        subtitle="Manage users and roles"
        actions={
          <Button variant="outline" size="md" onClick={fetchUsers}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-card/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </Card>

      {error && (
        <div className="px-4 py-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/25">
          {error}
        </div>
      )}

      {/* Users Table */}
      <Card glass={false} className="bg-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin-slow" />
                      Loading users…
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <UserCheck size={32} className="opacity-20" />
                      <p className="text-sm">No users found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userId = user.id || user._id;
                  return (
                    <tr key={userId} className="transition-colors hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid place-items-center h-8 w-8 rounded-full bg-brand-gradient text-white text-[11px] font-semibold shrink-0">
                            {initials(user.name || "U")}
                          </span>
                          <span className="font-medium truncate max-w-[140px]">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 truncate max-w-[200px]">
                          <Mail size={12} className="opacity-50 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3">
                        {user.banned_at ? (
                          <Badge variant="danger">Banned</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(user.created_at || user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(userId, e.target.value)}
                          disabled={updatingUserId === userId}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg border border-input bg-card/60 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 cursor-pointer capitalize appearance-none"
                          )}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
