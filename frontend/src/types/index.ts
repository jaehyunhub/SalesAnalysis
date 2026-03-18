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
  product_id: number;
  user_id: number;
  product_name: string;
  category: string;
  sale_date: string;
  sale_time: string | null;
  quantity: number;
  total_amount: number;
  created_at: string;
  product?: {
    id: number;
    name: string;
    category: string;
    barcode?: string;
    cost_price?: number;
    selling_price?: number;
  };
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
  name: string;
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

// OCR 관련 타입
export interface OCRRow {
  product_name: string;
  quantity: number;
  amount: number;
}

export interface OCRResult {
  sale_date: string | null;
  sale_time: string | null;
  rows: OCRRow[];
  raw_text: string;
  confidence: number;
}

export interface OCRConfirmRequest {
  sale_date: string;
  sale_time?: string;
  rows: OCRRow[];
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
  category?: string;
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

// 행사 이익율 계산
export interface PromotionCalculateRequest {
  product_name: string;
  promotion_name?: string;
  cost_price: number;
  sale_price: number;
  expected_qty: number;
  waste_rate?: number;
}

export interface ComparisonResult {
  label: string;
  expected_qty: number;
  total_revenue: number;
  total_cost: number;
  waste_cost: number;
  net_profit: number;
  profit_rate: number;
}

export interface PromotionCalculateResponse {
  joined: ComparisonResult;
  not_joined: ComparisonResult;
  recommendation: string;
  break_even_qty: number;
}

export interface PromotionCreate {
  product_name: string;
  promotion_name: string;
  start_date: string;
  end_date: string;
  cost_price: number;
  sale_price: number;
  expected_qty: number;
  waste_rate?: number;
  joined?: boolean;
}

export interface PromotionItem {
  id: number;
  user_id: number;
  product_name: string;
  promotion_name: string;
  start_date: string;
  end_date: string;
  cost_price: number;
  sale_price: number;
  expected_qty: number;
  waste_rate: number;
  joined: boolean;
  actual_qty?: number;
  actual_profit_rate?: number;
  created_at: string;
}

export interface PromotionHistoryResponse {
  items: PromotionItem[];
  total: number;
}

// 수요 예측
export interface PredictionItem {
  date: string;
  predicted_quantity: number;
}

export interface PredictionResponse {
  product_id: number;
  product_name: string;
  predictions: PredictionItem[];
  avg_7day: number;
  avg_30day: number;
}

// 폐기 위험
export interface WasteRiskItem {
  product_id: number;
  product_name: string;
  category: string;
  recent_7day_qty: number;
  avg_30day_qty: number;
  decline_rate: number;
  risk_level: string;
}

export interface WasteRiskResponse {
  items: WasteRiskItem[];
  total: number;
}

// 발주 추천
export interface ReorderItem {
  product_id: number;
  product_name: string;
  category: string;
  recent_7day_qty: number;
  avg_daily_qty: number;
  predicted_7day_qty: number;
  recommended_order_qty: number;
}

export interface ReorderResponse {
  items: ReorderItem[];
  total: number;
  generated_at: string;
}

// 점포 적합성
export interface SimilarProduct {
  product_id: number;
  product_name: string;
  category: string;
  avg_daily_qty: number;
  total_30day_qty: number;
}

export interface StoreSuitabilityResponse {
  product_name: string;
  similar_products: SimilarProduct[];
  estimated_daily_qty: number;
  suitability_score: number;
  recommendation: string;
}
