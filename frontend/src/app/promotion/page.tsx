"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { promotionApi, analysisApi } from "@/lib/api";
import type {
  PromotionCalculateResponse,
  PromotionItem,
  WasteRiskItem,
  StoreSuitabilityResponse,
} from "@/types";

type TabType = "calculator" | "waste-risk";

export default function PromotionPage() {
  const [activeTab, setActiveTab] = useState<TabType>("calculator");

  // 계산기 입력 상태
  const [productName, setProductName] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [wasteRate, setWasteRate] = useState("5");

  // 계산 결과
  const [calcResult, setCalcResult] = useState<PromotionCalculateResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState("");

  // 이력 저장용
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  // 과거 이력
  const [history, setHistory] = useState<PromotionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 실적 입력 모달
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editActualQty, setEditActualQty] = useState("");

  // 폐기 위험
  const [wasteRiskItems, setWasteRiskItems] = useState<WasteRiskItem[]>([]);
  const [wasteRiskLoading, setWasteRiskLoading] = useState(false);
  const [wasteRiskError, setWasteRiskError] = useState("");

  // 점포 적합성
  const [suitability, setSuitability] = useState<StoreSuitabilityResponse | null>(null);
  const [suitabilityLoading, setSuitabilityLoading] = useState(false);
  const [suitabilityError, setSuitabilityError] = useState("");

  const tabs: { key: TabType; label: string }[] = [
    { key: "calculator", label: "행사 이익율 계산기" },
    { key: "waste-risk", label: "폐기 위험 알림" },
  ];

  // 이력 조회
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await promotionApi.getHistory();
      setHistory(data.items || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // 폐기 위험 조회
  const fetchWasteRisk = useCallback(async () => {
    setWasteRiskLoading(true);
    setWasteRiskError("");
    try {
      const res = await analysisApi.getWasteRisk();
      setWasteRiskItems(res.data?.items || []);
    } catch {
      setWasteRiskError("폐기 위험 데이터를 불러올 수 없습니다.");
      setWasteRiskItems([]);
    } finally {
      setWasteRiskLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (activeTab === "waste-risk") {
      fetchWasteRisk();
    }
  }, [activeTab, fetchWasteRisk]);

  // API 계산
  const handleCalculate = async () => {
    const cost = parseFloat(costPrice);
    const sale = parseFloat(salePrice);
    const qty = parseFloat(expectedQty);
    const waste = parseFloat(wasteRate) || 0;

    if (!cost || !sale || !qty) {
      setCalcError("입고가, 판매가, 예상 판매량을 입력해주세요.");
      return;
    }

    setCalculating(true);
    setCalcError("");
    setSuitability(null);
    setSuitabilityError("");
    try {
      const result = await promotionApi.calculate({
        product_name: productName || "미지정 상품",
        promotion_name: promotionName || undefined,
        cost_price: cost,
        sale_price: sale,
        expected_qty: qty,
        waste_rate: waste,
      });
      setCalcResult(result);

      // 상품명이 있을 때 점포 적합성 분석 병행 호출
      const targetName = productName.trim() || "미지정 상품";
      setSuitabilityLoading(true);
      promotionApi.getSuitability(targetName)
        .then((data) => setSuitability(data))
        .catch(() => setSuitabilityError("점포 적합성 데이터를 불러올 수 없습니다."))
        .finally(() => setSuitabilityLoading(false));
    } catch {
      setCalcError("계산 중 오류가 발생했습니다. 서버 연결을 확인해주세요.");
    } finally {
      setCalculating(false);
    }
  };

  // 이력 저장
  const handleSave = async () => {
    if (!calcResult || !promotionName || !startDate || !endDate) {
      setCalcError("행사명, 시작일, 종료일을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await promotionApi.create({
        product_name: productName || "미지정 상품",
        promotion_name: promotionName,
        start_date: startDate,
        end_date: endDate,
        cost_price: parseFloat(costPrice),
        sale_price: parseFloat(salePrice),
        expected_qty: parseFloat(expectedQty),
        waste_rate: parseFloat(wasteRate) || 0,
        joined: true,
      });
      await fetchHistory();
      setCalcError("");
    } catch {
      setCalcError("이력 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 실적 업데이트
  const handleUpdateActual = async (id: number) => {
    const qty = parseFloat(editActualQty);
    if (!qty || qty <= 0) return;
    try {
      await promotionApi.update(id, { actual_qty: qty });
      setEditingId(null);
      setEditActualQty("");
      await fetchHistory();
    } catch {
      // 에러 무시
    }
  };

  // 이력 삭제
  const handleDelete = async (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await promotionApi.delete(id);
      await fetchHistory();
    } catch {
      // 에러 무시
    }
  };

  const riskLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return { bg: "bg-red-100", text: "text-red-700", label: "높음" };
      case "medium":
        return { bg: "bg-yellow-100", text: "text-yellow-700", label: "보통" };
      case "low":
        return { bg: "bg-green-100", text: "text-green-700", label: "낮음" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", label: level };
    }
  };

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-500 text-white"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "calculator" && (
        <>
          {/* Calculator */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-1 text-base font-semibold text-gray-800">
              행사 이익율 계산기
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              행사 아이템 정보를 입력하면 참여 여부에 따른 예상 이익을 비교합니다.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  상품명
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="예) 바나나맛 우유"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  행사명
                </label>
                <input
                  type="text"
                  value={promotionName}
                  onChange={(e) => setPromotionName(e.target.value)}
                  placeholder="예) 1+1 행사"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  입고가 (원)
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="900"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  판매가 (원)
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="1500"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  예상 판매량 (개)
                </label>
                <input
                  type="number"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                  placeholder="100"
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  예상 폐기율 (%)
                </label>
                <input
                  type="number"
                  value={wasteRate}
                  onChange={(e) => setWasteRate(e.target.value)}
                  min="0"
                  max="100"
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {calculating ? "계산 중..." : "계산하기"}
              </button>
            </div>

            {calcError && (
              <p className="mt-3 text-sm text-red-500">{calcError}</p>
            )}
          </div>

          {/* Comparison result */}
          {calcResult && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Join */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                  <h4 className="text-sm font-semibold text-blue-700">
                    {calcResult.joined.label}
                  </h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">예상 판매 수량</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.joined.expected_qty).toLocaleString()}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 매출</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.joined.total_revenue).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 원가</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.joined.total_cost).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">폐기 비용</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.joined.waste_cost).toLocaleString()}원
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 flex justify-between">
                    <span className="font-medium text-gray-700">순 이익</span>
                    <span
                      className={`text-base font-bold ${
                        calcResult.joined.net_profit >= 0 ? "text-blue-600" : "text-red-500"
                      }`}
                    >
                      {Math.round(calcResult.joined.net_profit).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">이익율</span>
                    <div className="flex items-center gap-1">
                      {calcResult.joined.profit_rate >= 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-lg font-bold ${
                          calcResult.joined.profit_rate >= 0 ? "text-blue-600" : "text-red-500"
                        }`}
                      >
                        {calcResult.joined.profit_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* No join */}
              <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-600">
                    {calcResult.not_joined.label}
                  </h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">예상 판매 수량</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.not_joined.expected_qty).toLocaleString()}개
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 매출</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.not_joined.total_revenue).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 원가</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.not_joined.total_cost).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">폐기 비용</span>
                    <span className="font-medium text-gray-800">
                      {Math.round(calcResult.not_joined.waste_cost).toLocaleString()}원
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-medium text-gray-700">순 이익</span>
                    <span
                      className={`text-base font-bold ${
                        calcResult.not_joined.net_profit >= 0 ? "text-gray-700" : "text-red-500"
                      }`}
                    >
                      {Math.round(calcResult.not_joined.net_profit).toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">이익율</span>
                    <div className="flex items-center gap-1">
                      {calcResult.not_joined.profit_rate >= 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                      )}
                      <span
                        className={`text-lg font-bold ${
                          calcResult.not_joined.profit_rate >= 0 ? "text-gray-700" : "text-red-500"
                        }`}
                      >
                        {calcResult.not_joined.profit_rate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 추천 메시지 */}
          {calcResult && (
            <div
              className={`rounded-xl p-4 text-sm font-medium ${
                calcResult.joined.net_profit > calcResult.not_joined.net_profit
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}
            >
              {calcResult.recommendation}
              {calcResult.break_even_qty > 0 && (
                <span className="ml-2 text-xs opacity-75">
                  (손익분기 판매량: {Math.round(calcResult.break_even_qty).toLocaleString()}개)
                </span>
              )}
            </div>
          )}

          {/* 점포 적합성 분석 */}
          {(suitabilityLoading || suitability || suitabilityError) && (
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="mb-4 flex items-center gap-2">
                <BuildingStorefrontIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-gray-800">
                  점포 적합성 분석
                </h3>
              </div>

              {suitabilityLoading ? (
                <p className="text-sm text-gray-500">분석 중...</p>
              ) : suitabilityError ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <p className="text-sm text-red-600">{suitabilityError}</p>
                </div>
              ) : suitability && (
                <div className="space-y-4">
                  {/* 점수 + 추천 */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500">적합성 점수</span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          suitability.suitability_score >= 70
                            ? "bg-green-100 text-green-700"
                            : suitability.suitability_score >= 40
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {suitability.suitability_score}점
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">예상 일평균 판매량</span>
                      <span className="text-sm font-semibold text-gray-800">
                        {suitability.estimated_daily_qty.toFixed(1)}개/일
                      </span>
                    </div>
                  </div>

                  <div
                    className={`rounded-lg p-3 text-sm font-medium ${
                      suitability.suitability_score >= 70
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : suitability.suitability_score >= 40
                        ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {suitability.recommendation}
                  </div>

                  {/* 유사 상품 테이블 */}
                  {suitability.similar_products.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        유사 상품 판매 현황 (최근 30일)
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500">
                              <th className="pb-2 pr-4 font-medium">상품명</th>
                              <th className="pb-2 pr-4 font-medium">카테고리</th>
                              <th className="pb-2 pr-4 font-medium text-right">일평균 판매량</th>
                              <th className="pb-2 font-medium text-right">30일 총 판매량</th>
                            </tr>
                          </thead>
                          <tbody>
                            {suitability.similar_products.map((p) => (
                              <tr
                                key={p.product_id}
                                className="border-b border-gray-100 text-gray-700"
                              >
                                <td className="py-2 pr-4 font-medium">{p.product_name}</td>
                                <td className="py-2 pr-4 text-gray-500">{p.category}</td>
                                <td className="py-2 pr-4 text-right">
                                  {p.avg_daily_qty.toFixed(1)}개
                                </td>
                                <td className="py-2 text-right">
                                  {p.total_30day_qty.toLocaleString()}개
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 이력 저장 */}
          {calcResult && (
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <h3 className="mb-3 text-base font-semibold text-gray-800">
                이력 저장
              </h3>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    행사 시작일
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    행사 종료일
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || !promotionName || !startDate || !endDate}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "이력 저장"}
                </button>
              </div>
            </div>
          )}

          {/* Past promotions */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-base font-semibold text-gray-800">
              과거 행사 이력
            </h3>
            {historyLoading ? (
              <p className="text-sm text-gray-500">불러오는 중...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400">등록된 행사 이력이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="pb-3 pr-4 font-medium">행사명</th>
                      <th className="pb-3 pr-4 font-medium">상품명</th>
                      <th className="pb-3 pr-4 font-medium">기간</th>
                      <th className="pb-3 pr-4 font-medium">참여</th>
                      <th className="pb-3 pr-4 font-medium text-right">예상 판매량</th>
                      <th className="pb-3 pr-4 font-medium text-right">실제 판매량</th>
                      <th className="pb-3 pr-4 font-medium text-right">실제 이익율</th>
                      <th className="pb-3 font-medium text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 text-gray-700"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {item.promotion_name}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {item.product_name}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {item.start_date} ~ {item.end_date}
                        </td>
                        <td className="py-3 pr-4">
                          {item.joined ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              참여
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                              미참여
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.expected_qty.toLocaleString()}개
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {editingId === item.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                value={editActualQty}
                                onChange={(e) => setEditActualQty(e.target.value)}
                                placeholder="수량"
                                className="w-20 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateActual(item.id)}
                                className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600"
                              >
                                확인
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditActualQty("");
                                }}
                                className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-300"
                              >
                                취소
                              </button>
                            </div>
                          ) : item.actual_qty != null ? (
                            <span
                              className={
                                item.actual_qty >= item.expected_qty
                                  ? "text-blue-600 font-medium"
                                  : "text-red-500 font-medium"
                              }
                            >
                              {item.actual_qty.toLocaleString()}개
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditActualQty("");
                              }}
                              className="text-blue-500 hover:text-blue-700"
                              title="실적 입력"
                            >
                              <PencilSquareIcon className="inline h-4 w-4" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.actual_profit_rate != null ? (
                            <span
                              className={`font-medium ${
                                item.actual_profit_rate >= 15
                                  ? "text-blue-600"
                                  : item.actual_profit_rate >= 0
                                  ? "text-gray-700"
                                  : "text-red-500"
                              }`}
                            >
                              {item.actual_profit_rate.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-400 hover:text-red-600"
                            title="삭제"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "waste-risk" && (
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
          <h3 className="mb-1 text-base font-semibold text-gray-800">
            폐기 위험 알림
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            최근 판매 추세가 감소하고 있는 상품을 표시합니다. 30일 평균 대비 최근
            7일 판매량 감소율을 기준으로 위험도를 산정합니다.
          </p>

          {wasteRiskLoading ? (
            <p className="text-sm text-gray-500">불러오는 중...</p>
          ) : wasteRiskError ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <p className="text-sm text-red-600">{wasteRiskError}</p>
            </div>
          ) : wasteRiskItems.length === 0 ? (
            <div className="rounded-lg bg-green-50 p-6 text-center">
              <CheckCircleIcon className="mx-auto h-8 w-8 text-green-400" />
              <p className="mt-2 text-sm font-medium text-green-700">
                현재 폐기 위험 상품이 없습니다.
              </p>
              <p className="mt-1 text-xs text-green-600">
                매출 데이터가 충분히 쌓이면 자동으로 분석됩니다.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="pb-3 pr-4 font-medium">상품명</th>
                    <th className="pb-3 pr-4 font-medium">카테고리</th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      최근 7일 판매량
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">
                      30일 평균 판매량
                    </th>
                    <th className="pb-3 pr-4 font-medium text-right">감소율</th>
                    <th className="pb-3 font-medium text-center">위험도</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteRiskItems.map((item) => {
                    const color = riskLevelColor(item.risk_level);
                    return (
                      <tr
                        key={item.product_id}
                        className="border-b border-gray-100 text-gray-700"
                      >
                        <td className="py-3 pr-4 font-medium">
                          {item.product_name}
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {item.category}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.recent_7day_qty.toLocaleString()}개
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.avg_30day_qty.toLocaleString()}개
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span className="font-medium text-red-500">
                            {item.decline_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
                          >
                            {color.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
