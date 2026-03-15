"use client";

import { useState } from "react";
import SummaryCards from "@/components/dashboard/SummaryCards";
import SalesChart from "@/components/dashboard/SalesChart";
import CategoryChart from "@/components/dashboard/CategoryChart";
import TopProducts from "@/components/dashboard/TopProducts";
import type { DashboardPeriod } from "@/types";

const PERIOD_TABS: { key: DashboardPeriod; label: string; sub: string }[] = [
  { key: "daily",   label: "일별", sub: "오늘 기준" },
  { key: "weekly",  label: "주별", sub: "이번 주 기준" },
  { key: "monthly", label: "월별", sub: "이번 달 기준" },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("daily");

  return (
    <div className="space-y-5">
      {/* Period Tab */}
      <div className="flex items-center justify-between">
        <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                period === tab.key
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400">
          {PERIOD_TABS.find((t) => t.key === period)?.sub}
        </span>
      </div>

      <SummaryCards period={period} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SalesChart period={period} />
        <CategoryChart period={period} />
      </div>

      <TopProducts period={period} />
    </div>
  );
}
