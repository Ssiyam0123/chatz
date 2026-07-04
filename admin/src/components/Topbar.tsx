"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "@/lib/auth";

const titleMap: Record<string, { title: string; subtitle: string }> = {
  "/dashboard/growth": { title: "Growth", subtitle: "User growth, retention & engagement" },
  "/dashboard": { title: "Overview", subtitle: "Real-time analytics & moderation" },
  "/reports": { title: "Reports", subtitle: "Review and manage user reports" },
  "/moderation": { title: "Moderation", subtitle: "Performance & SLA metrics" },
  "/users": { title: "Users", subtitle: "Manage users and roles" },
  "/settings": { title: "Settings", subtitle: "Panel configuration" },
};

function resolveTitle(pathname: string) {
  if (pathname.startsWith("/reports/")) {
    return { title: "Report", subtitle: "Case details & actions" };
  }
  for (const key of Object.keys(titleMap)) {
    if (pathname === key || pathname.startsWith(key + "/")) {
      return titleMap[key];
    }
  }
  return { title: "Admin", subtitle: "" };
}

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { title, subtitle } = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-20 glass border-b border-border">
      <div className="flex items-center gap-4 h-14 px-4 md:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight truncate">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground leading-tight truncate">{subtitle}</p>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search affordance */}
        <div className="hidden md:flex items-center gap-2 h-8 w-52 lg:w-64 rounded-lg border border-border bg-card/50 px-3 text-muted-foreground">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search…"
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded border border-border bg-muted font-mono">⌘K</kbd>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          <button
            type="button"
            aria-label="Notifications"
            className="relative grid place-items-center h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Bell size={15} />
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
          </button>

          <span className="grid place-items-center h-8 w-8 rounded-full bg-brand-gradient text-white text-xs font-semibold ml-1">
            {(user?.name || "A").charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
