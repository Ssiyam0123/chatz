"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getModerationSLA, getReportStats } from "@/lib/api";
import { formatNumber, cn } from "@/lib/utils";

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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const statusCards = [
    { label: "Open", value: reportStats.open, color: "text-yellow-600 bg-yellow-50" },
    { label: "In Review", value: reportStats.in_review, color: "text-blue-600 bg-blue-50" },
    { label: "Escalated", value: reportStats.escalated, color: "text-red-600 bg-red-50" },
    { label: "Closed", value: reportStats.closed, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Moderation performance and SLA metrics
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={cn("text-2xl font-bold mt-1", card.color.split(" ")[0])}>
              {formatNumber(card.value)}
            </p>
          </div>
        ))}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Total Reports</p>
          <p className="text-2xl font-bold mt-1">{formatNumber(reportStats.total)}</p>
        </div>
      </div>

      {/* SLA Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-primary" />
          <h2 className="font-semibold">Avg Resolution Time by Status (hours)</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={slaData.length > 0 ? slaData : [{ status: "No data", avg_hours: 0, count: 0 }]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_hours" stroke="#B98298" strokeWidth={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="/reports?status=open"
          className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-border hover:shadow-md transition-shadow"
        >
          <div className="p-3 rounded-lg bg-yellow-50 text-yellow-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-semibold">Open Reports Queue</p>
            <p className="text-sm text-muted-foreground">{reportStats.open} reports awaiting review</p>
          </div>
        </a>
        <a
          href="/reports?status=escalated"
          className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-border hover:shadow-md transition-shadow"
        >
          <div className="p-3 rounded-lg bg-red-50 text-red-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="font-semibold">Escalated Queue</p>
            <p className="text-sm text-muted-foreground">{reportStats.escalated} escalated reports</p>
          </div>
        </a>
      </div>
    </div>
  );
}
