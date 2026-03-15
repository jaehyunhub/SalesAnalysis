"use client";

import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import type { DashboardPeriod } from "@/types";

type ChangeType = "positive" | "negative" | "neutral";

interface CardData {
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  changeLabel: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

// TODO: 백엔드 연동 시 GET /api/analysis/summary?period=daily|weekly|monthly 로 교체
const PERIOD_CARDS: Record<DashboardPeriod, CardData[]> = {
  daily: [
    {
      title: "오늘 매출", value: "1,284,500원",
      change: "+12.5%", changeType: "positive", changeLabel: "전일 대비",
      icon: CurrencyDollarIcon, color: "bg-blue-500",
    },
    {
      title: "오늘 거래 건수", value: "412건",
      change: "+8.0%", changeType: "positive", changeLabel: "전일 대비",
      icon: ArrowTrendingUpIcon, color: "bg-green-500",
    },
    {
      title: "주 누적 매출", value: "5,840,000원",
      change: "+5.2%", changeType: "positive", changeLabel: "전주 대비",
      icon: CalendarDaysIcon, color: "bg-purple-500",
    },
    {
      title: "폐기 위험 상품", value: "12개",
      change: "주의", changeType: "negative", changeLabel: "유통기한 임박",
      icon: CubeIcon, color: "bg-orange-500",
    },
  ],
  weekly: [
    {
      title: "이번 주 매출", value: "7,500,000원",
      change: "+8.3%", changeType: "positive", changeLabel: "전주 대비",
      icon: CurrencyDollarIcon, color: "bg-blue-500",
    },
    {
      title: "주 거래 건수", value: "1,900건",
      change: "+6.1%", changeType: "positive", changeLabel: "전주 대비",
      icon: ArrowTrendingUpIcon, color: "bg-green-500",
    },
    {
      title: "월 누적 매출", value: "28,456,000원",
      change: "+8.2%", changeType: "positive", changeLabel: "전월 대비",
      icon: CalendarDaysIcon, color: "bg-purple-500",
    },
    {
      title: "이번 주 신상품", value: "5개",
      change: "+2", changeType: "neutral", changeLabel: "전주 대비",
      icon: CubeIcon, color: "bg-orange-500",
    },
  ],
  monthly: [
    {
      title: "이번 달 매출", value: "28,456,000원",
      change: "+7.4%", changeType: "positive", changeLabel: "전월 대비",
      icon: CurrencyDollarIcon, color: "bg-blue-500",
    },
    {
      title: "월 거래 건수", value: "6,900건",
      change: "+4.2%", changeType: "positive", changeLabel: "전월 대비",
      icon: ArrowTrendingUpIcon, color: "bg-green-500",
    },
    {
      title: "년 누적 매출", value: "83,841,000원",
      change: "+5.8%", changeType: "positive", changeLabel: "전년 동기 대비",
      icon: CalendarDaysIcon, color: "bg-purple-500",
    },
    {
      title: "총 상품 수", value: "1,247개",
      change: "+23", changeType: "neutral", changeLabel: "전월 대비",
      icon: CubeIcon, color: "bg-orange-500",
    },
  ],
};

export default function SummaryCards({ period }: { period: DashboardPeriod }) {
  const cards = PERIOD_CARDS[period];

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
