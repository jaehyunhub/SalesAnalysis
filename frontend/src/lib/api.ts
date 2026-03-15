import axios from "axios";
import { getToken, clearAuth } from "./auth";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  SalesRecord,
  DailySales,
  MonthlySales,
  CategorySales,
  TopProduct,
  UploadHistory,
  PaginatedResponse,
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

// Sales APIs
export const salesApi = {
  getRecords: (params: SalesQuery) =>
    api.get<PaginatedResponse<SalesRecord>>("/api/sales", { params }),

  getDailySales: (days?: number) =>
    api.get<DailySales[]>("/api/sales/daily", { params: { days } }),

  getMonthlySales: (months?: number) =>
    api.get<MonthlySales[]>("/api/sales/monthly", { params: { months } }),

  getCategorySales: () =>
    api.get<CategorySales[]>("/api/sales/categories"),

  getTopProducts: (limit?: number) =>
    api.get<TopProduct[]>("/api/sales/top-products", { params: { limit } }),

  getSummary: () =>
    api.get("/api/sales/summary"),
};

// Upload APIs
export const uploadApi = {
  uploadFile: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    });
  },

  getHistory: () =>
    api.get<UploadHistory[]>("/api/upload/history"),
};

export default api;
