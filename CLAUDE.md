# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소의 코드를 다룰 때 참고하는 가이드입니다.

## 언어

항상 한국어로 응답할 것.

## 프로젝트 개요

**ConveniSight** — CU 편의점 점주를 위한 매출 분석 웹 플랫폼.
날씨·휴일·이벤트 등 환경 변수와 매출 데이터를 결합하여 폐기율 감소·매출 증대·행사 이익율 극대화를 목표로 한다.

서비스 구성:
- **frontend** — Next.js 15 (React 19, TypeScript, Tailwind CSS v4, Zustand, Recharts)
- **backend** — FastAPI (Python 3.11, SQLAlchemy, Alembic, PostgreSQL, Redis, JWT)

## 명령어

### 프론트엔드 (`frontend/`)
```bash
npm run dev      # 개발 서버 :3000
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 실행
```

### 백엔드 (`backend/`)
```bash
uvicorn app.main:app --reload --port 8000   # 개발 서버 :8000
alembic upgrade head                         # DB 마이그레이션 적용
alembic revision --autogenerate -m "msg"    # 마이그레이션 파일 생성
```

### 인프라
```bash
docker-compose up -d          # 전체 서비스 시작
docker-compose up -d postgres redis   # DB만 실행 (로컬 개발 시)
```

## 아키텍처

### 시스템 구조
```
Next.js Frontend :3000
        ↓
FastAPI Backend :8000
    ├── /api/auth       → 인증 (로그인/회원가입/JWT)
    ├── /api/sales      → 매출 데이터 CRUD + 목록 조회
    ├── /api/upload     → 엑셀/CSV 업로드 (/file), 스크린샷 OCR (/screenshot, /screenshot/confirm), 이력 조회 (/history)
    ├── /api/analysis   → 분석 결과 (daily/monthly/hourly/hourly-avg/category/products/summary/predict/waste-risk)
    ├── /api/events     → 이벤트/환경변수 관리 (GET/POST/DELETE/sync-holidays)
    ├── /api/weather    → 날씨 데이터 (기상청 ASOS API 연동: daily/range/sync)
    └── /api/promotion  → 행사 이익율 계산 (calculate/history/CRUD)
        ↓
PostgreSQL :5432  +  Redis :6379
```

### MCP 서버 (`.mcp.json` 설정됨)
Claude Code에서 직접 DB/인프라 조작 가능. Docker 컨테이너 실행 중일 때 활성화.
- **postgres** — `@modelcontextprotocol/server-postgres` → DB 쿼리, 스키마 탐색
- **redis** — `mcp-server-redis` → 캐시 키 조회/관리
- **docker** — `@docker/mcp-docker` → 컨테이너 상태, 로그 조회

### 프론트엔드 페이지 구조
| 경로 | 페이지 | 상태 |
|------|--------|------|
| `/dashboard` | KPI 요약 카드 + 매출 추이 (일별/주별/월별 탭) + 카테고리 차트 | **실제 API 연동 완료** |
| `/sales` | 매출 내역 테이블 (날짜·카테고리 필터, 매출 총합 요약, 카테고리별 집계) | **실제 API 연동 완료** |
| `/upload` | 엑셀/CSV 업로드 + 스크린샷 OCR (탭 UI) + 이력 테이블 | **실제 API 연동 완료** |
| `/analysis` | 탭: 월별(날씨·이벤트)/주별/일별/시간대별 | **실제 API 연동 완료** |
| `/promotion` | 행사 이익율 계산기 + 참여/미참여 비교 + 폐기 위험 알림 | **실제 API 연동 완료** |
| `/settings` | 점포 정보 + 이벤트 관리 (CRUD + 공휴일 동기화) | **실제 API 연동 완료** |
| `/login` | 로그인 | **실제 API 연동 완료** |
| `/register` | 회원가입 | **실제 API 연동 완료** |

### 백엔드 구조
```
backend/app/
├── main.py               # FastAPI 앱, CORS (localhost:3000), 라우터 등록
│                         # 등록된 라우터: auth, sales, upload, analysis, events, weather, promotion
├── core/
│   ├── config.py         # 환경 설정 (DB URL, JWT, Redis, 업로드 경로, WEATHER_API_KEY, HOLIDAY_API_KEY)
│   ├── database.py       # SQLAlchemy 엔진, SessionLocal, get_db()
│   └── security.py       # JWT 발급/검증, bcrypt, get_current_user() Dependency
├── models/
│   ├── user.py           # User (email, password_hash, store_name, store_address)
│   ├── product.py        # Product (barcode, name, category, cost_price, selling_price)
│   ├── sales.py          # SalesRecord (product_id FK, user_id FK, sale_date, sale_hour, quantity, total_amount)
│   ├── upload.py         # UploadHistory (file_name, file_type, record_count, status)
│   ├── event.py          # Event (user_id FK, event_date, event_type, description)
│   ├── weather.py        # WeatherData (date UNIQUE, avg_temp, condition, precipitation)
│   └── promotion.py      # Promotion (user_id FK, product_name, promotion_name, cost/sale_price, expected_qty, waste_rate, joined, actual_qty/profit_rate)
├── schemas/
│   ├── user.py           # UserCreate, UserLogin, UserResponse, TokenResponse
│   ├── sales.py          # SalesRecordCreate/Response, DailySalesResponse, MonthlySalesResponse,
│   │                     #   CategorySalesResponse, ProductRankResponse, SalesListResponse
│   ├── upload.py         # UploadResultResponse, UploadHistoryResponse, UploadHistoryListResponse,
│   │                     #   OCRRow, OCRResultResponse, OCRConfirmRequest, OCRConfirmResponse
│   ├── event.py          # EventCreate, EventResponse, HolidaySyncResponse
│   ├── weather.py        # WeatherResponse, WeatherSyncRequest, WeatherSyncResponse
│   ├── analysis.py       # DailySales, MonthlySales, HourlySales, CategorySales,
│   │                     #   TopProduct, SummaryResponse, PredictionResponse, WasteRiskResponse
│   └── promotion.py      # PromotionCalculateRequest/Response, ComparisonResult, PromotionCreate/Response, PromotionHistoryResponse
├── routers/
│   ├── auth.py           # POST /api/auth/register, /api/auth/login
│   ├── sales.py          # GET /api/sales (페이지네이션), GET /api/sales/{id}, POST /api/sales
│   ├── upload.py         # POST /api/upload/file, POST /api/upload/screenshot, POST /api/upload/screenshot/confirm, GET /api/upload/history
│   ├── analysis.py       # GET /api/analysis/daily|monthly|hourly|hourly-avg|category|products|summary|predict|waste-risk
│   ├── events.py         # GET/POST/DELETE /api/events, POST /api/events/sync-holidays
│   ├── weather.py        # GET /api/weather/daily|range, POST /api/weather/sync
│   └── promotion.py      # POST /api/promotion/calculate, GET /api/promotion/history, POST/PUT/DELETE /api/promotion
└── services/
    ├── auth.py           # register_user(), authenticate_user()
    ├── upload.py         # process_upload() — CSV/Excel 파싱, 한글 컬럼 매핑, DB 저장
    ├── ocr.py            # process_screenshot() — pytesseract + OpenCV POS 스크린샷 OCR
    ├── analysis.py       # get_daily_sales(), get_monthly_sales(), get_hourly_sales(),
    │                     #   get_hourly_avg_sales(), get_category_sales(), get_product_ranking(), get_summary()
    ├── weather.py        # fetch_daily_weather(), fetch_weather_range(), save_weather_to_db() — 기상청 ASOS API
    ├── holiday.py        # fetch_holidays(), sync_holidays_to_events() — 공공데이터포털 특일정보 API
    └── prediction.py     # predict_demand(), get_waste_risk_products() — 이동 평균 기반 수요 예측
```

### DB 테이블
```
users           → 점주 계정 (email, password_hash, store_name, store_address)
products        → 상품 마스터 (바코드, 이름, 카테고리, 입고가) — user_id 없음, 공유 테이블
sales_records   → 매출 원본 (user_id FK, product_id FK, sale_date, sale_time, quantity, total_amount)
weather_data    → 일별 날씨 (date UNIQUE, avg_temp, condition, precipitation)
events          → 환경 변수 (user_id FK, event_date, event_type, description)
upload_history  → 업로드 이력 (user_id FK, file_name, file_type, record_count, status, error_message)
promotions      → 행사 이력 (user_id FK, product_name, promotion_name, start/end_date, cost/sale_price, expected_qty, waste_rate, joined, actual_qty, actual_profit_rate)
```

> ⚠️ **주의**: `products` 테이블에 `user_id`가 없음. 업로드 시 상품명 기준으로 upsert되며 모든 유저가 공유. Phase 4에서 user별 상품 분리 고려 필요.

## 프론트엔드 코드 컨벤션

### 공통 패턴
- 모든 페이지/컴포넌트 상단에 `"use client"` 선언
- Tailwind CSS만 사용 (인라인 스타일 금지)
- 아이콘: `@heroicons/react/24/outline` 사용
- 차트: `recharts` 사용 (ResponsiveContainer 필수)
- 상태 관리: Zustand (`src/store/`)

### UI 스타일 가이드 (기존 컴포넌트 패턴)
```tsx
// 카드 컨테이너
<div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">

// 섹션 제목
<h3 className="mb-4 text-base font-semibold text-gray-800">

// 텍스트 입력
<input className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />

// 주요 액션 버튼
<button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">

// 보조 버튼
<button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">

// 상태 배지 (완료)
<span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">

// 테이블 헤더
<tr className="border-b border-gray-200 text-gray-500">
// 테이블 행
<tr className="border-b border-gray-100 text-gray-700">
```

### 파일 위치
- 페이지: `src/app/[경로]/page.tsx`
- 레이아웃 컴포넌트: `src/components/layout/`
- 기능별 컴포넌트: `src/components/[기능명]/`
- 공용 컴포넌트: `src/components/common/`
- 타입 정의: `src/types/index.ts`
- API 호출: `src/lib/api.ts` (authApi / salesApi / analysisApi / uploadApi / weatherApi / eventsApi 6개 객체)
- 인증 유틸: `src/lib/auth.ts`

### 새 페이지 추가 시 체크리스트
1. `src/app/[경로]/page.tsx` 생성
2. `src/components/layout/Sidebar.tsx` — `navigation` 배열에 항목 추가
3. `src/components/layout/Header.tsx` — `pageTitles` 객체에 타이틀 추가

## API 클라이언트 구조 (`src/lib/api.ts`)

```typescript
authApi.login(data)              // POST /api/auth/login
authApi.register(data)           // POST /api/auth/register
authApi.me()                     // GET /api/auth/me

salesApi.getRecords(params)      // GET /api/sales (start_date, end_date, category, page, size)

analysisApi.getSummary()         // GET /api/analysis/summary → {today_amount, yesterday_amount, this_month_amount, total_products}
analysisApi.getDaily(start, end) // GET /api/analysis/daily → [{date, total_amount, total_quantity}]
analysisApi.getMonthly(year)     // GET /api/analysis/monthly → [{year, month, total_amount, total_quantity}]
analysisApi.getCategory(s, e)    // GET /api/analysis/category → [{category, total_amount, ratio}]
analysisApi.getTopProducts(n, s, e) // GET /api/analysis/products?top_n=N
analysisApi.getHourly(date)      // GET /api/analysis/hourly → [{hour, total_amount, total_quantity}]
analysisApi.getHourlyAvg(s, e)   // GET /api/analysis/hourly-avg → [{hour, total_amount, total_quantity}]
analysisApi.getPredict(productId, days) // GET /api/analysis/predict → {product_id, product_name, predictions, avg_7day, avg_30day}
analysisApi.getWasteRisk()       // GET /api/analysis/waste-risk → {items: [{product_id, product_name, category, recent_7day_qty, avg_30day_qty, decline_rate, risk_level}], total}

uploadApi.uploadFile(file, onProgress) // POST /api/upload/file
uploadApi.uploadScreenshot(file)       // POST /api/upload/screenshot → OCRResult
uploadApi.confirmScreenshot(data)      // POST /api/upload/screenshot/confirm → {upload_id, record_count, message}
uploadApi.getHistory()           // GET /api/upload/history → {items, total}

weatherApi.getDaily(date)        // GET /api/weather/daily → {date, avg_temp, condition, precipitation}
weatherApi.getRange(start, end)  // GET /api/weather/range → [{date, avg_temp, condition, precipitation}]

eventsApi.getAll()               // GET /api/events → [{id, event_date, event_type, description}]
eventsApi.create(data)           // POST /api/events
eventsApi.delete(id)             // DELETE /api/events/{id}
eventsApi.syncHolidays(year)     // POST /api/events/sync-holidays?year=N

promotionApi.calculate(data)     // POST /api/promotion/calculate → {joined, not_joined, recommendation, break_even_qty}
promotionApi.getHistory()        // GET /api/promotion/history → {items, total}
promotionApi.create(data)        // POST /api/promotion
promotionApi.update(id, data)    // PUT /api/promotion/{id}
promotionApi.delete(id)          // DELETE /api/promotion/{id}
```

> **백엔드-프론트 타입 정렬 현황** (2026-03-18 수정 완료):
> - `CategorySales` 백엔드 `percentage` → 프론트 `percentage: number` (required, ratio 필드 제거)
> - `TopProduct` 백엔드 `name` → 프론트 `name: string` (product_name 필드 제거)
> - `SalesRecord` 백엔드는 `product` 중첩 객체 반환, 프론트 타입에 `product?: { id, name, category, ... }` 추가됨
> - `sales/page.tsx`는 `product?.name`, `product?.category`로 직접 접근

## 주요 기술 사항
- 프론트엔드 인증 상태: Zustand (`authStore`) + localStorage 토큰 저장
- 백엔드 인증: JWT (HS256, 24시간 만료)
- 환경 설정: `backend/app/core/config.py` (DB URL, SECRET_KEY 등)
- 실제 환경 변수: `backend/.env` (`.env.example` 복사 후 작성)
- CORS: 백엔드에서 `localhost:3000` 허용 설정됨
- 업로드 지원 형식: `.xlsx`, `.xls`, `.csv`, 이미지 스크린샷 OCR (jpg, png, webp, bmp)
- CI/CD: `.github/workflows/ci.yml` — frontend(lint+build) + backend(py_compile) 병렬 검사
- 데모 시드 데이터: `backend/scripts/seed_data.py` — `python backend/scripts/seed_data.py` 실행 시 90일치 데이터 생성 (데모 계정: `demo@conveni.com` / `demo1234`)

## 남은 Mock 데이터
- 없음 (전체 API 연동 완료)

## 개발 로드맵 (Phase)
| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | MVP (인증, 엑셀 업로드, 기본 대시보드) | **완료** |
| 2 | 환경 변수 연동 (기상청/공휴일 API, 이벤트 입력 UI, 분석 페이지 API 연동) | **완료** |
| 3 | POS 스크린샷 OCR 파이프라인 | **완료** |
| 4 | 수요 예측·폐기 위험·행사 이익율 분석 | **완료** |

## 외부 API 참조
### 기상청 API Hub (`WEATHER_API_KEY`)
- **지상관측 일자료**: `https://apihub.kma.go.kr/api/typ01/url/kma_sfcdd.php?tm=YYYYMMDD&stn=108&authKey=`
- **기간 조회**: `https://apihub.kma.go.kr/api/typ01/url/kma_sfcdd3.php?tm1=YYYYMMDD&tm2=YYYYMMDD&stn=108&authKey=`
- 서울 지점번호: 108, 응답: 텍스트(TA=평균기온, RN_DAY=일강수량)

### 공공데이터포털 특일정보 (`HOLIDAY_API_KEY`)
- **공휴일 조회**: `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?solYear=YYYY&ServiceKey=&_type=json&numOfRows=100`
- 응답: JSON (locdate: 정수, dateName, isHoliday)
- 주의: item 1건 시 리스트가 아닌 단일 객체
