"use client";

import React from "react";
import { Shield, Info } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Admin panel configuration and role management
        </p>
      </div>

      {/* Role Info */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-primary" />
          <h2 className="font-semibold">Admin Roles</h2>
        </div>

        <div className="space-y-4">
          {[
            {
              role: "Super Admin",
              desc: "Full access to all features including managing admin roles and settings.",
              color: "bg-purple-100 text-purple-700",
            },
            {
              role: "Admin",
              desc: "Can manage users, assign reports, perform bulk actions, and access all dashboards.",
              color: "bg-blue-100 text-blue-700",
            },
            {
              role: "Moderator",
              desc: "Can view and act on reports, moderate content, and add case notes.",
              color: "bg-cyan-100 text-cyan-700",
            },
            {
              role: "Analyst",
              desc: "View-only access to analytics dashboards and reports.",
              color: "bg-green-100 text-green-700",
            },
          ].map((item) => (
            <div key={item.role} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${item.color}`}>
                {item.role}
              </span>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">About ChatZ Admin</h3>
            <p className="text-sm text-muted-foreground">
              The admin panel provides full control over the ChatZ social media platform.
              Use the sidebar to navigate between sections. All administrative actions
              are logged for audit purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
