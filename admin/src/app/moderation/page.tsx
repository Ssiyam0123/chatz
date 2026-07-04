"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  BarChart3,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getModerationSLA, getReportStats } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  chartColors,
  chartAxisProps,
  chartGridProps,
  chartTooltipStyle,
} from "@/components/ui/charts";

export default function ModerationPage() {
  const [slaData, setSlaData] = useState<
    { status: string; avg_hours: number; count: number }[]
  >([]);
  const [reportStats, setReportStats] = useState({
    total: 0,
    open: 0,
    in_review: 0,
    dismissed: 0,
    action_taken: 0,
    escalated: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [slaRes, statsRes] = await Promise.allSettled([
          getModerationSLA(),
          getReportStats(),
        ]);

        if (slaRes.status === "fulfilled") {
          const d = slaRes.value.data.data || slaRes.value.data;
          setSlaData(Array.isArray(d) ? d : d.sla || []);
        }

        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data.data || statsRes.value.data;
          setReportStats({
            total: d.total || 0,
            open: d.open || 0,
            in_review: d.in_review || 0,
            dismissed: d.dismissed || 0,
            action_taken: d.action_taken || 0,
            escalated: d.escalated || 0,
            closed: d.closed || 0,
          });
        }
      } catch (err) {
        console.error("Moderation fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Moderation" subtitle="Performance & SLA metrics" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-28 rounded-xl border border-border" />
          ))}
        </div>
        <div className="shimmer h-72 rounded-xl border border-border" />
      </div>
    );
  }

  const statusCards = [
    { label: "Open", value: reportStats.open, accent: "warning", icon: Clock },
    { label: "In Review", value: reportStats.in_review, accent: "info", icon: FileText },
    { label: "Escalated", value: reportStats.escalated, accent: "danger", icon: AlertTriangle },
    { label: "Closed", value: reportStats.closed, accent: "primary", icon: ShieldCheck },
    { label: "Total Reports", value: reportStats.total, accent: "neutral", icon: BarChart3 },
  ] as const;

  const accentText: Record<string, string> = {
    warning: "text-warning",
    info: "text-info",
    danger: "text-destructive",
    primary: "text-primary",
    neutral: "text-foreground",
  };
  const accentBg: Record<string, string> = {
    warning: "bg-warning/12",
    info: "bg-info/12",
    danger: "bg-destructive/12",
    primary: "bg-primary/12",
    neutral: "bg-accent",
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Moderation" subtitle="Moderation performance and SLA metrics" />

      {/* Status Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className={`grid place-items-center h-9 w-9 rounded-lg ${accentBg[card.accent]} ${accentText[card.accent]}`}>
                  <Icon size={16} />
                </span>
              </div>
              <p className={`text-2xl font-bold mt-3 ${accentText[card.accent]}`}>
                {formatNumber(card.value)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            </Card>
          );
        })}
      </div>

      {/* SLA Chart */}
      <Card>
        <CardHeader>
          <Clock size={16} className="text-primary" />
          <CardTitle>Avg Resolution Time by Status (hours)</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={slaData.length > 0 ? slaData : [{ status: "No data", avg_hours: 0, count: 0 }]}
              >
                <defs>
                  <linearGradient id="barSla" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={chartColors.primaryStrong} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="status" {...chartAxisProps} />
                <YAxis {...chartAxisProps} width={35} />
                <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.15 }} contentStyle={chartTooltipStyle} />
                <Bar dataKey="avg_hours" fill="url(#barSla)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/reports?status=open"
          className="group flex items-center gap-4 p-5 glass rounded-xl border border-border shadow-soft lift"
        >
          <span className="grid place-items-center h-11 w-11 rounded-xl bg-warning/12 text-warning shrink-0 group-hover:scale-110 transition-transform">
            <AlertTriangle size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Open Reports Queue</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatNumber(reportStats.open)} reports awaiting review</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </Link>
        <Link
          href="/reports?status=escalated"
          className="group flex items-center gap-4 p-5 glass rounded-xl border border-border shadow-soft lift"
        >
          <span className="grid place-items-center h-11 w-11 rounded-xl bg-destructive/12 text-destructive shrink-0 group-hover:scale-110 transition-transform">
            <ShieldCheck size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Escalated Queue</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatNumber(reportStats.escalated)} escalated reports</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}
