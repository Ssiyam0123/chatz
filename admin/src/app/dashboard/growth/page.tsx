"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getUserStats, getRetentionAnalytics, getAnalytics } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  chartColors,
  chartAxisProps,
  chartGridProps,
  chartTooltipStyle,
  formatChartDate,
} from "@/components/ui/charts";

export default function GrowthPage() {
  const [signups, setSignups] = useState<{ date: string; count: number }[]>([]);
  const [dauWauMau, setDauWauMau] = useState<{ date: string; dau: number; wau: number; mau: number }[]>([]);
  const [retention, setRetention] = useState<{ cohort: string; week1: number; week2: number; week4: number }[]>([]);
  const [eventCounts, setEventCounts] = useState<{ event: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userStatsRes, retentionRes, analyticsRes] = await Promise.allSettled([
          getUserStats("90d"),
          getRetentionAnalytics(),
          getAnalytics({ groupBy: "event_type", range: "30d" }),
        ]);

        if (userStatsRes.status === "fulfilled") {
          const d = userStatsRes.value.data.data || userStatsRes.value.data;
          setSignups(d.dailySignups || d.growth || []);
          setDauWauMau(d.dau || []);
        }

        if (retentionRes.status === "fulfilled") {
          const d = retentionRes.value.data.data || retentionRes.value.data;
          setRetention(d.cohorts || d.retention || []);
        }

        if (analyticsRes.status === "fulfilled") {
          const d = analyticsRes.value.data.data || analyticsRes.value.data;
          setEventCounts(d.events || d.breakdown || []);
        }
      } catch (err) {
        console.error("Growth fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Growth" subtitle="User growth, retention & engagement analytics" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-72 rounded-xl border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Growth" subtitle="User growth, retention, and engagement analytics" />

      {/* Signups Over Time */}
      <Card>
        <CardHeader>
          <Users size={16} className="text-primary" />
          <CardTitle>Daily Signups</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signups.length > 0 ? signups : [{ date: "No data", count: 0 }]}>
                <defs>
                  <linearGradient id="barSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={chartColors.primaryStrong} stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" {...chartAxisProps} tickFormatter={formatChartDate} />
                <YAxis {...chartAxisProps} width={35} />
                <Tooltip
                  cursor={{ fill: chartColors.grid, opacity: 0.15 }}
                  contentStyle={chartTooltipStyle}
                  labelFormatter={formatChartDate}
                />
                <Bar dataKey="count" fill="url(#barSignups)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* DAU/WAU/MAU */}
      <Card>
        <CardHeader>
          <TrendingUp size={16} className="text-primary" />
          <CardTitle>DAU / WAU / MAU</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dauWauMau.length > 0 ? dauWauMau : [{ date: "No data", dau: 0, wau: 0, mau: 0 }]}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="date" {...chartAxisProps} tickFormatter={formatChartDate} />
                <YAxis {...chartAxisProps} width={35} />
                <Tooltip contentStyle={chartTooltipStyle} labelFormatter={formatChartDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="dau" stroke={chartColors.primary} strokeWidth={2} dot={false} name="DAU" />
                <Line type="monotone" dataKey="wau" stroke={chartColors.info} strokeWidth={2} dot={false} name="WAU" />
                <Line type="monotone" dataKey="mau" stroke={chartColors.success} strokeWidth={2} dot={false} name="MAU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Retention Cohorts */}
      <Card>
        <CardHeader>
          <Calendar size={16} className="text-primary" />
          <CardTitle>Retention Cohorts</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={retention.length > 0 ? retention : [{ cohort: "No data", week1: 0, week2: 0, week4: 0 }]}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="cohort" {...chartAxisProps} tickFormatter={formatChartDate} />
                <YAxis {...chartAxisProps} width={35} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={chartTooltipStyle} labelFormatter={formatChartDate} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="week1" stroke={chartColors.primary} strokeWidth={2} dot={false} name="Week 1" />
                <Line type="monotone" dataKey="week2" stroke={chartColors.info} strokeWidth={2} dot={false} name="Week 2" />
                <Line type="monotone" dataKey="week4" stroke={chartColors.success} strokeWidth={2} dot={false} name="Week 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>

      {/* Event Breakdown */}
      <Card>
        <CardHeader>
          <BarChart3 size={16} className="text-primary" />
          <CardTitle>Events Breakdown (30d)</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={eventCounts.length > 0 ? eventCounts : [{ event: "No data", count: 0 }]}
                layout="vertical"
              >
                <defs>
                  <linearGradient id="barEvents" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColors.primaryStrong} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartGridProps} horizontal={false} vertical />
                <XAxis type="number" {...chartAxisProps} />
                <YAxis type="category" dataKey="event" {...chartAxisProps} width={100} />
                <Tooltip cursor={{ fill: chartColors.grid, opacity: 0.15 }} contentStyle={chartTooltipStyle} />
                <Bar dataKey="count" fill="url(#barEvents)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
