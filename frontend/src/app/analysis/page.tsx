"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import type { MonthlyWithMeta, WeeklyWithMeta, HourlySales, DailyMeta, WeatherInfo, EventInfo, CategorySales, TopProduct } from "@/types";
import { analysisApi, weatherApi, eventsApi } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────
const WEATHER_CONFIG = {
  sunny:  { icon: "\u2600\uFE0F",  label: "맑음", bg: "bg-yellow-50",  text: "text-yellow-700", svgColor: "#92400e" },
  cloudy: { icon: "\u26C5",  label: "흐림", bg: "bg-gray-100",   text: "text-gray-600",   svgColor: "#6b7280" },
  rainy:  { icon: "\uD83C\uDF27\uFE0F", label: "비",   bg: "bg-blue-50",    text: "text-blue-700",   svgColor: "#1d4ed8" },
  snowy:  { icon: "\u2744\uFE0F",  label: "눈",   bg: "bg-sky-50",     text: "text-sky-700",    svgColor: "#0369a1" },
} as const;

const EVENT_CONFIG = {
  holiday: { bg: "bg-red-50",    text: "text-red-700",    dot: "#ef4444" },
  school:  { bg: "bg-green-50",  text: "text-green-700",  dot: "#10b981" },
  local:   { bg: "bg-purple-50", text: "text-purple-700", dot: "#8b5cf6" },
  other:   { bg: "bg-gray-100",  text: "text-gray-600",   dot: "#9ca3af" },
} as const;

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];

const tooltipStyle = {
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const formatAmount = (v: number) =>
  v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

// ─────────────────────────────────────────────────────────────
// 헬퍼 함수
// ─────────────────────────────────────────────────────────────

type WeatherApiItem = { date: string; avg_temp: number | null; condition: string | null; precipitation: number | null };
type EventApiItem = { id: number; user_id: number; event_date: string; event_type: string; description: string; created_at: string };

function groupWeatherByMonth(weatherData: WeatherApiItem[]): Record<string, WeatherInfo> {
  const groups: Record<string, WeatherApiItem[]> = {};
  for (const w of weatherData) {
    const key = w.date.slice(0, 7); // "2026-03"
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
  }
  const result: Record<string, WeatherInfo> = {};
  for (const [key, items] of Object.entries(groups)) {
    const avgTemp = items.reduce((sum, w) => sum + (w.avg_temp || 0), 0) / items.length;
    const totalPrecip = items.reduce((sum, w) => sum + (w.precipitation || 0), 0);
    const conditions = items.map(w => w.condition).filter(Boolean) as string[];
    const conditionCount: Record<string, number> = {};
    conditions.forEach(c => { conditionCount[c] = (conditionCount[c] || 0) + 1; });
    const topCondition = Object.entries(conditionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "sunny";

    result[key] = {
      avgTemp: Math.round(avgTemp * 10) / 10,
      condition: topCondition as WeatherInfo["condition"],
      ...(totalPrecip > 0 ? { precipitation: Math.round(totalPrecip * 10) / 10 } : {}),
    };
  }
  return result;
}

function groupEventsByMonth(events: EventApiItem[]): Record<string, EventInfo[]> {
  const result: Record<string, EventInfo[]> = {};
  for (const e of events) {
    const key = e.event_date.slice(0, 7);
    if (!result[key]) result[key] = [];
    const [mm, dd] = e.event_date.slice(5).split("-");
    result[key].push({
      name: e.description,
      type: e.event_type as EventInfo["type"],
      date: `${parseInt(mm)}/${parseInt(dd)}`,
    });
  }
  return result;
}

function groupWeatherByWeek(weatherData: WeatherApiItem[], weekRanges: Array<{ start: string; end: string }>): Record<string, WeatherInfo> {
  const result: Record<string, WeatherInfo> = {};
  for (const range of weekRanges) {
    const items = weatherData.filter(w => w.date >= range.start && w.date <= range.end);
    if (items.length === 0) {
      result[range.start] = { avgTemp: 0, condition: "sunny" };
      continue;
    }
    const avgTemp = items.reduce((sum, w) => sum + (w.avg_temp || 0), 0) / items.length;
    const totalPrecip = items.reduce((sum, w) => sum + (w.precipitation || 0), 0);
    const conditions = items.map(w => w.condition).filter(Boolean) as string[];
    const conditionCount: Record<string, number> = {};
    conditions.forEach(c => { conditionCount[c] = (conditionCount[c] || 0) + 1; });
    const topCondition = Object.entries(conditionCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "sunny";
    result[range.start] = {
      avgTemp: Math.round(avgTemp * 10) / 10,
      condition: topCondition as WeatherInfo["condition"],
      ...(totalPrecip > 0 ? { precipitation: Math.round(totalPrecip * 10) / 10 } : {}),
    };
  }
  return result;
}

function groupEventsByWeek(events: EventApiItem[], weekRanges: Array<{ start: string; end: string }>): Record<string, EventInfo[]> {
  const result: Record<string, EventInfo[]> = {};
  for (const range of weekRanges) {
    const items = events.filter(e => e.event_date >= range.start && e.event_date <= range.end);
    result[range.start] = items.map(e => {
      const [mm, dd] = e.event_date.slice(5).split("-");
      return {
        name: e.description,
        type: e.event_type as EventInfo["type"],
        date: `${parseInt(mm)}/${parseInt(dd)}`,
      };
    });
  }
  return result;
}

/** 일별 데이터를 주 단위(월요일 기준)로 그룹핑 */
function groupDailyByWeek(dailyData: Array<{ date: string; total_amount: number; total_quantity: number }>): Array<{
  start: string; end: string; label: string; week: string;
  total_amount: number; total_quantity: number;
}> {
  if (dailyData.length === 0) return [];
  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const weeks: Array<{ start: string; end: string; label: string; week: string; total_amount: number; total_quantity: number }> = [];
  let currentWeekStart: Date | null = null;
  let currentGroup: typeof dailyData = [];

  for (const d of sorted) {
    const date = new Date(d.date + "T00:00:00");
    const dayOfWeek = date.getDay();
    // 월요일 기준 주 시작
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - mondayOffset);

    if (!currentWeekStart || monday.getTime() !== currentWeekStart.getTime()) {
      if (currentWeekStart && currentGroup.length > 0) {
        const sunday = new Date(currentWeekStart);
        sunday.setDate(currentWeekStart.getDate() + 6);
        const startMM = currentWeekStart.getMonth() + 1;
        const startDD = currentWeekStart.getDate();
        const endMM = sunday.getMonth() + 1;
        const endDD = sunday.getDate();
        const label = startMM === endMM
          ? `${startMM}/${startDD}~${endDD}`
          : `${startMM}/${startDD}~${endMM}/${endDD}`;
        const isoYear = currentWeekStart.getFullYear();
        const weekNum = getISOWeekNumber(currentWeekStart);
        weeks.push({
          start: formatDateStr(currentWeekStart),
          end: formatDateStr(sunday),
          label,
          week: `${isoYear}-W${String(weekNum).padStart(2, "0")}`,
          total_amount: currentGroup.reduce((s, x) => s + x.total_amount, 0),
          total_quantity: currentGroup.reduce((s, x) => s + x.total_quantity, 0),
        });
      }
      currentWeekStart = monday;
      currentGroup = [];
    }
    currentGroup.push(d);
  }

  // 마지막 그룹
  if (currentWeekStart && currentGroup.length > 0) {
    const sunday = new Date(currentWeekStart);
    sunday.setDate(currentWeekStart.getDate() + 6);
    const startMM = currentWeekStart.getMonth() + 1;
    const startDD = currentWeekStart.getDate();
    const endMM = sunday.getMonth() + 1;
    const endDD = sunday.getDate();
    const label = startMM === endMM
      ? `${startMM}/${startDD}~${endDD}`
      : `${startMM}/${startDD}~${endMM}/${endDD}`;
    const isoYear = currentWeekStart.getFullYear();
    const weekNum = getISOWeekNumber(currentWeekStart);
    weeks.push({
      start: formatDateStr(currentWeekStart),
      end: formatDateStr(sunday),
      label,
      week: `${isoYear}-W${String(weekNum).padStart(2, "0")}`,
      total_amount: currentGroup.reduce((s, x) => s + x.total_amount, 0),
      total_quantity: currentGroup.reduce((s, x) => s + x.total_quantity, 0),
    });
  }

  return weeks;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─────────────────────────────────────────────────────────────
// 로딩 스피너
// ─────────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      <span className="ml-3 text-sm text-gray-500">데이터를 불러오는 중...</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────

// 날씨 뱃지
function WeatherBadge({ condition, avgTemp }: { condition: keyof typeof WEATHER_CONFIG; avgTemp: number }) {
  const wc = WEATHER_CONFIG[condition];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${wc.bg} ${wc.text}`}>
      {wc.icon} {wc.label} {avgTemp}\u00B0C
    </span>
  );
}

// 이벤트 뱃지
function EventBadge({ name, type, date }: { name: string; type: keyof typeof EVENT_CONFIG; date?: string }) {
  const ec = EVENT_CONFIG[type];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ec.bg} ${ec.text}`}>
      {date ? `${date} ` : ""}{name}
    </span>
  );
}

// 날씨+이벤트를 표시하는 커스텀 XAxis tick (SVG)
const MonthWeatherTick = (props: {
  x?: string | number; y?: string | number;
  payload?: { value: string };
  metaMap: Record<string, MonthlyWithMeta>;
}) => {
  const { x = 0, y = 0, payload, metaMap } = props;
  if (!payload) return null;
  const meta = metaMap[payload.value];
  const wc = meta ? WEATHER_CONFIG[meta.weather.condition] : null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#9ca3af" fontSize={11}>
        {payload.value}
      </text>
      {wc && (
        <>
          <text x={0} y={0} dy={30} textAnchor="middle" fontSize={13}>{wc.icon}</text>
          <text x={0} y={0} dy={44} textAnchor="middle" fill={wc.svgColor} fontSize={9}>
            {meta.weather.avgTemp}\u00B0C
          </text>
        </>
      )}
    </g>
  );
};

const WeekWeatherTick = (props: {
  x?: string | number; y?: string | number;
  payload?: { value: string };
  metaMap: Record<string, WeeklyWithMeta>;
}) => {
  const { x = 0, y = 0, payload, metaMap } = props;
  if (!payload) return null;
  const meta = metaMap[payload.value];
  const wc = meta ? WEATHER_CONFIG[meta.weather.condition] : null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={14} textAnchor="middle" fill="#9ca3af" fontSize={9} transform="rotate(-25)">
        {payload.value}
      </text>
      {wc && (
        <>
          <text x={0} y={0} dy={32} textAnchor="middle" fontSize={12}>{wc.icon}</text>
          <text x={0} y={0} dy={45} textAnchor="middle" fill={wc.svgColor} fontSize={9}>
            {meta.weather.avgTemp}\u00B0C
          </text>
        </>
      )}
    </g>
  );
};

// 이벤트 점 포함 커스텀 바 shape
function makeBarShape(metaMap: Record<string, { events: Array<{ type: keyof typeof EVENT_CONFIG }> }>) {
  return function CustomBarShape(props: {
    x?: number; y?: number; width?: number; height?: number;
    fill?: string; label?: string;
  }) {
    const { x = 0, y = 0, width = 0, height = 0, fill, label } = props;
    const meta = label ? metaMap[label] : null;
    const dots = meta ? [
      ...meta.events.filter(e => e.type === "holiday").map(() => ({ color: EVENT_CONFIG.holiday.dot })),
      ...meta.events.filter(e => e.type === "school").map(()  => ({ color: EVENT_CONFIG.school.dot  })),
      ...meta.events.filter(e => e.type === "local").map(()   => ({ color: EVENT_CONFIG.local.dot   })),
    ] : [];

    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} />
        {dots.map((d, i) => (
          <circle key={i} cx={x + width / 2 + (i - (dots.length - 1) / 2) * 9} cy={y - 8} r={4} fill={d.color} />
        ))}
      </g>
    );
  };
}

// 커스텀 Tooltip
function MonthlyTooltip({ active, payload, metaList }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; total_amount: number } }>;
  metaList: MonthlyWithMeta[];
}) {
  if (!active || !payload?.[0]) return null;
  const { label, total_amount } = payload[0].payload;
  const meta = metaList.find(m => m.label === label);
  if (!meta) return null;
  const wc = WEATHER_CONFIG[meta.weather.condition];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[160px]">
      <p className="mb-2 font-bold text-gray-800">{label}</p>
      <p className="mb-1 text-gray-600">매출 <span className="font-semibold text-gray-900">{total_amount.toLocaleString()}원</span></p>
      <p className={`mb-1 ${wc.text}`}>{wc.icon} {wc.label} {meta.weather.avgTemp}\u00B0C</p>
      {meta.events.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {meta.events.map((ev, i) => {
            const ec = EVENT_CONFIG[ev.type];
            return (
              <span key={i} className={`rounded-full px-1.5 py-0.5 font-medium ${ec.bg} ${ec.text}`}>
                {ev.date ? `${ev.date} ` : ""}{ev.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeeklyTooltip({ active, payload, metaList }: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; total_amount: number } }>;
  metaList: WeeklyWithMeta[];
}) {
  if (!active || !payload?.[0]) return null;
  const { label, total_amount } = payload[0].payload;
  const meta = metaList.find(m => m.label === label);
  if (!meta) return null;
  const wc = WEATHER_CONFIG[meta.weather.condition];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xl text-xs min-w-[160px]">
      <p className="mb-2 font-bold text-gray-800">{label}</p>
      <p className="mb-1 text-gray-600">매출 <span className="font-semibold text-gray-900">{total_amount.toLocaleString()}원</span></p>
      <p className={`mb-1 ${wc.text}`}>{wc.icon} {wc.label} {meta.weather.avgTemp}\u00B0C</p>
      {meta.events.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {meta.events.map((ev, i) => {
            const ec = EVENT_CONFIG[ev.type];
            return (
              <span key={i} className={`rounded-full px-1.5 py-0.5 font-medium ${ec.bg} ${ec.text}`}>
                {ev.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
type AnalysisTab = "monthly" | "weekly" | "daily";

const TABS: { key: AnalysisTab; label: string }[] = [
  { key: "monthly", label: "월별" },
  { key: "weekly",  label: "주별" },
  { key: "daily",   label: "일별" },
];

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("monthly");
  const [loading, setLoading] = useState(true);

  // 월별 탭 데이터
  const [monthlyData, setMonthlyData] = useState<MonthlyWithMeta[]>([]);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthTopProducts, setMonthTopProducts] = useState<Array<{ name: string; category: string; total_amount: number; total_quantity: number }>>([]);
  const [monthCategoryStats, setMonthCategoryStats] = useState<CategorySales[]>([]);
  const [monthDetailLoading, setMonthDetailLoading] = useState(false);

  // 주별 탭 데이터
  const [weeklyData, setWeeklyData] = useState<WeeklyWithMeta[]>([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);

  // 일별 탭 데이터
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [hourlyData, setHourlyData] = useState<HourlySales[]>([]);
  const [dailyMeta, setDailyMeta] = useState<DailyMeta | null>(null);

  // ── 월별 데이터 로딩 ──
  const loadMonthlyData = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const [monthlyRes, weatherRes, eventsRes] = await Promise.all([
        analysisApi.getMonthly(year),
        weatherApi.getRange(`${year}-01-01`, `${year}-12-31`).catch(() => ({ data: [] as WeatherApiItem[] })),
        eventsApi.getAll().catch(() => ({ data: [] as EventApiItem[] })),
      ]);

      const monthly = monthlyRes.data;
      const weatherByMonth = groupWeatherByMonth(weatherRes.data);
      const eventsByMonth = groupEventsByMonth(eventsRes.data);

      const merged: MonthlyWithMeta[] = monthly.map(m => {
        const key = `${m.year}-${String(m.month).padStart(2, "0")}`;
        const label = `${String(m.year).slice(2)}/${String(m.month).padStart(2, "0")}`;
        return {
          month: key,
          label,
          total_amount: m.total_amount,
          total_quantity: m.total_quantity,
          weather: weatherByMonth[key] || { avgTemp: 0, condition: "sunny" as const },
          events: eventsByMonth[key] || [],
        };
      });
      setMonthlyData(merged);
      if (merged.length > 0) {
        setSelectedMonthIdx(merged.length - 1);
      }
    } catch (err) {
      console.error("월별 데이터 로딩 실패:", err);
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 선택된 월 상세 데이터 로딩 (상위상품 + 카테고리) ──
  const loadMonthDetail = useCallback(async (monthKey: string) => {
    setMonthDetailLoading(true);
    try {
      const [y, m] = monthKey.split("-");
      const startDate = `${y}-${m}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      const endDate = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;

      const [topRes, catRes] = await Promise.all([
        analysisApi.getTopProducts(7, startDate, endDate).catch(() => ({ data: [] as TopProduct[] })),
        analysisApi.getCategory(startDate, endDate).catch(() => ({ data: [] as CategorySales[] })),
      ]);

      setMonthTopProducts(topRes.data.map(p => ({
        name: p.name,
        category: (p as unknown as { category?: string }).category || "기타",
        total_amount: p.total_amount,
        total_quantity: p.total_quantity,
      })));
      setMonthCategoryStats(catRes.data.map(c => ({
        category: c.category,
        total_amount: c.total_amount,
        percentage: c.percentage,
      })));
    } catch (err) {
      console.error("월별 상세 데이터 로딩 실패:", err);
      setMonthTopProducts([]);
      setMonthCategoryStats([]);
    } finally {
      setMonthDetailLoading(false);
    }
  }, []);

  // ── 주별 데이터 로딩 (최근 12주) ──
  const loadWeeklyData = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDateObj = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);
      const startDate = startDateObj.toISOString().split("T")[0];

      const [dailyRes, weatherRes, eventsRes, categoryRes, topProductsRes] = await Promise.all([
        analysisApi.getDaily(startDate, endDate),
        weatherApi.getRange(startDate, endDate).catch(() => ({ data: [] as WeatherApiItem[] })),
        eventsApi.getAll().catch(() => ({ data: [] as EventApiItem[] })),
        analysisApi.getCategory(startDate, endDate).catch(() => ({ data: [] as CategorySales[] })),
        analysisApi.getTopProducts(5, startDate, endDate).catch(() => ({ data: [] as TopProduct[] })),
      ]);

      const weekGroups = groupDailyByWeek(dailyRes.data);
      const weekRanges = weekGroups.map(w => ({ start: w.start, end: w.end }));
      const weatherByWeek = groupWeatherByWeek(weatherRes.data, weekRanges);
      const eventsByWeek = groupEventsByWeek(eventsRes.data, weekRanges);

      // 전체 기간 카테고리/상품을 모든 주에 공유 (N+1 문제 방지)
      const sharedCategoryStats: CategorySales[] = categoryRes.data.map(c => ({
        category: c.category,
        total_amount: c.total_amount,
        percentage: c.percentage,
      }));
      const sharedTopProducts: TopProduct[] = topProductsRes.data;

      const merged: WeeklyWithMeta[] = weekGroups.map(wg => ({
        week: wg.week,
        label: wg.label,
        total_amount: wg.total_amount,
        total_quantity: wg.total_quantity,
        weather: weatherByWeek[wg.start] || { avgTemp: 0, condition: "sunny" as const },
        events: eventsByWeek[wg.start] || [],
        topProducts: sharedTopProducts,
        categoryStats: sharedCategoryStats,
      }));

      setWeeklyData(merged);
      if (merged.length > 0) {
        setSelectedWeekIdx(merged.length - 1);
      }
    } catch (err) {
      console.error("주별 데이터 로딩 실패:", err);
      setWeeklyData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 일별/시간대별 데이터 로딩 ──
  const loadDailyData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [hourlyRes, weatherRes, eventsRes, topRes, catRes] = await Promise.all([
        analysisApi.getHourly(date).catch(() => ({ data: [] as Array<{ hour: number; total_amount: number; total_quantity: number }> })),
        weatherApi.getDaily(date).catch(() => ({ data: null })),
        eventsApi.getAll().catch(() => ({ data: [] as EventApiItem[] })),
        analysisApi.getTopProducts(7, date, date).catch(() => ({ data: [] as TopProduct[] })),
        analysisApi.getCategory(date, date).catch(() => ({ data: [] as CategorySales[] })),
      ]);

      // 시간별 데이터 변환 (hour: number -> string)
      const convertedHourly: HourlySales[] = hourlyRes.data.map(h => ({
        hour: String(h.hour).padStart(2, "0"),
        total_amount: h.total_amount,
        total_quantity: h.total_quantity,
      }));
      setHourlyData(convertedHourly);

      // 이벤트 필터링
      const dayEvents: EventInfo[] = (eventsRes.data as EventApiItem[])
        .filter(e => e.event_date === date)
        .map(e => {
          const [mm, dd] = e.event_date.slice(5).split("-");
          return {
            name: e.description,
            type: e.event_type as EventInfo["type"],
            date: `${parseInt(mm)}/${parseInt(dd)}`,
          };
        });

      // 날씨 구성
      const weatherData = weatherRes.data as { avg_temp: number | null; condition: string | null; precipitation: number | null } | null;
      const weather: WeatherInfo = weatherData ? {
        avgTemp: weatherData.avg_temp || 0,
        condition: (weatherData.condition || "sunny") as WeatherInfo["condition"],
        ...(weatherData.precipitation ? { precipitation: weatherData.precipitation } : {}),
      } : { avgTemp: 0, condition: "sunny" as const };

      setDailyMeta({
        date,
        weather,
        events: dayEvents,
        topProducts: topRes.data.map(p => ({
          ...p,
          category: (p as unknown as { category?: string }).category || "기타",
        })),
        categoryStats: catRes.data.map(c => ({
          category: c.category,
          total_amount: c.total_amount,
          percentage: c.percentage,
        })),
      });
    } catch (err) {
      console.error("일별 데이터 로딩 실패:", err);
      setHourlyData([]);
      setDailyMeta(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 탭 전환 시 데이터 로딩 ──
  useEffect(() => {
    if (activeTab === "monthly") {
      loadMonthlyData(selectedYear);
    } else if (activeTab === "weekly") {
      loadWeeklyData();
    } else if (activeTab === "daily") {
      loadDailyData(selectedDate);
    }
  }, [activeTab, selectedYear, loadMonthlyData, loadWeeklyData, loadDailyData, selectedDate]);

  // ── 선택된 월 변경 시 상세 데이터 로딩 ──
  useEffect(() => {
    if (activeTab === "monthly" && monthlyData.length > 0 && monthlyData[selectedMonthIdx]) {
      loadMonthDetail(monthlyData[selectedMonthIdx].month);
    }
  }, [activeTab, selectedMonthIdx, monthlyData, loadMonthDetail]);

  // lookup maps
  const monthMetaMap = Object.fromEntries(monthlyData.map(m => [m.label, m]));
  const weekMetaMap  = Object.fromEntries(weeklyData.map(w => [w.label, w]));

  const dayTotal = hourlyData.reduce((s, h) => s + h.total_amount, 0);

  const MonthBarShape = makeBarShape(
    Object.fromEntries(monthlyData.map(m => [m.label, m]))
  );
  const WeekBarShape = makeBarShape(
    Object.fromEntries(weeklyData.map(w => [w.label, w]))
  );

  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key ? "bg-blue-500 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 월별 탭 ── */}
      {activeTab === "monthly" && (() => {
        if (loading) return <LoadingSpinner />;
        if (monthlyData.length === 0) {
          return (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">해당 연도의 매출 데이터가 없습니다.</p>
            </div>
          );
        }
        const selectedMonth = monthlyData[selectedMonthIdx];
        const chartData = monthlyData.map(m => ({
          label: m.label, total_amount: m.total_amount,
        }));

        return (
          <div className="space-y-6">
            {/* Year Selector */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedYear(y => y - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                &larr; {selectedYear - 1}
              </button>
              <span className="text-sm font-semibold text-gray-800">{selectedYear}년</span>
              <button
                onClick={() => setSelectedYear(y => y + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                {selectedYear + 1} &rarr;
              </button>
            </div>

            {/* Chart */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">월별 매출 현황</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" /> 공휴일</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" /> 학교이벤트</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-400" /> 지역이벤트</span>
                </div>
              </div>
              <p className="mb-3 text-xs text-gray-400">막대 위 점 = 이벤트 / 막대를 클릭하면 상세 정보를 확인합니다.</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    onClick={(d) => { if (d?.activeTooltipIndex != null) setSelectedMonthIdx(d.activeTooltipIndex as number); }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      height={60}
                      tick={(p) => <MonthWeatherTick {...p} metaMap={monthMetaMap} />}
                      tickLine={false}
                    />
                    <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<MonthlyTooltip metaList={monthlyData} />} />
                    <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={50} shape={MonthBarShape}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={idx === selectedMonthIdx ? "#1d4ed8" : "#3b82f6"} />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="avgTemp"
                      name="평균기온"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-orange-400 rounded" /> 평균기온</span>
              </div>
            </div>

            {/* Selected Month Detail */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">
                  {selectedMonth.label} 상세 분석
                </h3>
                <span className="text-sm font-medium text-blue-600">
                  {selectedMonth.total_amount.toLocaleString()}원
                </span>
              </div>

              {/* Weather + Events row */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <WeatherBadge condition={selectedMonth.weather.condition} avgTemp={selectedMonth.weather.avgTemp} />
                {selectedMonth.events.map((ev, i) => (
                  <EventBadge key={i} name={ev.name} type={ev.type} date={ev.date} />
                ))}
                {selectedMonth.events.length === 0 && (
                  <span className="text-xs text-gray-400">이벤트 없음</span>
                )}
              </div>

              {monthDetailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                  <span className="ml-2 text-sm text-gray-500">상세 데이터 로딩 중...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {/* Category Stats */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-700">카테고리별 매출</h4>
                    {monthCategoryStats.length === 0 ? (
                      <p className="text-xs text-gray-400">카테고리 데이터가 없습니다.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {monthCategoryStats.map((cs, idx) => (
                          <div key={cs.category} className="flex items-center gap-3">
                            <span className="w-20 shrink-0 text-xs text-gray-500">{cs.category}</span>
                            <div className="flex-1">
                              <div className="h-2 w-full rounded-full bg-gray-100">
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    width: `${cs.percentage || 0}%`,
                                    backgroundColor: COLORS[idx % COLORS.length],
                                  }}
                                />
                              </div>
                            </div>
                            <span className="w-16 shrink-0 text-right text-xs font-medium text-gray-700">
                              {cs.percentage || 0}%
                            </span>
                            <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                              {cs.total_amount.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Products */}
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-gray-700">상위 상품</h4>
                    {monthTopProducts.length === 0 ? (
                      <p className="text-xs text-gray-400">상품 데이터가 없습니다.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400">
                            <th className="pb-2 pr-2 font-medium">순위</th>
                            <th className="pb-2 pr-2 font-medium">상품명</th>
                            <th className="pb-2 pr-2 font-medium">카테고리</th>
                            <th className="pb-2 text-right font-medium">매출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthTopProducts.map((p, idx) => (
                            <tr key={idx} className="border-b border-gray-50 text-gray-700">
                              <td className="py-2 pr-2">
                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 pr-2">{p.name}</td>
                              <td className="py-2 pr-2">
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-600">{p.category}</span>
                              </td>
                              <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 주별 탭 ── */}
      {activeTab === "weekly" && (() => {
        if (loading) return <LoadingSpinner />;
        if (weeklyData.length === 0) {
          return (
            <div className="rounded-xl bg-white p-10 text-center shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">최근 12주 매출 데이터가 없습니다.</p>
            </div>
          );
        }
        const selectedWeek = weeklyData[selectedWeekIdx];
        const chartData = weeklyData.map(w => ({ label: w.label, total_amount: w.total_amount }));

        return (
          <div className="space-y-6">
            {/* Chart */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">주별 매출 현황 (최근 12주)</h3>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" /> 공휴일</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" /> 학교이벤트</span>
                </div>
              </div>
              <p className="mb-3 text-xs text-gray-400">막대를 클릭하면 해당 주 상세 정보를 확인합니다.</p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    onClick={(d) => { if (d?.activeTooltipIndex != null) setSelectedWeekIdx(d.activeTooltipIndex as number); }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="label"
                      height={60}
                      tick={(p) => <WeekWeatherTick {...p} metaMap={weekMetaMap} />}
                      tickLine={false}
                    />
                    <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<WeeklyTooltip metaList={weeklyData} />} />
                    <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={50} shape={WeekBarShape}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={idx === selectedWeekIdx ? "#1d4ed8" : "#3b82f6"} />
                      ))}
                    </Bar>
                    <Line
                      yAxisId="temp"
                      type="monotone"
                      dataKey="avgTemp"
                      name="평균기온"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-orange-400 rounded" /> 평균기온</span>
              </div>
            </div>

            {/* Selected Week Detail */}
            <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-800">{selectedWeek.label} 상세 분석</h3>
                <span className="text-sm font-medium text-blue-600">
                  {selectedWeek.total_amount.toLocaleString()}원 / {selectedWeek.total_quantity.toLocaleString()}건
                </span>
              </div>

              {/* Weather + Events */}
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <WeatherBadge condition={selectedWeek.weather.condition} avgTemp={selectedWeek.weather.avgTemp} />
                {selectedWeek.weather.precipitation && (
                  <span className="text-xs text-blue-500">강수 {selectedWeek.weather.precipitation}mm</span>
                )}
                {selectedWeek.events.map((ev, i) => (
                  <EventBadge key={i} name={ev.name} type={ev.type} date={ev.date} />
                ))}
                {selectedWeek.events.length === 0 && (
                  <span className="text-xs text-gray-400">이벤트 없음</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Category Ranking */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">카테고리별 매출 순위</h4>
                  {selectedWeek.categoryStats.length === 0 ? (
                    <p className="text-xs text-gray-400">카테고리 데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedWeek.categoryStats.map((cs, idx) => (
                        <div key={cs.category} className="flex items-center gap-3">
                          <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                            {idx + 1}
                          </span>
                          <span className="w-24 shrink-0 text-xs text-gray-600">{cs.category}</span>
                          <div className="flex-1">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full"
                                style={{ width: `${cs.percentage || 0}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                            </div>
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs font-medium text-gray-700">
                            {cs.total_amount.toLocaleString()}원
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Products */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">상품별 매출 순위</h4>
                  {selectedWeek.topProducts.length === 0 ? (
                    <p className="text-xs text-gray-400">상품 데이터가 없습니다.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400">
                          <th className="pb-2 pr-2 font-medium">순위</th>
                          <th className="pb-2 pr-2 font-medium">상품명</th>
                          <th className="pb-2 pr-2 text-right font-medium">판매량</th>
                          <th className="pb-2 text-right font-medium">매출</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWeek.topProducts.map((p, idx) => (
                          <tr key={idx} className="border-b border-gray-50 text-gray-700">
                            <td className="py-2 pr-2">
                              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{p.name}</td>
                            <td className="py-2 pr-2 text-right">{p.total_quantity}개</td>
                            <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 일별 탭 ── */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Date Picker + Weather/Events */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">날짜 선택</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {loading ? (
                <span className="text-xs text-gray-400">로딩 중...</span>
              ) : dailyMeta ? (
                <>
                  <WeatherBadge condition={dailyMeta.weather.condition} avgTemp={dailyMeta.weather.avgTemp} />
                  {dailyMeta.events.map((ev, i) => (
                    <EventBadge key={i} name={ev.name} type={ev.type} date={ev.date} />
                  ))}
                </>
              ) : (
                <span className="text-xs text-gray-400">날씨/이벤트 정보 없음</span>
              )}
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">일 매출</p>
                <p className="text-lg font-bold text-gray-800">{dayTotal.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              {/* Hourly Chart */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="mb-4 text-base font-semibold text-gray-800">시간별 매출 ({selectedDate})</h3>
                {hourlyData.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <p className="text-sm text-gray-500">해당 날짜의 시간별 데이터가 없습니다.</p>
                  </div>
                ) : (
                  <>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyData.map((h) => ({ ...h, label: `${h.hour}시` }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} />
                          <YAxis tickFormatter={formatAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(v, name) => [
                              `${Number(v).toLocaleString()}${name === "total_amount" ? "원" : "건"}`,
                              name === "total_amount" ? "매출액" : "거래수",
                            ]}
                            contentStyle={tooltipStyle}
                          />
                          <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={38}>
                            {hourlyData.map((h, idx) => (
                              <Cell key={idx} fill={["07","08","12","18","19"].includes(h.hour) ? "#1d4ed8" : "#3b82f6"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-800" /> 피크 시간대</span>
                      <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" /> 일반 시간대</span>
                    </div>
                  </>
                )}
              </div>

              {/* Daily Category + Products */}
              {dailyMeta && (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {/* Category */}
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <h3 className="mb-4 text-base font-semibold text-gray-800">카테고리별 매출</h3>
                    {dailyMeta.categoryStats.length === 0 ? (
                      <p className="text-xs text-gray-400">카테고리 데이터가 없습니다.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {dailyMeta.categoryStats.map((cs, idx) => (
                          <div key={cs.category} className="flex items-center gap-3">
                            <span className="w-20 shrink-0 text-xs text-gray-500">{cs.category}</span>
                            <div className="flex-1">
                              <div className="h-2 w-full rounded-full bg-gray-100">
                                <div
                                  className="h-2 rounded-full"
                                  style={{ width: `${cs.percentage || 0}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                                />
                              </div>
                            </div>
                            <span className="w-12 shrink-0 text-right text-xs font-medium text-gray-700">{cs.percentage || 0}%</span>
                            <span className="w-20 shrink-0 text-right text-xs text-gray-500">{cs.total_amount.toLocaleString()}원</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Products */}
                  <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                    <h3 className="mb-4 text-base font-semibold text-gray-800">오늘 상품별 매출</h3>
                    {dailyMeta.topProducts.length === 0 ? (
                      <p className="text-xs text-gray-400">상품 데이터가 없습니다.</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-400">
                            <th className="pb-2 pr-2 font-medium">순위</th>
                            <th className="pb-2 pr-2 font-medium">상품명</th>
                            <th className="pb-2 pr-2 font-medium">카테고리</th>
                            <th className="pb-2 pr-2 text-right font-medium">수량</th>
                            <th className="pb-2 text-right font-medium">매출</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyMeta.topProducts.map((p, idx) => (
                            <tr key={idx} className="border-b border-gray-50 text-gray-700">
                              <td className="py-2 pr-2">
                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 pr-2">{p.name}</td>
                              <td className="py-2 pr-2">
                                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-600">{p.category}</span>
                              </td>
                              <td className="py-2 pr-2 text-right">{p.total_quantity}개</td>
                              <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
