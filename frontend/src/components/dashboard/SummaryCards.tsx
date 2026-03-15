"use client";

import { useEffect, useState } from "react";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import { analysisApi } from "@/lib/api";
import type { DashboardPeriod } from "@/types";

type ChangeType = "positive" | "negative" | "neutral";

interface SummaryData {
  today_amount: number;
  yesterday_amount: number;
  this_month_amount: number;
  total_products: number;
}

function calcChange(current: number, previous: number): { text: string; type: ChangeType } {
  if (previous === 0) return { text: "-", type: "neutral" };
  const pct = ((current - previous) / previous) * 100;
  const type: ChangeType = pct > 0 ? "positive" : pct < 0 ? "negative" : "neutral";
  return { text: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, type };
}

export default function SummaryCards({ period }: { period: DashboardPeriod }) {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    analysisApi.getSummary()
      .then((res) => setData(res.data))
      .catch(() => {/* 에러 무시, 빈 상태 유지 */});
  }, []);

  const todayChange = data ? calcChange(data.today_amount, data.yesterday_amount) : { text: "-", type: "neutral" as ChangeType };

  const cards = [
    {
      title: period === "daily" ? "오늘 매출" : period === "weekly" ? "이번 주 매출" : "이번 달 매출",
      value: data
        ? `${(period === "monthly" ? data.this_month_amount : data.today_amount).toLocaleString()}원`
        : "로딩 중...",
      change: period === "daily" ? todayChange.text : "-",
      changeType: period === "daily" ? todayChange.type : ("neutral" as ChangeType),
      changeLabel: period === "daily" ? "전일 대비" : period === "weekly" ? "전주 대비" : "전월 대비",
      icon: CurrencyDollarIcon,
      color: "bg-blue-500",
    },
    {
      title: "이번 달 누적",
      value: data ? `${data.this_month_amount.toLocaleString()}원` : "로딩 중...",
      change: "-",
      changeType: "neutral" as ChangeType,
      changeLabel: "당월 합계",
      icon: ArrowTrendingUpIcon,
      color: "bg-green-500",
    },
    {
      title: "전일 매출",
      value: data ? `${data.yesterday_amount.toLocaleString()}원` : "로딩 중...",
      change: "-",
      changeType: "neutral" as ChangeType,
      changeLabel: "어제 기준",
      icon: CalendarDaysIcon,
      color: "bg-purple-500",
    },
    {
      title: "총 상품 수",
      value: data ? `${data.total_products.toLocaleString()}개` : "로딩 중...",
      change: "-",
      changeType: "neutral" as ChangeType,
      changeLabel: "누적 상품",
      icon: CubeIcon,
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => (
        <div
          key={item.title}
          className="rounded-xl bg-white p-5 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{item.title}</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{item.value}</p>
            </div>
            <div className={`rounded-lg ${item.color} p-3`}>
              <item.icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <span
              className={`text-sm font-medium ${
                item.changeType === "positive"
                  ? "text-green-600"
                  : item.changeType === "negative"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {item.change}
            </span>
            <span className="ml-1 text-xs text-gray-400">{item.changeLabel}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
