"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { analysisApi } from "@/lib/api";
import type { DashboardPeriod } from "@/types";

interface ChartPoint {
  label: string;
  total_amount: number;
}

const formatAmount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000)    return `${(value / 1000).toFixed(0)}K`;
  return String(value);
};

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "최근 30일 매출 추이",
  weekly:  "최근 12주 매출 추이",
  monthly: "월별 매출 추이",
};

function toDateLabel(dateStr: string): string {
  // "2024-03-15" → "03/15"
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
  return dateStr;
}

function toMonthLabel(year: number, month: number): string {
  // 2024, 3 → "24/03"
  return `${String(year).slice(2)}/${String(month).padStart(2, "0")}`;
}

// 일별 데이터를 주별로 집계
function aggregateWeekly(daily: ChartPoint[]): ChartPoint[] {
  if (daily.length === 0) return [];
  const weeks: ChartPoint[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const chunk = daily.slice(i, i + 7);
    const total = chunk.reduce((s, d) => s + d.total_amount, 0);
    weeks.push({ label: chunk[0].label, total_amount: total });
  }
  return weeks;
}

export default function SalesChart({ period }: { period: DashboardPeriod }) {
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (period === "monthly") {
      analysisApi.getMonthly().then((res) => {
        setChartData(
          res.data.map((item) => ({
            label: toMonthLabel(item.year, item.month),
            total_amount: item.total_amount,
          }))
        );
      }).catch(() => setChartData([]));
    } else {
      // daily & weekly 모두 일별 데이터 사용 (weekly는 집계)
      const now = new Date();
      const days = period === "weekly" ? 84 : 30;
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      const fmt = (d: Date) => d.toISOString().split("T")[0];

      analysisApi.getDaily(fmt(startDate), fmt(now)).then((res) => {
        const points = res.data.map((item) => ({
          label: toDateLabel(item.date),
          total_amount: item.total_amount,
        }));
        setChartData(period === "weekly" ? aggregateWeekly(points) : points);
      }).catch(() => setChartData([]));
    }
  }, [period]);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      <div className="h-[300px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            데이터 없음
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {period === "daily" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} interval={4} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "매출액"]} labelStyle={{ color: "#374151" }} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total_amount" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: period === "weekly" ? 9 : 11, fill: "#9ca3af" }}
                  tickLine={false}
                  angle={period === "weekly" ? -30 : 0}
                  textAnchor={period === "weekly" ? "end" : "middle"}
                  height={period === "weekly" ? 50 : 30}
                />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "매출액"]} contentStyle={tooltipStyle} />
                <Bar dataKey="total_amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
