"use client";

import { useEffect, useState } from "react";
import { analysisApi } from "@/lib/api";
import type { DashboardPeriod, TopProduct } from "@/types";

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "오늘 매출 상위 10개 상품",
  weekly:  "이번 주 매출 상위 10개 상품",
  monthly: "이번 달 매출 상위 10개 상품",
};

export default function TopProducts({ period }: { period: DashboardPeriod }) {
  const [products, setProducts] = useState<TopProduct[]>([]);

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

    analysisApi.getTopProducts(10, startDate, period === "daily" ? fmt(now) : undefined)
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]));
  }, [period]);

  const maxAmount = products[0]?.total_amount || 1;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      {products.length === 0 ? (
        <p className="text-sm text-gray-400">데이터 없음</p>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <div key={product.name} className="flex items-center gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  index < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="truncate text-sm text-gray-700">{product.name}</span>
                  <span className="ml-2 shrink-0 text-sm font-medium text-gray-800">
                    {product.total_amount.toLocaleString()}원
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-blue-500"
                    style={{ width: `${(product.total_amount / maxAmount) * 100}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-xs text-gray-400">{product.total_quantity}개</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
