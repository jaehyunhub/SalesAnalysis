"use client";

import { useState } from "react";
import type { SalesRecord } from "@/types";

const PRODUCT_META: Record<string, { category: string; price: number }> = {
  "코카콜라 500ml":      { category: "음료",          price: 1800 },
  "삼각김밥 참치마요":   { category: "도시락/간편식", price: 1200 },
  "신라면 컵":           { category: "식품",          price: 1500 },
  "바나나맛 우유":       { category: "유제품",        price: 1500 },
  "CU 도시락 불고기":    { category: "도시락/간편식", price: 4500 },
  "포카칩 오리지널":     { category: "과자/스낵",     price: 2000 },
  "아메리카노 ICE":      { category: "음료",          price: 1500 },
  "컵라면 육개장":       { category: "식품",          price: 1200 },
  "빼빼로 초코":         { category: "과자/스낵",     price: 1500 },
  "삼다수 2L":           { category: "음료",          price: 1200 },
};

const productNames = Object.keys(PRODUCT_META);

// TODO: 백엔드 연동 시 GET /api/sales 로 교체
const mockSalesRecords: SalesRecord[] = Array.from({ length: 50 }, (_, i) => {
  const date = new Date("2026-03-15");
  date.setDate(date.getDate() - Math.floor(i / 5));
  const name = productNames[i % productNames.length];
  const meta = PRODUCT_META[name];
  const qty = Math.floor((i % 5) + 1);
  return {
    id: i + 1,
    product_name: name,
    category: meta.category,
    sale_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    sale_time: `${String(8 + (i * 3) % 14).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
    quantity: qty,
    total_amount: qty * meta.price,
  };
});

const ALL_CATEGORIES = ["전체", ...Array.from(new Set(mockSalesRecords.map((r) => r.category))).sort()];
const PAGE_SIZE = 10;

export default function SalesPage() {
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [category, setCategory]     = useState("전체");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredRecords = mockSalesRecords.filter((r) => {
    if (startDate && r.sale_date < startDate) return false;
    if (endDate   && r.sale_date > endDate)   return false;
    if (category !== "전체" && r.category !== category) return false;
    return true;
  });

  const totalAmount = filteredRecords.reduce((s, r) => s + r.total_amount, 0);
  const totalQty    = filteredRecords.reduce((s, r) => s + r.quantity, 0);

  // 카테고리별 집계
  const categoryStats = ALL_CATEGORIES.filter((c) => c !== "전체").map((cat) => {
    const items = filteredRecords.filter((r) => r.category === cat);
    return {
      category: cat,
      amount: items.reduce((s, r) => s + r.total_amount, 0),
      count: items.length,
    };
  }).filter((c) => c.count > 0);

  const totalPages      = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFilter = () => setCurrentPage(1);
  const handleReset  = () => {
    setStartDate("");
    setEndDate("");
    setCategory("전체");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">검색 필터</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">시작 날짜</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">종료 날짜</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">카테고리</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleFilter}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            조회
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            초기화
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500">조회 기간 총 매출</p>
          <p className="mt-1 text-xl font-bold text-gray-800">
            {totalAmount.toLocaleString()}원
          </p>
          <p className="mt-0.5 text-xs text-gray-400">총 {filteredRecords.length}건</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500">총 판매 수량</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{totalQty.toLocaleString()}개</p>
          <p className="mt-0.5 text-xs text-gray-400">
            건당 평균 {filteredRecords.length > 0 ? Math.round(totalAmount / filteredRecords.length).toLocaleString() : 0}원
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="mb-2 text-xs font-medium text-gray-500">카테고리별 매출</p>
          <div className="space-y-1.5">
            {categoryStats.map((cs) => (
              <div key={cs.category} className="flex items-center justify-between">
                <span className="text-xs text-gray-600">{cs.category}</span>
                <span className="text-xs font-medium text-gray-800">
                  {cs.amount.toLocaleString()}원
                </span>
              </div>
            ))}
            {categoryStats.length === 0 && (
              <p className="text-xs text-gray-400">데이터 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800">매출 내역</h3>
          <span className="text-sm text-gray-500">총 {filteredRecords.length}건</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 pr-4 font-medium">날짜</th>
                <th className="pb-3 pr-4 font-medium">시간</th>
                <th className="pb-3 pr-4 font-medium">상품명</th>
                <th className="pb-3 pr-4 font-medium">카테고리</th>
                <th className="pb-3 pr-4 font-medium text-right">수량</th>
                <th className="pb-3 font-medium text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 text-gray-700">
                  <td className="py-3 pr-4">{record.sale_date}</td>
                  <td className="py-3 pr-4">{record.sale_time}</td>
                  <td className="py-3 pr-4 font-medium">{record.product_name}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {record.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">{record.quantity}</td>
                  <td className="py-3 text-right font-medium">
                    {record.total_amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
              {paginatedRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    조회된 매출 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  currentPage === page
                    ? "bg-blue-500 text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
