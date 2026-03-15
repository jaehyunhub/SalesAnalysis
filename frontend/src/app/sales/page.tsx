"use client";

import { useState, useEffect, useCallback } from "react";
import { salesApi } from "@/lib/api";

// 백엔드 응답 타입 (product 중첩 구조)
interface SalesRow {
  id: number;
  sale_date: string;
  sale_time: string | null;
  quantity: number;
  total_amount: number;
  product: { name: string; category: string } | null;
}

const CATEGORIES = ["전체", "음료", "도시락/간편식", "과자/스낵", "유제품", "생활용품", "담배", "식품", "기타"];
const PAGE_SIZE = 20;

export default function SalesPage() {
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [category, setCategory]       = useState("전체");
  const [currentPage, setCurrentPage] = useState(1);

  const [records, setRecords]     = useState<SalesRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecords = useCallback(async (page: number) => {
    setIsLoading(true);
    try {
      const res = await salesApi.getRecords({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        category: category !== "전체" ? category : undefined,
        page,
        size: PAGE_SIZE,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = res.data as any;
      setRecords(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setRecords([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, category]);

  useEffect(() => {
    fetchRecords(currentPage);
  }, [currentPage, fetchRecords]);

  const totalAmount = records.reduce((s, r) => s + r.total_amount, 0);
  const totalQty    = records.reduce((s, r) => s + r.quantity, 0);
  const totalPages  = Math.ceil(total / PAGE_SIZE);

  // 카테고리별 집계 (현재 페이지 기준)
  const categoryStats = CATEGORIES.filter((c) => c !== "전체").map((cat) => {
    const items = records.filter((r) => r.product?.category === cat);
    return { category: cat, amount: items.reduce((s, r) => s + r.total_amount, 0), count: items.length };
  }).filter((c) => c.count > 0);

  const handleFilter = () => {
    setCurrentPage(1);
    fetchRecords(1);
  };
  const handleReset = () => {
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
              {CATEGORIES.map((c) => (
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
          <p className="text-xs font-medium text-gray-500">조회 기간 총 매출 (현재 페이지)</p>
          <p className="mt-1 text-xl font-bold text-gray-800">
            {totalAmount.toLocaleString()}원
          </p>
          <p className="mt-0.5 text-xs text-gray-400">총 {total}건</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <p className="text-xs font-medium text-gray-500">총 판매 수량</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{totalQty.toLocaleString()}개</p>
          <p className="mt-0.5 text-xs text-gray-400">
            건당 평균 {records.length > 0 ? Math.round(totalAmount / records.length).toLocaleString() : 0}원
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
          <span className="text-sm text-gray-500">총 {total}건</span>
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
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    로딩 중...
                  </td>
                </tr>
              )}
              {!isLoading && records.map((record) => (
                <tr key={record.id} className="border-b border-gray-100 text-gray-700">
                  <td className="py-3 pr-4">{record.sale_date}</td>
                  <td className="py-3 pr-4">{record.sale_time ?? "-"}</td>
                  <td className="py-3 pr-4 font-medium">{record.product?.name ?? "-"}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {record.product?.category ?? "-"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">{record.quantity}</td>
                  <td className="py-3 text-right font-medium">
                    {record.total_amount.toLocaleString()}원
                  </td>
                </tr>
              ))}
              {!isLoading && records.length === 0 && (
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
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
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
