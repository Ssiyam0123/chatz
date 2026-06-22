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
import { formatNumber } from "@/lib/utils";

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Growth</h1>
        <p className="text-muted-foreground text-sm mt-1">
          User growth, retention, and engagement analytics
        </p>
      </div>

      {/* Signups Over Time */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary" />
          <h2 className="font-semibold">Daily Signups</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={signups.length > 0 ? signups : [{ date: "No data", count: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#B98298" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DAU/WAU/MAU */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="font-semibold">DAU / WAU / MAU</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={dauWauMau.length > 0 ? dauWauMau : [{ date: "No data", dau: 0, wau: 0, mau: 0 }]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="dau" stroke="#B98298" strokeWidth={2} dot={false} name="DAU" />
              <Line type="monotone" dataKey="wau" stroke="#E8CDD8" strokeWidth={2} dot={false} name="WAU" />
              <Line type="monotone" dataKey="mau" stroke="#22c55e" strokeWidth={2} dot={false} name="MAU" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retention Cohorts */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-primary" />
          <h2 className="font-semibold">Retention Cohorts</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={retention.length > 0 ? retention : [{ cohort: "No data", week1: 0, week2: 0, week4: 0 }]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="cohort" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="week1" stroke="#B98298" strokeWidth={2} dot={false} name="Week 1" />
              <Line type="monotone" dataKey="week2" stroke="#E8CDD8" strokeWidth={2} dot={false} name="Week 2" />
              <Line type="monotone" dataKey="week4" stroke="#22c55e" strokeWidth={2} dot={false} name="Week 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Event Breakdown */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-primary" />
          <h2 className="font-semibold">Events Breakdown (30d)</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={eventCounts.length > 0 ? eventCounts : [{ event: "No data", count: 0 }]}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="event" tick={{ fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#B98298" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
