"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

/** Smoothly animates a number from 0 → target on mount. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = React.useState(0);
  const frame = React.useRef<number>(0);
  React.useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);
  return value;
}

/** Parse a formatted string like "42.1K" / "8h" → numeric target + suffix to preserve. */
function parseValue(raw: string): { num: number; suffix: string } {
  const match = raw.match(/^([\d.,]+)\s*([a-zA-Z%]*)$/);
  if (!match) return { num: 0, suffix: "" };
  const num = parseFloat(match[1].replace(/,/g, ""));
  return { num: isNaN(num) ? 0 : num, suffix: match[2] };
}

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "info" | "success" | "warning" | "danger";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, { icon: string; glow: string }> = {
  primary: {
    icon: "from-primary/20 to-primary-strong/10 text-primary",
    glow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-primary/20",
  },
  info: {
    icon: "from-info/20 to-info/5 text-info",
    glow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-info/20",
  },
  success: {
    icon: "from-success/20 to-success/5 text-success",
    glow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-success/20",
  },
  warning: {
    icon: "from-warning/20 to-warning/5 text-warning",
    glow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-warning/20",
  },
  danger: {
    icon: "from-destructive/20 to-destructive/5 text-destructive",
    glow: "group-hover:shadow-[0_0_24px_-4px] group-hover:shadow-destructive/20",
  },
};

const accentValue: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function StatCard({ title, value, change, icon, accent = "primary" }: StatCardProps) {
  const { num, suffix } = parseValue(value);
  const animated = useCountUp(num);
  const display =
    num > 0
      ? `${Number.isInteger(num) ? Math.round(animated).toLocaleString() : animated.toFixed(1)}${suffix}`
      : value;

  return (
    <Card interactive className={cn("p-5 group", accentMap[accent].glow)}>
      <div className="flex items-start justify-between">
        {icon && (
          <span
            className={cn(
              "grid place-items-center h-10 w-10 rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110",
              accentMap[accent].icon
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("mt-4 text-2xl font-bold tracking-tight", accentValue[accent])}>{display}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      {change && (
        <p className="text-[11px] text-muted-foreground mt-2 font-medium opacity-70">{change}</p>
      )}
    </Card>
  );
}

export default StatCard;
