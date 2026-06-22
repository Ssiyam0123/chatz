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
import { formatNumber, formatPercent, timeAgo } from "@/lib/utils";

const COLORS = ["#6c5ce7", "#a29bfe", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6"];

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  color: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ date: string; count: number }[]>([]);
  const [dauData, setDauData] = useState<{ date: string; dau: number; wau: number; mau: number }[]>([]);
  const [geoData, setGeoData] = useState<{ country: string; count: number }[]>([]);
  const [deviceData, setDeviceData] = useState<{ name: string; value: number }[]>([]);
  const [slaData, setSlaData] = useState<{ status: string; avg_hours: number }[]>([]);
  const [reportStats, setReportStats] = useState({
    total: 0,
    open: 0,
    resolved: 0,
    escalated: 0,
  });
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
              icon: <Users size={20} />,
              color: "bg-purple-50 text-purple-600",
            },
            {
              title: "Active Users (DAU)",
              value: formatNumber(d.dau || 0),
              change: `WAU: ${formatNumber(d.wau || 0)}`,
              icon: <TrendingUp size={20} />,
              color: "bg-blue-50 text-blue-600",
            },
            {
              title: "Messages Today",
              value: formatNumber(d.messagesToday || 0),
              change: `Total: ${formatNumber(d.totalMessages || 0)}`,
              icon: <MessageSquare size={20} />,
              color: "bg-green-50 text-green-600",
            },
            {
              title: "Open Reports",
              value: formatNumber(d.openReports || 0),
              change: `${formatNumber(d.reportsToday || 0)} today`,
              icon: <Flag size={20} />,
              color: "bg-orange-50 text-orange-600",
            },
            {
              title: "Avg Resolution",
              value: `${d.avgResolutionHours || 0}h`,
              change: `${d.resolvedReports || 0} resolved`,
              icon: <Clock size={20} />,
              color: "bg-cyan-50 text-cyan-600",
            },
            {
              title: "Active Reports",
              value: formatNumber(d.activeReports || 0),
              change: `${d.escalatedReports || 0} escalated`,
              icon: <AlertTriangle size={20} />,
              color: "bg-red-50 text-red-600",
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

        if (slaRes.status === "fulfilled") {
          const d = slaRes.value.data.data || slaRes.value.data;
          setSlaData(Array.isArray(d) ? d : d.sla || []);
        }

        if (reportStatsRes.status === "fulfilled") {
          const d = reportStatsRes.value.data.data || reportStatsRes.value.data;
          setReportStats({
            total: d.total || 0,
            open: d.open || 0,
            resolved: d.resolved || 0,
            escalated: d.escalated || 0,
          });
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time analytics and moderation summary
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.title}</p>
            <p className="text-xs text-green-600 mt-0.5">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="font-semibold">User Growth</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowth.length > 0 ? userGrowth : [{ date: "No data", count: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6c5ce7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DAU/WAU/MAU Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-semibold">DAU / WAU / MAU</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dauData.length > 0 ? dauData : [{ date: "No data", dau: 0, wau: 0, mau: 0 }]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="dau" stroke="#6c5ce7" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="wau" stroke="#a29bfe" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mau" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geography */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={18} className="text-primary" />
            <h2 className="font-semibold">Geography</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={geoData.length > 0 ? geoData : [{ country: "No data", count: 1 }]}
                  dataKey="count"
                  nameKey="country"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ country, percent }) =>
                    `${country} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {(geoData.length > 0 ? geoData : [{ country: "No data", count: 1 }]).map(
                    (_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone size={18} className="text-primary" />
            <h2 className="font-semibold">Device / Platform</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData.length > 0 ? deviceData : [{ name: "No data", value: 1 }]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {(deviceData.length > 0 ? deviceData : [{ name: "No data", value: 1 }]).map(
                    (_: unknown, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
