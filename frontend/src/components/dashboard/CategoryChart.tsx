"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { analysisApi } from "@/lib/api";
import type { DashboardPeriod, CategorySales } from "@/types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "오늘 카테고리별 매출",
  weekly:  "이번 주 카테고리별 매출",
  monthly: "이번 달 카테고리별 매출",
};

export default function CategoryChart({ period }: { period: DashboardPeriod }) {
  const [data, setData] = useState<CategorySales[]>([]);

  useEffect(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];

    let startDate: string | undefined;
    if (period === "daily") {
      startDate = fmt(now);
    } else if (period === "weekly") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = fmt(d);
    }

    analysisApi.getCategory(startDate, period === "daily" ? fmt(now) : undefined)
      .then((res) => setData(res.data))
      .catch(() => setData([]));
  }, [period]);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      <div className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            데이터 없음
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="total_amount"
                nameKey="category"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name} ${((percent || 0) * 100).toFixed(1)}%`
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString()}원`, "매출액"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
