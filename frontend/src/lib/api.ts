import axios from "axios";
import { getToken, clearAuth } from "./auth";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SalesRecord,
  CategorySales,
  TopProduct,
  UploadHistory,
  SalesQuery,
  OCRResult,
  OCRConfirmRequest,
  PromotionCalculateRequest,
  PromotionCalculateResponse,
  PromotionCreate,
  PromotionItem,
  PromotionHistoryResponse,
  PredictionResponse,
  WasteRiskResponse,
  ReorderResponse,
  StoreSuitabilityResponse,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (auth 엔드포인트 제외)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthEndpoint = url.includes("/api/auth/login") || url.includes("/api/auth/register");
    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authApi = {
  login: (data: LoginRequest) =>
    api.post<AuthResponse>("/api/auth/login", data),

  register: (data: RegisterRequest) =>
    api.post<AuthResponse>("/api/auth/register", data),

  me: () => api.get("/api/auth/me"),
};

// Sales APIs (목록 조회)
export const salesApi = {
  getRecords: (params: SalesQuery) =>
    api.get<{ items: SalesRecord[]; total: number; page: number; size: number }>(
      "/api/sales",
      { params }
    ),
};

// Analysis APIs
export const analysisApi = {
  getSummary: () =>
    api.get<{ today_amount: number; yesterday_amount: number; this_month_amount: number; total_products: number }>(
      "/api/analysis/summary"
    ),

  getDaily: (startDate?: string, endDate?: string) =>
    api.get<Array<{ date: string; total_amount: number; total_quantity: number }>>(
      "/api/analysis/daily",
      { params: { start_date: startDate, end_date: endDate } }
    ),

  getMonthly: (year?: number) =>
    api.get<Array<{ year: number; month: number; total_amount: number; total_quantity: number }>>(
      "/api/analysis/monthly",
      { params: { year } }
    ),

  getCategory: (startDate?: string, endDate?: string) =>
    api.get<CategorySales[]>(
      "/api/analysis/category",
      { params: { start_date: startDate, end_date: endDate } }
    ),

  getTopProducts: (topN = 10, startDate?: string, endDate?: string) =>
    api.get<TopProduct[]>(
      "/api/analysis/products",
      { params: { top_n: topN, start_date: startDate, end_date: endDate } }
    ),

  getHourly: (date: string) =>
    api.get<Array<{ hour: number; total_amount: number; total_quantity: number }>>(
      "/api/analysis/hourly",
      { params: { date } }
    ),

  getHourlyAvg: (startDate?: string, endDate?: string) =>
    api.get<Array<{ hour: number; total_amount: number; total_quantity: number }>>(
      "/api/analysis/hourly-avg",
      { params: { start_date: startDate, end_date: endDate } }
    ),

  getPredict: (productId: number, days?: number) =>
    api.get<PredictionResponse>("/api/analysis/predict", {
      params: { product_id: productId, days },
    }),

  getWasteRisk: () =>
    api.get<WasteRiskResponse>("/api/analysis/waste-risk"),

  getReorderRecommendation: () =>
    api.get<ReorderResponse>("/api/analysis/reorder-recommendation").then((res) => res.data),
};

// Upload APIs
export const uploadApi = {
  uploadFile: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ upload_id: number; file_name: string; status: string; record_count: number; message: string }>(
      "/api/upload/file",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (event) => {
          if (event.total && onProgress) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      }
    );
  },

  getHistory: () =>
    api.get<{ items: UploadHistory[]; total: number }>("/api/upload/history"),

  uploadScreenshot: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<OCRResult>("/api/upload/screenshot", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  confirmScreenshot: (data: OCRConfirmRequest) =>
    api.post<{ upload_id: number; record_count: number; message: string }>(
      "/api/upload/screenshot/confirm",
      data
    ),
};

// Weather APIs
export const weatherApi = {
  getDaily: (date: string) =>
    api.get<{ id: number; date: string; avg_temp: number | null; condition: string | null; precipitation: number | null }>(
      "/api/weather/daily",
      { params: { date } }
    ),

  getRange: (startDate: string, endDate: string) =>
    api.get<Array<{ id: number; date: string; avg_temp: number | null; condition: string | null; precipitation: number | null }>>(
      "/api/weather/range",
      { params: { start_date: startDate, end_date: endDate } }
    ),
};

// Events APIs
export const eventsApi = {
  getAll: () =>
    api.get<Array<{ id: number; user_id: number; event_date: string; event_type: string; description: string; created_at: string }>>(
      "/api/events"
    ),

  create: (data: { event_date: string; event_type: string; description: string }) =>
    api.post<{ id: number; user_id: number; event_date: string; event_type: string; description: string; created_at: string }>(
      "/api/events",
      data
    ),

  delete: (id: number) =>
    api.delete(`/api/events/${id}`),

  syncHolidays: (year: number) =>
    api.post<{ synced_count: number; message: string }>(
      "/api/events/sync-holidays",
      null,
      { params: { year } }
    ),
};

// Promotion APIs
export const promotionApi = {
  calculate: (data: PromotionCalculateRequest) =>
    api.post<PromotionCalculateResponse>("/api/promotion/calculate", data).then((res) => res.data),

  getHistory: () =>
    api.get<PromotionHistoryResponse>("/api/promotion/history").then((res) => res.data),

  create: (data: PromotionCreate) =>
    api.post<PromotionItem>("/api/promotion", data).then((res) => res.data),

  update: (id: number, data: { actual_qty?: number; actual_profit_rate?: number }) =>
    api.put<PromotionItem>(`/api/promotion/${id}`, data).then((res) => res.data),

  delete: (id: number) =>
    api.delete(`/api/promotion/${id}`).then((res) => res.data),

  getSuitability: (productName: string) =>
    api.get<StoreSuitabilityResponse>("/api/promotion/suitability", { params: { product_name: productName } }).then((res) => res.data),
};

export default api;
