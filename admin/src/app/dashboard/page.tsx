"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  MessageSquare,
  Flag,
  TrendingUp,
  Clock,
  AlertTriangle,
  BarChart3,
  Globe,
  Smartphone,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getDashboardStats,
  getUserStats,
  getGeographyAnalytics,
  getDeviceAnalytics,
  getModerationSLA,
  getReportStats,
} from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  chartColors,
  categoryPalette,
  chartAxisProps,
  chartGridProps,
  chartTooltipStyle,
  formatChartDate,
} from "@/components/ui/charts";

const emptyBar = [{ date: "No data", count: 0 }];

export default function DashboardPage() {
  const [stats, setStats] = useState<React.ComponentProps<typeof StatCard>[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [dauData, setDauData] = useState<{ date: string; dau: number; wau: number; mau: number }[]>([]);
  const [geoData, setGeoData] = useState<{ country: string; count: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          userGrowthRes,
          geoRes,
          deviceRes,
          slaRes,
          reportStatsRes,
        ] = await Promise.allSettled([
          getDashboardStats(),
          getUserStats(),
          getGeographyAnalytics(),
          getDeviceAnalytics(),
          getModerationSLA(),
          getReportStats(),
        ]);

        if (statsRes.status === "fulfilled") {
          const d = statsRes.value.data.data || statsRes.value.data;
          setStats([
            {
              title: "Total Users",
              value: formatNumber(d.totalUsers || 0),
              change: `+${formatNumber(d.newUsersToday || 0)} today`,
              icon: <Users size={18} />,
              accent: "primary",
            },
            {
              title: "Active Users (DAU)",
              value: formatNumber(d.dau || 0),
              change: `WAU: ${formatNumber(d.wau || 0)}`,
              icon: <TrendingUp size={18} />,
              accent: "info",
            },
            {
              title: "Messages Today",
              value: formatNumber(d.messagesToday || 0),
              change: `Total: ${formatNumber(d.totalMessages || 0)}`,
              icon: <MessageSquare size={18} />,
              accent: "success",
            },
            {
              title: "Open Reports",
              value: formatNumber(d.openReports || 0),
              change: `${formatNumber(d.reportsToday || 0)} today`,
              icon: <Flag size={18} />,
              accent: "warning",
            },
            {
              title: "Avg Resolution",
              value: `${d.avgResolutionHours || 0}h`,
              change: `${d.resolvedReports || 0} resolved`,
              icon: <Clock size={18} />,
              accent: "info",
            },
            {
              title: "Active Reports",
              value: formatNumber(d.activeReports || 0),
              change: `${d.escalatedReports || 0} escalated`,
              icon: <AlertTriangle size={18} />,
              accent: "danger",
            },
          ]);
        }

        if (userGrowthRes.status === "fulfilled") {
          const d = userGrowthRes.value.data.data || userGrowthRes.value.data;
          setUserGrowth(d.dailySignups || d.growth || []);
          setDauData(d.dau || []);
        }

        if (geoRes.status === "fulfilled") {
          const d = geoRes.value.data.data || geoRes.value.data;
          setGeoData(d.countries || d.geography || []);
        }

        if (deviceRes.status === "fulfilled") {
          const d = deviceRes.value.data.data || deviceRes.value.data;
          setDeviceData(d.devices || d.platforms || []);
        }

        void slaRes; // reserved for future moderation SLA widget

        if (reportStatsRes.status === "fulfilled") {
          void reportStatsRes; // reserved for future use
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" subtitle="Real-time analytics & moderation" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-36 rounded-xl border border-border" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-80 rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  const geoChart = geoData.length > 0 ? geoData : [{ country: "No data", count: 1 }];
  const deviceChart = deviceData.length > 0 ? deviceData : [{ name: "No data", value: 1 }];
  const palette = categoryPalette();

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" subtitle="Real-time analytics & moderation summary" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* User Growth */}
        <Card>
          <CardHeader>
            <BarChart3 size={16} className="text-primary" />
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowth.length > 0 ? userGrowth : emptyBar}>
                  <defs>
                    <linearGradient id="barGrowth" x1="0" y1="0" x2="0" y2="1">
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
                  <Bar dataKey="count" fill="url(#barGrowth)" radius={[4, 4, 0, 0]} />
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
                  data={dauData.length > 0 ? dauData : [{ date: "No data", dau: 0, wau: 0, mau: 0 }]}
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

        {/* Geography */}
        <Card>
          <CardHeader>
            <Globe size={16} className="text-primary" />
            <CardTitle>Geography</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={geoChart}
                    dataKey="count"
                    nameKey="country"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`}
                  >
                    {geoChart.map((_: unknown, i: number) => (
                      <Cell key={i} fill={palette[i % palette.length]} stroke="transparent" strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <Smartphone size={16} className="text-primary" />
            <CardTitle>Device / Platform</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceChart.map((_: unknown, i: number) => (
                      <Cell key={i} fill={palette[i % palette.length]} stroke="transparent" strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
