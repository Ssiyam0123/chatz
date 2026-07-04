"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  BarChart3,
  Flag,
  ShieldCheck,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["admin", "super_admin", "moderator", "analyst"] },
  { href: "/dashboard/growth", label: "Growth", icon: BarChart3, roles: ["admin", "super_admin", "analyst"] },
  { href: "/reports", label: "Reports", icon: Flag, roles: ["admin", "super_admin", "moderator"] },
  { href: "/moderation", label: "Moderation", icon: ShieldCheck, roles: ["admin", "super_admin", "moderator"] },
  { href: "/users", label: "Users", icon: Users, roles: ["admin", "super_admin"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "super_admin"] },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  const visibleItems = navItems.filter((item) =>
    item.roles.some((r) => hasRole(r))
  );

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen glass border-r border-sidebar-border transition-[width] duration-300 ease-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-4 border-b border-sidebar-border shrink-0">
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-brand-gradient shrink-0 shadow-glow">
          <span className="text-white font-bold text-sm">C</span>
        </span>
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-sidebar-foreground">
            <span className="text-gradient">ChatZ</span> Admin
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "ml-auto grid place-items-center h-7 w-7 rounded-lg text-sidebar-muted hover:text-sidebar-foreground hover:bg-accent transition-colors",
            collapsed && "absolute right-2 top-5"
          )}
          aria-label="Toggle sidebar"
        >
          <ChevronLeft size={16} className={cn("transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "text-primary"
                  : "text-sidebar-muted hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-lg bg-primary/12 ring-1 ring-primary/25" />
              )}
              <Icon
                size={19}
                className={cn("relative shrink-0 transition-colors", isActive && "drop-shadow-[0_0_6px_var(--color-primary)]")}
              />
              {!collapsed && <span className="relative">{item.label}</span>}
              {isActive && !collapsed && (
                <span className="relative ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User card + logout */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-2 hover:bg-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          {user && (
            <span className="grid place-items-center h-8 w-8 rounded-full bg-brand-gradient text-white text-xs font-semibold shrink-0">
              {initials(user.name || "A")}
            </span>
          )}
          {!collapsed && user && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-sidebar-muted capitalize leading-tight">{(user.role || "").replace(/_/g, " ")}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              title="Logout"
              className="grid place-items-center h-8 w-8 rounded-lg text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            onClick={logout}
            title="Logout"
            className="mt-2 w-full grid place-items-center h-8 rounded-lg text-sidebar-muted hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={17} />
          </button>
        )}
      </div>
    </aside>
  );
}
