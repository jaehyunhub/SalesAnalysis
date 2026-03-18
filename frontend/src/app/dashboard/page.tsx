"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import SummaryCards from "@/components/dashboard/SummaryCards";
import SalesChart from "@/components/dashboard/SalesChart";
import CategoryChart from "@/components/dashboard/CategoryChart";
import TopProducts from "@/components/dashboard/TopProducts";
import { analysisApi } from "@/lib/api";
import type { DashboardPeriod } from "@/types";

const PERIOD_TABS: { key: DashboardPeriod; label: string; sub: string }[] = [
  { key: "daily",   label: "일별", sub: "오늘 기준" },
  { key: "weekly",  label: "주별", sub: "이번 주 기준" },
  { key: "monthly", label: "월별", sub: "이번 달 기준" },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("daily");
  const [wasteRiskTotal, setWasteRiskTotal] = useState(0);

  useEffect(() => {
    analysisApi.getWasteRisk()
      .then((res) => {
        setWasteRiskTotal(res.data?.total ?? 0);
      })
      .catch(() => {
        setWasteRiskTotal(0);
      });
  }, []);

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

      {/* 폐기 위험 알림 배너 */}
      {wasteRiskTotal > 0 && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                폐기 위험 상품 {wasteRiskTotal}개 감지됨
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                최근 7일 판매량이 크게 감소한 상품이 있습니다.
              </p>
            </div>
          </div>
          <Link
            href="/promotion"
            className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            폐기 위험 상세 보기 →
          </Link>
        </div>
      )}

      <SummaryCards period={period} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SalesChart period={period} />
        <CategoryChart period={period} />
      </div>

      <TopProducts period={period} />
    </div>
  );
}
