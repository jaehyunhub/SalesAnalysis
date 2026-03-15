"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { DashboardPeriod } from "@/types";

// TODO: 백엔드 연동 시 GET /api/analysis/category?period=... 로 교체
const CATEGORY_DATA: Record<DashboardPeriod, Array<{ category: string; total_amount: number; percentage: number }>> = {
  daily: [
    { category: "음료",          total_amount: 385000, percentage: 30.0 },
    { category: "도시락/간편식", total_amount: 320000, percentage: 24.9 },
    { category: "과자/스낵",     total_amount: 215000, percentage: 16.7 },
    { category: "유제품",        total_amount: 142000, percentage: 11.1 },
    { category: "생활용품",      total_amount: 98000,  percentage: 7.6  },
    { category: "담배",          total_amount: 88000,  percentage: 6.9  },
    { category: "기타",          total_amount: 36000,  percentage: 2.8  },
  ],
  weekly: [
    { category: "음료",          total_amount: 2250000, percentage: 30.0 },
    { category: "도시락/간편식", total_amount: 1950000, percentage: 26.0 },
    { category: "과자/스낵",     total_amount: 1125000, percentage: 15.0 },
    { category: "유제품",        total_amount: 900000,  percentage: 12.0 },
    { category: "생활용품",      total_amount: 600000,  percentage: 8.0  },
    { category: "담배",          total_amount: 450000,  percentage: 6.0  },
    { category: "기타",          total_amount: 225000,  percentage: 3.0  },
  ],
  monthly: [
    { category: "음료",          total_amount: 8500000, percentage: 28.5 },
    { category: "도시락/간편식", total_amount: 6800000, percentage: 22.8 },
    { category: "과자/스낵",     total_amount: 5200000, percentage: 17.4 },
    { category: "유제품",        total_amount: 3200000, percentage: 10.7 },
    { category: "생활용품",      total_amount: 2800000, percentage: 9.4  },
    { category: "담배",          total_amount: 2100000, percentage: 7.0  },
    { category: "기타",          total_amount: 1250000, percentage: 4.2  },
  ],
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "오늘 카테고리별 매출",
  weekly:  "이번 주 카테고리별 매출",
  monthly: "이번 달 카테고리별 매출",
};

export default function CategoryChart({ period }: { period: DashboardPeriod }) {
  const data = CATEGORY_DATA[period];

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      <div className="h-[300px]">
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
      </div>
    </div>
  );
}
