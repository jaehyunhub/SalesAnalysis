"use client";

import { useState } from "react";
import {
  ComposedChart, BarChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import type { MonthlyWithMeta, WeeklyWithMeta, HourlySales, DailyMeta } from "@/types";

// ─────────────────────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────────────────────
const WEATHER_CONFIG = {
  sunny:  { icon: "☀️",  label: "맑음", bg: "bg-yellow-50",  text: "text-yellow-700", svgColor: "#92400e" },
  cloudy: { icon: "⛅",  label: "흐림", bg: "bg-gray-100",   text: "text-gray-600",   svgColor: "#6b7280" },
  rainy:  { icon: "🌧️", label: "비",   bg: "bg-blue-50",    text: "text-blue-700",   svgColor: "#1d4ed8" },
  snowy:  { icon: "❄️",  label: "눈",   bg: "bg-sky-50",     text: "text-sky-700",    svgColor: "#0369a1" },
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
// Mock Data — TODO: 각 항목을 API로 교체
// ─────────────────────────────────────────────────────────────

const MONTHLY_TOP_PRODUCTS: Record<string, Array<{ product_name: string; category: string; total_amount: number; total_quantity: number }>> = {
  default: [
    { product_name: "신라면 멀티팩",     category: "식품",          total_amount: 1250000, total_quantity: 312 },
    { product_name: "코카콜라 500ml",    category: "음료",          total_amount: 1120000, total_quantity: 640 },
    { product_name: "삼각김밥 참치마요", category: "도시락/간편식", total_amount: 980000,  total_quantity: 780 },
    { product_name: "바나나맛 우유",     category: "유제품",        total_amount: 870000,  total_quantity: 580 },
    { product_name: "CU 도시락 불고기",  category: "도시락/간편식", total_amount: 820000,  total_quantity: 205 },
    { product_name: "포카칩 오리지널",   category: "과자/스낵",     total_amount: 750000,  total_quantity: 420 },
    { product_name: "아메리카노 ICE",    category: "음료",          total_amount: 680000,  total_quantity: 453 },
  ],
  "2023-12": [
    { product_name: "코카콜라 500ml",    category: "음료",          total_amount: 1450000, total_quantity: 806 },
    { product_name: "신라면 멀티팩",     category: "식품",          total_amount: 1380000, total_quantity: 345 },
    { product_name: "CU 도시락 불고기",  category: "도시락/간편식", total_amount: 1120000, total_quantity: 249 },
    { product_name: "빼빼로 초코",       category: "과자/스낵",     total_amount: 950000,  total_quantity: 633 },
    { product_name: "아메리카노 ICE",    category: "음료",          total_amount: 820000,  total_quantity: 547 },
    { product_name: "바나나맛 우유",     category: "유제품",        total_amount: 780000,  total_quantity: 520 },
    { product_name: "삼각김밥 참치마요", category: "도시락/간편식", total_amount: 740000,  total_quantity: 617 },
  ],
  "2024-03": [
    { product_name: "코카콜라 500ml",    category: "음료",          total_amount: 1180000, total_quantity: 656 },
    { product_name: "신라면 멀티팩",     category: "식품",          total_amount: 1150000, total_quantity: 287 },
    { product_name: "삼각김밥 참치마요", category: "도시락/간편식", total_amount: 1020000, total_quantity: 850 },
    { product_name: "아메리카노 ICE",    category: "음료",          total_amount: 920000,  total_quantity: 613 },
    { product_name: "바나나맛 우유",     category: "유제품",        total_amount: 860000,  total_quantity: 573 },
    { product_name: "CU 도시락 불고기",  category: "도시락/간편식", total_amount: 810000,  total_quantity: 180 },
    { product_name: "포카칩 오리지널",   category: "과자/스낵",     total_amount: 720000,  total_quantity: 360 },
  ],
};

const BASE_CATEGORY_STATS = [
  { category: "음료",          percentage: 28.5 },
  { category: "도시락/간편식", percentage: 22.8 },
  { category: "과자/스낵",     percentage: 17.4 },
  { category: "유제품",        percentage: 10.7 },
  { category: "생활용품",      percentage: 9.4  },
  { category: "담배",          percentage: 7.0  },
  { category: "기타",          percentage: 4.2  },
];

const makeCategoryStats = (total: number) =>
  BASE_CATEGORY_STATS.map((c) => ({
    category: c.category,
    total_amount: Math.round(total * c.percentage / 100),
    percentage: c.percentage,
  }));

// TODO: GET /api/analysis/monthly (+ weather/events 병합)
const mockMonthlyData: MonthlyWithMeta[] = [
  { month: "2023-07", label: "23/07", total_amount: 22500000, total_quantity: 5800,
    weather: { avgTemp: 28.5, condition: "sunny"  }, events: [] },
  { month: "2023-08", label: "23/08", total_amount: 25300000, total_quantity: 6200,
    weather: { avgTemp: 30.2, condition: "rainy", precipitation: 8.5 },
    events: [{ name: "여름방학", type: "school" }] },
  { month: "2023-09", label: "23/09", total_amount: 23800000, total_quantity: 5900,
    weather: { avgTemp: 22.1, condition: "sunny"  },
    events: [{ name: "개학", type: "school", date: "9/4" }, { name: "추석", type: "holiday", date: "9/28" }] },
  { month: "2023-10", label: "23/10", total_amount: 26100000, total_quantity: 6500,
    weather: { avgTemp: 15.8, condition: "cloudy" },
    events: [{ name: "할로윈", type: "local", date: "10/31" }] },
  { month: "2023-11", label: "23/11", total_amount: 27400000, total_quantity: 6800,
    weather: { avgTemp: 8.2,  condition: "cloudy" },
    events: [{ name: "수능", type: "school", date: "11/16" }] },
  { month: "2023-12", label: "23/12", total_amount: 31200000, total_quantity: 7500,
    weather: { avgTemp: 1.5,  condition: "snowy"  },
    events: [{ name: "크리스마스", type: "holiday", date: "12/25" }, { name: "연말 행사", type: "local" }] },
  { month: "2024-01", label: "24/01", total_amount: 28900000, total_quantity: 7100,
    weather: { avgTemp: -2.1, condition: "snowy"  },
    events: [{ name: "신정", type: "holiday", date: "1/1" }, { name: "설날", type: "holiday", date: "2/10" }] },
  { month: "2024-02", label: "24/02", total_amount: 26500000, total_quantity: 6600,
    weather: { avgTemp: 3.8,  condition: "cloudy" },
    events: [{ name: "졸업식", type: "school" }] },
  { month: "2024-03", label: "24/03", total_amount: 28456000, total_quantity: 6900,
    weather: { avgTemp: 10.5, condition: "sunny"  },
    events: [{ name: "삼일절", type: "holiday", date: "3/1" }, { name: "입학", type: "school", date: "3/4" }] },
];

// TODO: GET /api/analysis/weekly (+ weather/events/products/categories 병합)
const mockWeeklyData: WeeklyWithMeta[] = [
  {
    week: "2025-W51", label: "12/15~21", total_amount: 7200000, total_quantity: 1850,
    weather: { avgTemp: 2.1,  condition: "cloudy" }, events: [],
    topProducts: [
      { product_name: "신라면 멀티팩",     total_amount: 420000, total_quantity: 105 },
      { product_name: "코카콜라 500ml",    total_amount: 380000, total_quantity: 211 },
      { product_name: "삼각김밥 참치마요", total_amount: 310000, total_quantity: 258 },
      { product_name: "바나나맛 우유",     total_amount: 290000, total_quantity: 193 },
      { product_name: "컵라면 육개장",     total_amount: 260000, total_quantity: 216 },
    ],
    categoryStats: makeCategoryStats(7200000),
  },
  {
    week: "2025-W52", label: "12/22~28", total_amount: 9200000, total_quantity: 2300,
    weather: { avgTemp: 0.8, condition: "snowy" },
    events: [{ name: "크리스마스", type: "holiday", date: "12/25" }],
    topProducts: [
      { product_name: "코카콜라 500ml",   total_amount: 520000, total_quantity: 289 },
      { product_name: "CU 도시락 불고기", total_amount: 450000, total_quantity: 100 },
      { product_name: "신라면 멀티팩",    total_amount: 390000, total_quantity: 97  },
      { product_name: "빼빼로 초코",      total_amount: 320000, total_quantity: 213 },
      { product_name: "아메리카노 ICE",   total_amount: 280000, total_quantity: 187 },
    ],
    categoryStats: makeCategoryStats(9200000),
  },
  {
    week: "2026-W01", label: "12/29~1/4", total_amount: 8800000, total_quantity: 2200,
    weather: { avgTemp: -1.2, condition: "snowy" },
    events: [{ name: "신정", type: "holiday", date: "1/1" }],
    topProducts: [
      { product_name: "신라면 멀티팩",    total_amount: 480000, total_quantity: 120 },
      { product_name: "코카콜라 500ml",   total_amount: 420000, total_quantity: 233 },
      { product_name: "삼다수 2L",        total_amount: 350000, total_quantity: 291 },
      { product_name: "바나나맛 우유",    total_amount: 310000, total_quantity: 207 },
      { product_name: "컵라면 육개장",    total_amount: 290000, total_quantity: 241 },
    ],
    categoryStats: makeCategoryStats(8800000),
  },
  {
    week: "2026-W02", label: "1/5~11", total_amount: 7100000, total_quantity: 1780,
    weather: { avgTemp: -0.5, condition: "sunny" }, events: [],
    topProducts: [
      { product_name: "코카콜라 500ml",    total_amount: 390000, total_quantity: 217 },
      { product_name: "신라면 멀티팩",     total_amount: 360000, total_quantity: 90  },
      { product_name: "삼각김밥 참치마요", total_amount: 300000, total_quantity: 250 },
      { product_name: "아메리카노 ICE",    total_amount: 280000, total_quantity: 187 },
      { product_name: "바나나맛 우유",     total_amount: 260000, total_quantity: 173 },
    ],
    categoryStats: makeCategoryStats(7100000),
  },
  {
    week: "2026-W03", label: "1/12~18", total_amount: 7400000, total_quantity: 1900,
    weather: { avgTemp: 1.2, condition: "cloudy" }, events: [],
    topProducts: [
      { product_name: "신라면 멀티팩",     total_amount: 410000, total_quantity: 102 },
      { product_name: "코카콜라 500ml",    total_amount: 370000, total_quantity: 206 },
      { product_name: "CU 도시락 불고기",  total_amount: 330000, total_quantity: 73  },
      { product_name: "삼각김밥 참치마요", total_amount: 295000, total_quantity: 246 },
      { product_name: "포카칩 오리지널",   total_amount: 260000, total_quantity: 130 },
    ],
    categoryStats: makeCategoryStats(7400000),
  },
  {
    week: "2026-W04", label: "1/19~25", total_amount: 8500000, total_quantity: 2150,
    weather: { avgTemp: -3.5, condition: "snowy" },
    events: [{ name: "설날 연휴", type: "holiday", date: "1/28" }],
    topProducts: [
      { product_name: "코카콜라 500ml",   total_amount: 450000, total_quantity: 250 },
      { product_name: "신라면 멀티팩",    total_amount: 440000, total_quantity: 110 },
      { product_name: "삼다수 2L",        total_amount: 380000, total_quantity: 317 },
      { product_name: "바나나맛 우유",    total_amount: 320000, total_quantity: 213 },
      { product_name: "빼빼로 초코",      total_amount: 290000, total_quantity: 193 },
    ],
    categoryStats: makeCategoryStats(8500000),
  },
  {
    week: "2026-W05", label: "1/26~2/1", total_amount: 7900000, total_quantity: 1980,
    weather: { avgTemp: -1.8, condition: "sunny" },
    events: [{ name: "설날", type: "holiday", date: "1/29" }],
    topProducts: [
      { product_name: "신라면 멀티팩",     total_amount: 430000, total_quantity: 107 },
      { product_name: "코카콜라 500ml",    total_amount: 400000, total_quantity: 222 },
      { product_name: "CU 도시락 불고기",  total_amount: 355000, total_quantity: 79  },
      { product_name: "삼각김밥 참치마요", total_amount: 310000, total_quantity: 258 },
      { product_name: "아메리카노 ICE",    total_amount: 270000, total_quantity: 180 },
    ],
    categoryStats: makeCategoryStats(7900000),
  },
  {
    week: "2026-W06", label: "2/2~8", total_amount: 7300000, total_quantity: 1860,
    weather: { avgTemp: 2.5, condition: "cloudy" }, events: [],
    topProducts: [
      { product_name: "코카콜라 500ml",    total_amount: 385000, total_quantity: 214 },
      { product_name: "신라면 멀티팩",     total_amount: 360000, total_quantity: 90  },
      { product_name: "바나나맛 우유",     total_amount: 315000, total_quantity: 210 },
      { product_name: "삼각김밥 참치마요", total_amount: 290000, total_quantity: 242 },
      { product_name: "포카칩 오리지널",   total_amount: 255000, total_quantity: 127 },
    ],
    categoryStats: makeCategoryStats(7300000),
  },
  {
    week: "2026-W07", label: "2/9~15", total_amount: 7600000, total_quantity: 1950,
    weather: { avgTemp: 4.8, condition: "sunny" }, events: [],
    topProducts: [
      { product_name: "신라면 멀티팩",    total_amount: 400000, total_quantity: 100 },
      { product_name: "코카콜라 500ml",   total_amount: 395000, total_quantity: 219 },
      { product_name: "아메리카노 ICE",   total_amount: 345000, total_quantity: 230 },
      { product_name: "CU 도시락 불고기", total_amount: 315000, total_quantity: 70  },
      { product_name: "삼다수 2L",        total_amount: 280000, total_quantity: 233 },
    ],
    categoryStats: makeCategoryStats(7600000),
  },
  {
    week: "2026-W08", label: "2/16~22", total_amount: 8100000, total_quantity: 2050,
    weather: { avgTemp: 6.2, condition: "rainy", precipitation: 3.2 }, events: [],
    topProducts: [
      { product_name: "코카콜라 500ml",    total_amount: 420000, total_quantity: 233 },
      { product_name: "신라면 멀티팩",     total_amount: 410000, total_quantity: 102 },
      { product_name: "삼각김밥 참치마요", total_amount: 355000, total_quantity: 296 },
      { product_name: "바나나맛 우유",     total_amount: 325000, total_quantity: 217 },
      { product_name: "컵라면 육개장",     total_amount: 290000, total_quantity: 241 },
    ],
    categoryStats: makeCategoryStats(8100000),
  },
  {
    week: "2026-W09", label: "2/23~3/1", total_amount: 7700000, total_quantity: 1960,
    weather: { avgTemp: 7.8, condition: "cloudy" },
    events: [{ name: "삼일절", type: "holiday", date: "3/1" }],
    topProducts: [
      { product_name: "신라면 멀티팩",     total_amount: 415000, total_quantity: 103 },
      { product_name: "코카콜라 500ml",    total_amount: 400000, total_quantity: 222 },
      { product_name: "아메리카노 ICE",    total_amount: 355000, total_quantity: 237 },
      { product_name: "CU 도시락 불고기",  total_amount: 320000, total_quantity: 71  },
      { product_name: "삼각김밥 참치마요", total_amount: 285000, total_quantity: 237 },
    ],
    categoryStats: makeCategoryStats(7700000),
  },
  {
    week: "2026-W10", label: "3/2~8", total_amount: 7500000, total_quantity: 1900,
    weather: { avgTemp: 9.5, condition: "sunny" },
    events: [{ name: "개학", type: "school", date: "3/3" }],
    topProducts: [
      { product_name: "코카콜라 500ml",    total_amount: 430000, total_quantity: 239 },
      { product_name: "신라면 멀티팩",     total_amount: 420000, total_quantity: 105 },
      { product_name: "삼각김밥 참치마요", total_amount: 380000, total_quantity: 317 },
      { product_name: "아메리카노 ICE",    total_amount: 335000, total_quantity: 223 },
      { product_name: "바나나맛 우유",     total_amount: 290000, total_quantity: 193 },
    ],
    categoryStats: makeCategoryStats(7500000),
  },
];

// TODO: GET /api/analysis/hourly?date= + /api/events?date= + /api/analysis/category?date=
const mockDailyMeta: Record<string, DailyMeta> = {
  "2026-03-15": {
    date: "2026-03-15",
    weather: { avgTemp: 11.2, condition: "sunny" },
    events: [{ name: "화이트데이", type: "local", date: "3/14" }],
    categoryStats: makeCategoryStats(1284500),
    topProducts: [
      { product_name: "코카콜라 500ml",    category: "음료",          total_amount: 43200,  total_quantity: 24 },
      { product_name: "삼각김밥 참치마요", category: "도시락/간편식", total_amount: 37200,  total_quantity: 31 },
      { product_name: "아메리카노 ICE",    category: "음료",          total_amount: 34500,  total_quantity: 23 },
      { product_name: "신라면 컵",         category: "식품",          total_amount: 31500,  total_quantity: 21 },
      { product_name: "바나나맛 우유",     category: "유제품",        total_amount: 28500,  total_quantity: 19 },
      { product_name: "CU 도시락 불고기",  category: "도시락/간편식", total_amount: 27000,  total_quantity: 6  },
      { product_name: "포카칩 오리지널",   category: "과자/스낵",     total_amount: 22000,  total_quantity: 11 },
    ],
  },
  "2026-03-14": {
    date: "2026-03-14",
    weather: { avgTemp: 9.8, condition: "cloudy" },
    events: [],
    categoryStats: makeCategoryStats(1186000),
    topProducts: [
      { product_name: "신라면 컵",         category: "식품",          total_amount: 40500,  total_quantity: 27 },
      { product_name: "코카콜라 500ml",    category: "음료",          total_amount: 36000,  total_quantity: 20 },
      { product_name: "CU 도시락 불고기",  category: "도시락/간편식", total_amount: 31500,  total_quantity: 7  },
      { product_name: "아메리카노 ICE",    category: "음료",          total_amount: 30000,  total_quantity: 20 },
      { product_name: "바나나맛 우유",     category: "유제품",        total_amount: 25500,  total_quantity: 17 },
    ],
  },
};

const mockHourlyByDate: Record<string, HourlySales[]> = {
  // TODO: GET /api/analysis/hourly?date=YYYY-MM-DD (temp 필드는 기상청 시간별 API)
  "2026-03-15": [
    { hour: "06", total_amount: 45000,  total_quantity: 12, temp: 7.2  },
    { hour: "07", total_amount: 125000, total_quantity: 38, temp: 8.1  },
    { hour: "08", total_amount: 185000, total_quantity: 56, temp: 9.3  },
    { hour: "09", total_amount: 145000, total_quantity: 44, temp: 10.5 },
    { hour: "10", total_amount: 92000,  total_quantity: 28, temp: 11.8 },
    { hour: "11", total_amount: 110000, total_quantity: 33, temp: 12.9 },
    { hour: "12", total_amount: 210000, total_quantity: 65, temp: 13.6 },
    { hour: "13", total_amount: 175000, total_quantity: 54, temp: 14.2 },
    { hour: "14", total_amount: 88000,  total_quantity: 27, temp: 14.8 },
    { hour: "15", total_amount: 95000,  total_quantity: 29, temp: 14.5 },
    { hour: "16", total_amount: 125000, total_quantity: 38, temp: 13.9 },
    { hour: "17", total_amount: 165000, total_quantity: 50, temp: 12.7 },
    { hour: "18", total_amount: 225000, total_quantity: 68, temp: 11.4 },
    { hour: "19", total_amount: 195000, total_quantity: 59, temp: 10.2 },
    { hour: "20", total_amount: 145000, total_quantity: 44, temp: 9.1  },
    { hour: "21", total_amount: 85000,  total_quantity: 26, temp: 8.5  },
    { hour: "22", total_amount: 55000,  total_quantity: 17, temp: 8.0  },
    { hour: "23", total_amount: 25000,  total_quantity: 8,  temp: 7.6  },
  ],
  "2026-03-14": [
    { hour: "06", total_amount: 38000,  total_quantity: 10, temp: 5.8  },
    { hour: "07", total_amount: 112000, total_quantity: 34, temp: 6.5  },
    { hour: "08", total_amount: 170000, total_quantity: 52, temp: 7.8  },
    { hour: "09", total_amount: 135000, total_quantity: 41, temp: 9.0  },
    { hour: "10", total_amount: 85000,  total_quantity: 26, temp: 10.2 },
    { hour: "11", total_amount: 105000, total_quantity: 32, temp: 11.4 },
    { hour: "12", total_amount: 195000, total_quantity: 60, temp: 12.1 },
    { hour: "13", total_amount: 162000, total_quantity: 49, temp: 12.8 },
    { hour: "14", total_amount: 80000,  total_quantity: 24, temp: 13.2 },
    { hour: "15", total_amount: 90000,  total_quantity: 27, temp: 13.0 },
    { hour: "16", total_amount: 118000, total_quantity: 36, temp: 12.2 },
    { hour: "17", total_amount: 155000, total_quantity: 47, temp: 11.1 },
    { hour: "18", total_amount: 218000, total_quantity: 66, temp: 9.8  },
    { hour: "19", total_amount: 185000, total_quantity: 56, temp: 8.9  },
    { hour: "20", total_amount: 138000, total_quantity: 42, temp: 8.2  },
    { hour: "21", total_amount: 78000,  total_quantity: 24, temp: 7.5  },
    { hour: "22", total_amount: 48000,  total_quantity: 15, temp: 7.0  },
    { hour: "23", total_amount: 22000,  total_quantity: 7,  temp: 6.6  },
  ],
};

const defaultHourly: HourlySales[] = [
  { hour: "06", total_amount: 40000,  total_quantity: 11, temp: 6.5  },
  { hour: "07", total_amount: 108000, total_quantity: 33, temp: 7.3  },
  { hour: "08", total_amount: 162000, total_quantity: 49, temp: 8.6  },
  { hour: "09", total_amount: 128000, total_quantity: 39, temp: 9.8  },
  { hour: "10", total_amount: 82000,  total_quantity: 25, temp: 11.0 },
  { hour: "11", total_amount: 100000, total_quantity: 30, temp: 12.2 },
  { hour: "12", total_amount: 192000, total_quantity: 58, temp: 13.0 },
  { hour: "13", total_amount: 158000, total_quantity: 48, temp: 13.5 },
  { hour: "14", total_amount: 78000,  total_quantity: 24, temp: 13.8 },
  { hour: "15", total_amount: 88000,  total_quantity: 27, temp: 13.4 },
  { hour: "16", total_amount: 112000, total_quantity: 34, temp: 12.6 },
  { hour: "17", total_amount: 152000, total_quantity: 46, temp: 11.5 },
  { hour: "18", total_amount: 208000, total_quantity: 63, temp: 10.3 },
  { hour: "19", total_amount: 178000, total_quantity: 54, temp: 9.4  },
  { hour: "20", total_amount: 132000, total_quantity: 40, temp: 8.7  },
  { hour: "21", total_amount: 75000,  total_quantity: 23, temp: 8.1  },
  { hour: "22", total_amount: 46000,  total_quantity: 14, temp: 7.6  },
  { hour: "23", total_amount: 20000,  total_quantity: 6,  temp: 7.2  },
];

// ─────────────────────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────────────────────

// 날씨 뱃지
function WeatherBadge({ condition, avgTemp }: { condition: keyof typeof WEATHER_CONFIG; avgTemp: number }) {
  const wc = WEATHER_CONFIG[condition];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${wc.bg} ${wc.text}`}>
      {wc.icon} {wc.label} {avgTemp}°C
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
            {meta.weather.avgTemp}°C
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
            {meta.weather.avgTemp}°C
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
      <p className={`mb-1 ${wc.text}`}>{wc.icon} {wc.label} {meta.weather.avgTemp}°C</p>
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
      <p className={`mb-1 ${wc.text}`}>{wc.icon} {wc.label} {meta.weather.avgTemp}°C</p>
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
  const [activeTab, setActiveTab]       = useState<AnalysisTab>("monthly");
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(mockMonthlyData.length - 1);
  const [selectedWeekIdx,  setSelectedWeekIdx]  = useState(mockWeeklyData.length - 1);
  const [selectedDate, setSelectedDate] = useState("2026-03-15");

  // monthly lookup map
  const monthMetaMap = Object.fromEntries(mockMonthlyData.map(m => [m.label, m]));
  const weekMetaMap  = Object.fromEntries(mockWeeklyData.map(w => [w.label, w]));

  const hourlyData  = mockHourlyByDate[selectedDate] ?? defaultHourly;
  const dailyMeta   = mockDailyMeta[selectedDate];
  const dayTotal    = hourlyData.reduce((s, h) => s + h.total_amount, 0);

  const MonthBarShape = makeBarShape(
    Object.fromEntries(mockMonthlyData.map(m => [m.label, m]))
  );
  const WeekBarShape = makeBarShape(
    Object.fromEntries(mockWeeklyData.map(w => [w.label, w]))
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
        const selectedMonth = mockMonthlyData[selectedMonthIdx];
        const monthTopProducts = MONTHLY_TOP_PRODUCTS[selectedMonth.month] ?? MONTHLY_TOP_PRODUCTS.default;
        const monthCategoryStats = makeCategoryStats(selectedMonth.total_amount);
        const chartData = mockMonthlyData.map(m => ({
          label: m.label, total_amount: m.total_amount,
        }));

        return (
          <div className="space-y-6">
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
                  <BarChart
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
                    <Tooltip content={<MonthlyTooltip metaList={mockMonthlyData} />} />
                    <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={50} shape={MonthBarShape}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={idx === selectedMonthIdx ? "#1d4ed8" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {/* Category Stats */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">카테고리별 매출</h4>
                  <div className="space-y-2.5">
                    {monthCategoryStats.map((cs, idx) => (
                      <div key={cs.category} className="flex items-center gap-3">
                        <span className="w-20 shrink-0 text-xs text-gray-500">{cs.category}</span>
                        <div className="flex-1">
                          <div className="h-2 w-full rounded-full bg-gray-100">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${cs.percentage}%`,
                                backgroundColor: COLORS[idx % COLORS.length],
                              }}
                            />
                          </div>
                        </div>
                        <span className="w-16 shrink-0 text-right text-xs font-medium text-gray-700">
                          {cs.percentage}%
                        </span>
                        <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                          {cs.total_amount.toLocaleString()}원
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">상위 상품</h4>
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
                          <td className="py-2 pr-2">{p.product_name}</td>
                          <td className="py-2 pr-2">
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-600">{p.category}</span>
                          </td>
                          <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 주별 탭 ── */}
      {activeTab === "weekly" && (() => {
        const selectedWeek = mockWeeklyData[selectedWeekIdx];
        const chartData = mockWeeklyData.map(w => ({ label: w.label, total_amount: w.total_amount }));

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
                  <BarChart
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
                    <Tooltip content={<WeeklyTooltip metaList={mockWeeklyData} />} />
                    <Bar dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={50} shape={WeekBarShape}>
                      {chartData.map((_, idx) => (
                        <Cell key={idx} fill={idx === selectedWeekIdx ? "#1d4ed8" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
                              style={{ width: `${cs.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                          </div>
                        </div>
                        <span className="w-20 shrink-0 text-right text-xs font-medium text-gray-700">
                          {cs.total_amount.toLocaleString()}원
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700">상품별 매출 순위</h4>
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
                          <td className="py-2 pr-2">{p.product_name}</td>
                          <td className="py-2 pr-2 text-right">{p.total_quantity}개</td>
                          <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
              {dailyMeta ? (
                <>
                  <WeatherBadge condition={dailyMeta.weather.condition} avgTemp={dailyMeta.weather.avgTemp} />
                  {dailyMeta.events.map((ev, i) => (
                    <EventBadge key={i} name={ev.name} type={ev.type} date={ev.date} />
                  ))}
                </>
              ) : (
                <span className="text-xs text-gray-400">날씨·이벤트 정보 없음</span>
              )}
              <div className="ml-auto text-right">
                <p className="text-xs text-gray-500">일 매출</p>
                <p className="text-lg font-bold text-gray-800">{dayTotal.toLocaleString()}원</p>
              </div>
            </div>
          </div>

          {/* Hourly Chart */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-base font-semibold text-gray-800">시간별 매출 ({selectedDate})</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={hourlyData.map((h) => ({ ...h, label: `${h.hour}시` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} />
                  {/* 왼쪽 Y축: 매출 */}
                  <YAxis
                    yAxisId="sales"
                    orientation="left"
                    tickFormatter={formatAmount}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* 오른쪽 Y축: 기온 */}
                  <YAxis
                    yAxisId="temp"
                    orientation="right"
                    tickFormatter={(v) => `${v}°`}
                    tick={{ fontSize: 11, fill: "#f97316" }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                    width={36}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => {
                      if (name === "total_amount") return [`${Number(v).toLocaleString()}원`, "매출액"];
                      if (name === "temp") return [`${v}°C`, "기온"];
                      return [v, name];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={28}
                    formatter={(value) => (
                      <span className="text-xs text-gray-500">
                        {value === "total_amount" ? "매출액" : value === "temp" ? "기온" : value}
                      </span>
                    )}
                  />
                  <Bar yAxisId="sales" dataKey="total_amount" radius={[4, 4, 0, 0]} maxBarSize={38} name="total_amount">
                    {hourlyData.map((h, idx) => (
                      <Cell key={idx} fill={["07","08","12","18","19"].includes(h.hour) ? "#1d4ed8" : "#3b82f6"} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="temp"
                    type="monotone"
                    dataKey="temp"
                    name="temp"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-800" /> 피크 시간대</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400" /> 일반 시간대</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-orange-400 rounded" /> 기온</span>
            </div>
          </div>

          {/* Daily Category + Products */}
          {dailyMeta && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Category */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="mb-4 text-base font-semibold text-gray-800">카테고리별 매출</h3>
                <div className="space-y-2.5">
                  {dailyMeta.categoryStats.map((cs, idx) => (
                    <div key={cs.category} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs text-gray-500">{cs.category}</span>
                      <div className="flex-1">
                        <div className="h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${cs.percentage}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                        </div>
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-medium text-gray-700">{cs.percentage}%</span>
                      <span className="w-20 shrink-0 text-right text-xs text-gray-500">{cs.total_amount.toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Products */}
              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <h3 className="mb-4 text-base font-semibold text-gray-800">오늘 상품별 매출</h3>
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
                        <td className="py-2 pr-2">{p.product_name}</td>
                        <td className="py-2 pr-2">
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-600">{p.category}</span>
                        </td>
                        <td className="py-2 pr-2 text-right">{p.total_quantity}개</td>
                        <td className="py-2 text-right font-medium">{p.total_amount.toLocaleString()}원</td>
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
  );
}
