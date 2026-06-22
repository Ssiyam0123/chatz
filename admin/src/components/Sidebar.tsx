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
  MessageSquare,
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
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">
            <span className="text-sidebar-accent">ChatZ</span> Admin
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft
            size={18}
            className={cn(
              "text-sidebar-muted transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent/10 text-sidebar-accent"
                  : "text-sidebar-muted hover:bg-muted hover:text-sidebar-foreground"
              )}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-muted capitalize">{user.role}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
