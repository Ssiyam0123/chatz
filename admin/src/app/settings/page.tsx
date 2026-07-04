"use client";

import React from "react";
import { Shield, Info, Palette, Monitor, Moon, Sun, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const roles = [
  {
    role: "Super Admin",
    key: "super_admin",
    desc: "Full access to all features including managing admin roles and settings.",
    color: "text-primary-strong bg-primary/10 border-primary/20",
  },
  {
    role: "Admin",
    key: "admin",
    desc: "Can manage users, assign reports, perform bulk actions, and access all dashboards.",
    color: "text-info bg-info/10 border-info/20",
  },
  {
    role: "Moderator",
    key: "moderator",
    desc: "Can view and act on reports, moderate content, and add case notes.",
    color: "text-primary bg-primary/10 border-primary/20",
  },
  {
    role: "Analyst",
    key: "analyst",
    desc: "View-only access to analytics dashboards and reports.",
    color: "text-success bg-success/10 border-success/20",
  },
];

const themeOptions: { value: Theme; label: string; icon: React.ElementType; desc: string }[] = [
  { value: "light", label: "Light", icon: Sun, desc: "Classic light interface" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
  { value: "system", label: "System", icon: Monitor, desc: "Match your OS" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Admin panel configuration and role management" />

      {/* Appearance */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <Palette size={16} className="text-primary" />
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Choose how the admin panel looks. Your preference is saved on this device.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={cn(
                  "relative flex flex-col items-center gap-2 p-5 rounded-xl border text-sm font-medium transition-all active:scale-[0.98]",
                  active
                    ? "border-primary/40 bg-primary/8 text-primary shadow-glow"
                    : "border-border hover:bg-accent hover:border-border-strong"
                )}
              >
                {active && (
                  <CheckCircle size={14} className="absolute top-2.5 right-2.5 text-primary" />
                )}
                <Icon size={22} />
                <span>{opt.label}</span>
                <span className="text-[11px] text-muted-foreground font-normal">{opt.desc}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Role Info */}
      <Card className="p-6">
        <CardHeader className="px-0 pt-0">
          <Shield size={16} className="text-primary" />
          <CardTitle>Admin Roles</CardTitle>
        </CardHeader>

        <div className="space-y-3">
          {roles.map((item) => (
            <div key={item.role} className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border">
              <span className={cn("text-[11px] font-bold uppercase tracking-wider rounded-md px-2.5 py-1 shrink-0 border", item.color)}>
                {item.role}
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Info size={16} />
          </span>
          <div>
            <h3 className="font-semibold text-sm mb-1">About ChatZ Admin</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The admin panel provides full control over the ChatZ social media platform.
              Use the sidebar to navigate between sections. All administrative actions
              are logged for audit purposes.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
