import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground border-border",
        // Brand
        primary: "bg-primary/10 text-primary border-primary/20",
        // Status palette
        success: "bg-success/12 text-success border-success/25",
        warning: "bg-warning/15 text-warning border-warning/25",
        info: "bg-info/12 text-info border-info/25",
        danger: "bg-destructive/12 text-destructive border-destructive/25",
        accent: "bg-accent-2/30 text-primary-strong border-accent-2/40",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ── Status / priority / role helpers (replace the old hardcoded maps) ── */

export function StatusBadge({ status }: { status: string }) {
  const safeStatus = status || "";
  const variant: BadgeProps["variant"] = (() => {
    switch (safeStatus) {
      case "open":
        return "warning";
      case "in_review":
        return "info";
      case "dismissed":
        return "neutral";
      case "action_taken":
        return "success";
      case "escalated":
        return "danger";
      case "closed":
        return "accent";
      default:
        return "neutral";
    }
  })();
  return <Badge variant={variant}>{safeStatus.replace(/_/g, " ")}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const variant: BadgeProps["variant"] = (() => {
    switch (priority) {
      case "critical":
        return "danger";
      case "high":
        return "warning";
      case "normal":
        return "info";
      case "low":
        return "neutral";
      default:
        return "neutral";
    }
  })();
  return <Badge variant={variant}>{priority || ""}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const variant: BadgeProps["variant"] = (() => {
    switch (role) {
      case "super_admin":
        return "accent";
      case "admin":
        return "info";
      case "moderator":
        return "primary";
      case "analyst":
        return "success";
      default:
        return "neutral";
    }
  })();
  return <Badge variant={variant}>{(role || "").replace(/_/g, " ")}</Badge>;
}

export default Badge;
