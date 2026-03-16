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

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
};

export default api;
