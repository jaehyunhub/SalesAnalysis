"use client";

import { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface PromotionHistory {
  id: number;
  name: string;
  period: string;
  joined: boolean;
  profit_rate: number;
  estimated_qty: number;
  actual_qty: number | null;
}

const mockHistory: PromotionHistory[] = [
  {
    id: 1,
    name: "1+1 바나나맛 우유",
    period: "2024-02-01 ~ 2024-02-29",
    joined: true,
    profit_rate: 18.5,
    estimated_qty: 120,
    actual_qty: 134,
  },
  {
    id: 2,
    name: "2+1 신라면 컵",
    period: "2024-01-15 ~ 2024-01-31",
    joined: true,
    profit_rate: 12.3,
    estimated_qty: 80,
    actual_qty: 72,
  },
  {
    id: 3,
    name: "GS25 협업 도시락 행사",
    period: "2023-12-01 ~ 2023-12-15",
    joined: false,
    profit_rate: 0,
    estimated_qty: 60,
    actual_qty: null,
  },
  {
    id: 4,
    name: "포카칩 3개 묶음 행사",
    period: "2023-11-01 ~ 2023-11-30",
    joined: true,
    profit_rate: 22.1,
    estimated_qty: 150,
    actual_qty: 168,
  },
  {
    id: 5,
    name: "아메리카노 1+1",
    period: "2023-10-01 ~ 2023-10-15",
    joined: false,
    profit_rate: 0,
    estimated_qty: 200,
    actual_qty: null,
  },
];

export default function PromotionPage() {
  const [productName, setProductName] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [wasteRate, setWasteRate] = useState("5");

  const cost = parseFloat(costPrice) || 0;
  const sale = parseFloat(salePrice) || 0;
  const qty = parseFloat(expectedQty) || 0;
  const waste = parseFloat(wasteRate) || 0;

  const soldQty = qty * (1 - waste / 100);
  const revenue = soldQty * sale;
  const totalCost = qty * cost;
  const netProfit = revenue - totalCost;
  const profitRate = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

  const noJoinProfit = soldQty * (sale * 0.9) - totalCost; // 미참여 시 일반 판매 가정 (판매가 -10%)
  const noJoinProfitRate = totalCost > 0 ? (noJoinProfit / totalCost) * 100 : 0;

  const hasResult = cost > 0 && sale > 0 && qty > 0;

  return (
    <div className="space-y-6">
      {/* Calculator */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-1 text-base font-semibold text-gray-800">
          행사 이익율 계산기
        </h3>
        <p className="mb-4 text-sm text-gray-500">
          행사 아이템 정보를 입력하면 참여 여부에 따른 예상 이익을 비교합니다.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              상품명
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예) 바나나맛 우유 1+1"
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
        </div>
      </div>

      {/* Comparison result */}
      {hasResult && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Join */}
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-500" />
              <h4 className="text-sm font-semibold text-blue-700">행사 참여 시</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">예상 판매 수량</span>
                <span className="font-medium text-gray-800">
                  {Math.round(soldQty).toLocaleString()}개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 매출</span>
                <span className="font-medium text-gray-800">
                  {Math.round(revenue).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 원가</span>
                <span className="font-medium text-gray-800">
                  {Math.round(totalCost).toLocaleString()}원
                </span>
              </div>
              <div className="border-t border-blue-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-700">순 이익</span>
                <span
                  className={`text-base font-bold ${
                    netProfit >= 0 ? "text-blue-600" : "text-red-500"
                  }`}
                >
                  {Math.round(netProfit).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">이익율</span>
                <div className="flex items-center gap-1">
                  {profitRate >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      profitRate >= 0 ? "text-blue-600" : "text-red-500"
                    }`}
                  >
                    {profitRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* No join */}
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-600">미참여 (일반 판매) 시</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">예상 판매 수량</span>
                <span className="font-medium text-gray-800">
                  {Math.round(soldQty).toLocaleString()}개
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 매출 (일반가)</span>
                <span className="font-medium text-gray-800">
                  {Math.round(soldQty * sale * 0.9).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">총 원가</span>
                <span className="font-medium text-gray-800">
                  {Math.round(totalCost).toLocaleString()}원
                </span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="font-medium text-gray-700">순 이익</span>
                <span
                  className={`text-base font-bold ${
                    noJoinProfit >= 0 ? "text-gray-700" : "text-red-500"
                  }`}
                >
                  {Math.round(noJoinProfit).toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">이익율</span>
                <div className="flex items-center gap-1">
                  {noJoinProfitRate >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      noJoinProfitRate >= 0 ? "text-gray-700" : "text-red-500"
                    }`}
                  >
                    {noJoinProfitRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasResult && (
        <div
          className={`rounded-xl p-4 text-sm font-medium ${
            netProfit > noJoinProfit
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-orange-50 text-orange-700 border border-orange-200"
          }`}
        >
          {netProfit > noJoinProfit ? (
            <>
              행사 참여 시 미참여 대비{" "}
              <strong>{Math.round(netProfit - noJoinProfit).toLocaleString()}원</strong> 더 유리합니다.
            </>
          ) : (
            <>
              미참여(일반 판매)가 행사 참여 대비{" "}
              <strong>{Math.round(noJoinProfit - netProfit).toLocaleString()}원</strong> 더 유리합니다.
            </>
          )}
        </div>
      )}

      {/* Past promotions */}
      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
        <h3 className="mb-4 text-base font-semibold text-gray-800">과거 행사 이력</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 pr-4 font-medium">행사명</th>
                <th className="pb-3 pr-4 font-medium">기간</th>
                <th className="pb-3 pr-4 font-medium">참여</th>
                <th className="pb-3 pr-4 font-medium text-right">예상 판매량</th>
                <th className="pb-3 pr-4 font-medium text-right">실제 판매량</th>
                <th className="pb-3 font-medium text-right">실제 이익율</th>
              </tr>
            </thead>
            <tbody>
              {mockHistory.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 text-gray-700">
                  <td className="py-3 pr-4 font-medium">{item.name}</td>
                  <td className="py-3 pr-4 text-gray-500">{item.period}</td>
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
                    {item.estimated_qty.toLocaleString()}개
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {item.actual_qty !== null ? (
                      <span
                        className={
                          item.actual_qty >= item.estimated_qty
                            ? "text-blue-600 font-medium"
                            : "text-red-500 font-medium"
                        }
                      >
                        {item.actual_qty.toLocaleString()}개
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    {item.joined ? (
                      <span
                        className={`font-medium ${
                          item.profit_rate >= 15
                            ? "text-blue-600"
                            : item.profit_rate >= 0
                            ? "text-gray-700"
                            : "text-red-500"
                        }`}
                      >
                        {item.profit_rate.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
