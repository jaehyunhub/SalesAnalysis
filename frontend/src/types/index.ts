export type DashboardPeriod = "daily" | "weekly" | "monthly";

export interface User {
  id: number;
  email: string;
  store_name: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: string;
  cost_price: number;
  selling_price: number;
}

export interface SalesRecord {
  id: number;
  product_name: string;
  category: string;
  sale_date: string;
  sale_time: string;
  quantity: number;
  total_amount: number;
}

export interface DailySales {
  date: string;
  total_amount: number;
  total_quantity: number;
}

export interface WeeklySales {
  week: string;
  label: string;
  total_amount: number;
  total_quantity: number;
}

export interface MonthlySales {
  month: string;
  total_amount: number;
  total_quantity: number;
}

export interface HourlySales {
  hour: string;
  total_amount: number;
  total_quantity: number;
}

export interface CategorySales {
  category: string;
  total_amount: number;
  percentage: number;
}

export interface TopProduct {
  product_name: string;
  total_amount: number;
  total_quantity: number;
}

// 날씨 정보 (추후 기상청 API로 교체)
export interface WeatherInfo {
  avgTemp: number;
  condition: "sunny" | "cloudy" | "rainy" | "snowy";
  precipitation?: number;
}

// 이벤트/환경변수 정보 (추후 공공API + 수동입력으로 교체)
export interface EventInfo {
  name: string;
  type: "holiday" | "school" | "local" | "other";
  date?: string;
}

// 날씨·이벤트 메타 포함 월별 데이터
export interface MonthlyWithMeta extends MonthlySales {
  label: string;
  weather: WeatherInfo;
  events: EventInfo[];
}

// 날씨·이벤트·상품순위 메타 포함 주별 데이터
export interface WeeklyWithMeta extends WeeklySales {
  weather: WeatherInfo;
  events: EventInfo[];
  topProducts: TopProduct[];
  categoryStats: CategorySales[];
}

// 일별 날씨·이벤트·상품 메타 데이터
export interface DailyMeta {
  date: string;
  weather: WeatherInfo;
  events: EventInfo[];
  topProducts: Array<TopProduct & { category: string }>;
  categoryStats: CategorySales[];
}

export interface UploadHistory {
  id: number;
  file_name: string;
  file_type: string;
  record_count: number;
  status: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  store_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SalesQuery {
  start_date?: string;
  end_date?: string;
  page?: number;
  size?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
