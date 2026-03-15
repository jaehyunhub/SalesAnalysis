"use client";

import type { DashboardPeriod } from "@/types";

// TODO: 백엔드 연동 시 GET /api/analysis/products?period=...&limit=10 로 교체
const TOP_PRODUCTS: Record<DashboardPeriod, Array<{ product_name: string; total_amount: number; total_quantity: number }>> = {
  daily: [
    { product_name: "코카콜라 500ml",    total_amount: 43200,  total_quantity: 24 },
    { product_name: "삼각김밥 참치마요", total_amount: 37200,  total_quantity: 31 },
    { product_name: "아메리카노 ICE",    total_amount: 34500,  total_quantity: 23 },
    { product_name: "신라면 컵",         total_amount: 31500,  total_quantity: 21 },
    { product_name: "바나나맛 우유",     total_amount: 28500,  total_quantity: 19 },
    { product_name: "CU 도시락 불고기",  total_amount: 27000,  total_quantity: 6  },
    { product_name: "포카칩 오리지널",   total_amount: 22000,  total_quantity: 11 },
    { product_name: "삼다수 2L",         total_amount: 19200,  total_quantity: 16 },
    { product_name: "컵라면 육개장",     total_amount: 16800,  total_quantity: 14 },
    { product_name: "빼빼로 초코",       total_amount: 15000,  total_quantity: 10 },
  ],
  weekly: [
    { product_name: "신라면 멀티팩",     total_amount: 430000, total_quantity: 107 },
    { product_name: "코카콜라 500ml",    total_amount: 400000, total_quantity: 222 },
    { product_name: "삼각김밥 참치마요", total_amount: 380000, total_quantity: 317 },
    { product_name: "아메리카노 ICE",    total_amount: 335000, total_quantity: 223 },
    { product_name: "바나나맛 우유",     total_amount: 290000, total_quantity: 193 },
    { product_name: "CU 도시락 불고기",  total_amount: 270000, total_quantity: 60  },
    { product_name: "포카칩 오리지널",   total_amount: 248000, total_quantity: 124 },
    { product_name: "삼다수 2L",         total_amount: 220000, total_quantity: 183 },
    { product_name: "컵라면 육개장",     total_amount: 198000, total_quantity: 165 },
    { product_name: "빼빼로 초코",       total_amount: 180000, total_quantity: 120 },
  ],
  monthly: [
    { product_name: "신라면 멀티팩",     total_amount: 1250000, total_quantity: 312 },
    { product_name: "코카콜라 500ml",    total_amount: 1120000, total_quantity: 640 },
    { product_name: "삼각김밥 참치마요", total_amount: 980000,  total_quantity: 780 },
    { product_name: "바나나맛 우유",     total_amount: 870000,  total_quantity: 580 },
    { product_name: "CU 도시락 불고기",  total_amount: 820000,  total_quantity: 205 },
    { product_name: "포카칩 오리지널",   total_amount: 750000,  total_quantity: 420 },
    { product_name: "아메리카노 ICE",    total_amount: 680000,  total_quantity: 453 },
    { product_name: "컵라면 육개장",     total_amount: 620000,  total_quantity: 516 },
    { product_name: "빼빼로 초코",       total_amount: 580000,  total_quantity: 386 },
    { product_name: "삼다수 2L",         total_amount: 540000,  total_quantity: 450 },
  ],
};

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "오늘 매출 상위 10개 상품",
  weekly:  "이번 주 매출 상위 10개 상품",
  monthly: "이번 달 매출 상위 10개 상품",
};

export default function TopProducts({ period }: { period: DashboardPeriod }) {
  const products = TOP_PRODUCTS[period];
  const maxAmount = products[0]?.total_amount || 1;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      <div className="space-y-3">
        {products.map((product, index) => (
          <div key={product.product_name} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                index < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="truncate text-sm text-gray-700">{product.product_name}</span>
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
    </div>
  );
}
