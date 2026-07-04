"use client";

import { formatShortDate } from "@/lib/utils";

/** Reads a CSS variable value from the live document, with a fallback. */
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Chart palette that adapts to the active theme (light/dark). */
export const chartColors = {
  get primary() {
    return cssVar("--color-primary", "#b98298");
  },
  get primaryStrong() {
    return cssVar("--color-primary-strong", "#9b5e7a");
  },
  get accent2() {
    return cssVar("--color-accent-2", "#e8cdd8");
  },
  get success() {
    return cssVar("--color-success", "#22c55e");
  },
  get warning() {
    return cssVar("--color-warning", "#f59e0b");
  },
  get info() {
    return cssVar("--color-info", "#3b82f6");
  },
  get danger() {
    return cssVar("--color-destructive", "#e5484d");
  },
  get grid() {
    return cssVar("--color-border", "#e7e3ec");
  },
  get tick() {
    return cssVar("--color-muted-foreground", "#6b6470");
  },
  get tooltipBg() {
    return cssVar("--color-popover", "#ffffff");
  },
  get tooltipBorder() {
    return cssVar("--color-border", "#e7e3ec");
  },
  get tooltipText() {
    return cssVar("--color-popover-foreground", "#1c1820");
  },
};

/** Ordered palette for category/pie charts. */
export const categoryPalette = () => [
  chartColors.primary,
  chartColors.info,
  chartColors.success,
  chartColors.warning,
  chartColors.accent2,
  chartColors.danger,
];

/** Shared Recharts axis + grid props that read theme tokens. */
export const chartAxisProps = {
  stroke: chartColors.tick,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tick: { fill: chartColors.tick },
};

/** Format chart date axis ticks from ISO → "Jun 8" */
export const formatChartDate = (value: string) => {
  if (!value || value === "No data") return value;
  return formatShortDate(value);
};

export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: chartColors.grid,
  vertical: false,
  strokeOpacity: 0.5,
};

export const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: chartColors.tooltipBg,
  border: `1px solid ${chartColors.tooltipBorder}`,
  borderRadius: "0.625rem",
  color: chartColors.tooltipText,
  fontSize: "12px",
  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.25)",
  padding: "8px 12px",
};
