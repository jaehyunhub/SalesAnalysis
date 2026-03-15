"use client";

import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardPeriod } from "@/types";

// TODO: 백엔드 연동 시 GET /api/analysis/daily|weekly|monthly 로 교체
const mockDailyData = [
  { label: "02/14", total_amount: 820000 }, { label: "02/15", total_amount: 1050000 },
  { label: "02/16", total_amount: 980000  }, { label: "02/17", total_amount: 1120000 },
  { label: "02/18", total_amount: 890000  }, { label: "02/19", total_amount: 760000  },
  { label: "02/20", total_amount: 1280000 }, { label: "02/21", total_amount: 1350000 },
  { label: "02/22", total_amount: 1010000 }, { label: "02/23", total_amount: 940000  },
  { label: "02/24", total_amount: 1080000 }, { label: "02/25", total_amount: 1200000 },
  { label: "02/26", total_amount: 870000  }, { label: "02/27", total_amount: 920000  },
  { label: "02/28", total_amount: 1300000 }, { label: "03/01", total_amount: 1150000 },
  { label: "03/02", total_amount: 990000  }, { label: "03/03", total_amount: 1060000 },
  { label: "03/04", total_amount: 1180000 }, { label: "03/05", total_amount: 830000  },
  { label: "03/06", total_amount: 880000  }, { label: "03/07", total_amount: 1220000 },
  { label: "03/08", total_amount: 1090000 }, { label: "03/09", total_amount: 970000  },
  { label: "03/10", total_amount: 1140000 }, { label: "03/11", total_amount: 1310000 },
  { label: "03/12", total_amount: 850000  }, { label: "03/13", total_amount: 910000  },
  { label: "03/14", total_amount: 1260000 }, { label: "03/15", total_amount: 1284500 },
];

const mockWeeklyData = [
  { label: "12/16~12/22", total_amount: 7200000 },
  { label: "12/23~12/29", total_amount: 9200000 },
  { label: "12/30~1/5",   total_amount: 8800000 },
  { label: "1/6~1/12",    total_amount: 7100000 },
  { label: "1/13~1/19",   total_amount: 7400000 },
  { label: "1/20~1/26",   total_amount: 8500000 },
  { label: "1/27~2/2",    total_amount: 7900000 },
  { label: "2/3~2/9",     total_amount: 7300000 },
  { label: "2/10~2/16",   total_amount: 7600000 },
  { label: "2/17~2/23",   total_amount: 8100000 },
  { label: "2/24~3/2",    total_amount: 7700000 },
  { label: "3/3~3/9",     total_amount: 7500000 },
];

const mockMonthlyData = [
  { label: "23/07", total_amount: 22500000 }, { label: "23/08", total_amount: 25300000 },
  { label: "23/09", total_amount: 23800000 }, { label: "23/10", total_amount: 26100000 },
  { label: "23/11", total_amount: 27400000 }, { label: "23/12", total_amount: 31200000 },
  { label: "24/01", total_amount: 28900000 }, { label: "24/02", total_amount: 26500000 },
  { label: "24/03", total_amount: 28456000 },
];

const formatAmount = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000)    return `${(value / 1000).toFixed(0)}K`;
  return String(value);
};

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const TITLE: Record<DashboardPeriod, string> = {
  daily:   "최근 30일 매출 추이",
  weekly:  "최근 12주 매출 추이",
  monthly: "월별 매출 추이",
};

export default function SalesChart({ period }: { period: DashboardPeriod }) {
  const chartData =
    period === "daily"   ? mockDailyData
    : period === "weekly"  ? mockWeeklyData
    : mockMonthlyData;

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
      <h3 className="mb-4 text-base font-semibold text-gray-800">{TITLE[period]}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {period === "daily" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} interval={4} />
              <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "매출액"]} labelStyle={{ color: "#374151" }} contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total_amount" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: period === "weekly" ? 9 : 11, fill: "#9ca3af" }}
                tickLine={false}
                angle={period === "weekly" ? -30 : 0}
                textAnchor={period === "weekly" ? "end" : "middle"}
                height={period === "weekly" ? 50 : 30}
              />
              <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()}원`, "매출액"]} contentStyle={tooltipStyle} />
              <Bar dataKey="total_amount" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
