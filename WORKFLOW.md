# 구현 워크플로: ConveniSight (CU 편의점 매출 분석 플랫폼)

## Context

PRD(`convienceStore/PRD.md`)를 기반으로 한 단계별 구현 워크플로.
기술 스택: **Next.js 15 + FastAPI + PostgreSQL + Redis + Docker Compose**
현재 상태: `convienceStore/backend/` (기본 구조만), `convienceStore/frontend/` (Next.js 초기화됨)

---

## 전체 Phase 구조

```
Phase 1: 인프라 & 기반 셋업       [MUST - 선행 필수]
Phase 2: 백엔드 핵심 API          [MUST - Phase 1 의존]
Phase 3: 프론트엔드 MVP UI        [MUST - Phase 2 의존]
Phase 4: 환경 변수 연동           [SHOULD - Phase 3 의존]
Phase 5: OCR 파이프라인           [SHOULD - Phase 2 의존]
Phase 6: 예측 & 행사 분석         [COULD - Phase 4 의존]
```

---

## Phase 1: 인프라 & 기반 셋업

**목표**: 모든 서비스가 Docker Compose로 기동되는 개발 환경 구축

### 1-1. Docker Compose 구성
**파일**: `convienceStore/docker-compose.yml`
```yaml
services:
  postgres:     image: postgres:16, port: 5432, DB: conveni_sight
  redis:        image: redis:alpine, port: 6379
  backend:      build: ./backend, port: 8000, depends_on: [postgres, redis]
  frontend:     build: ./frontend, port: 3000, depends_on: [backend]
```
**체크포인트**: `docker-compose up -d` → 모든 컨테이너 healthy

### 1-2. 백엔드 환경 파일
**파일**: `convienceStore/backend/.env.example`
```
DATABASE_URL=postgresql://user:password@postgres:5432/conveni_sight
SECRET_KEY=your-secret-key-here
REDIS_URL=redis://redis:6379
WEATHER_API_KEY=기상청_API_키
HOLIDAY_API_KEY=공공데이터포털_API_키
```

### 1-3. DB 마이그레이션 초기화
**파일**: `backend/alembic/` (이미 생성됨)
- `alembic/env.py` → SQLAlchemy models import 설정
- `alembic upgrade head` 명령으로 테이블 생성 검증

**완료 기준**: `docker-compose up` → FastAPI `/docs`, Next.js `localhost:3000` 접속 가능

---

## Phase 2: 백엔드 핵심 API

**목표**: MVP에 필요한 API 전체 구현 (인증 + 매출 CRUD + 파일 업로드 + 분석)

### 2-1. DB 모델 완성
**파일**: `backend/app/models/`

| 파일 | 모델 | 주요 컬럼 |
|------|------|----------|
| `user.py` | User | id, email, password_hash, store_name, store_address |
| `product.py` | Product | id, barcode, name, category, cost_price, selling_price |
| `sales.py` | SalesRecord | id, product_id(FK), user_id(FK), sale_date, sale_hour, quantity, total_amount |
| `upload.py` | UploadHistory | id, user_id(FK), file_name, file_type, record_count, status |
| `event.py` | Event | id, user_id(FK), event_date, event_type, description |
| `weather.py` | WeatherData | id, date, temperature, weather_condition, precipitation |

**의존성**: `backend/app/models/__init__.py`에 전체 모델 import

### 2-2. Alembic 마이그레이션 생성
```bash
alembic revision --autogenerate -m "initial_tables"
alembic upgrade head
```

### 2-3. 인증 API
**파일**: `backend/app/routers/auth.py`
- `POST /api/auth/register` → 회원가입 (email, password, store_name)
- `POST /api/auth/login` → 로그인 → JWT access_token 반환
- `GET /api/auth/me` → 현재 사용자 정보 (토큰 검증)

**서비스**: `backend/app/services/auth.py`
- `create_user()`, `authenticate_user()`, `get_current_user()`

### 2-4. 파일 업로드 API
**파일**: `backend/app/routers/upload.py`
- `POST /api/upload/file` → multipart/form-data, .xlsx/.csv 수신
- `GET /api/upload/history` → 업로드 이력 목록

**서비스**: `backend/app/services/upload.py`
```python
# 핵심 로직
def parse_file(file) -> pd.DataFrame:
    # 한글 컬럼명 자동 감지 (날짜/일자/상품명/품목/수량/금액/매출)
    # 컬럼 정규화 → sale_date, product_name, quantity, total_amount

def save_to_db(df, user_id, session):
    # 상품 upsert (barcode or name 기준)
    # SalesRecord bulk insert
    # 중복 감지: sale_date + product_id + user_id
```

**지원 파일 형식**: `.xlsx`, `.xls`, `.csv`
**한글 컬럼 매핑**:
```python
DATE_COLS = ['날짜', '일자', '판매일', '거래일', 'date']
NAME_COLS = ['상품명', '품목명', '제품명', '상품', 'name', 'product']
QTY_COLS  = ['수량', '판매수량', '개수', 'quantity', 'qty']
AMT_COLS  = ['금액', '매출금액', '판매금액', '합계', 'amount', 'total']
```

### 2-5. 매출 조회 API
**파일**: `backend/app/routers/sales.py`
- `GET /api/sales?start_date=&end_date=&category=&page=&size=` → 페이지네이션 목록
- `GET /api/sales/{id}` → 단건 조회
- `POST /api/sales` → 수동 등록

### 2-6. 분석 API
**파일**: `backend/app/routers/analysis.py`
**서비스**: `backend/app/services/analysis.py`

| 엔드포인트 | 반환 | 쿼리 |
|-----------|------|------|
| `GET /api/analysis/daily?year=&month=` | `[{date, total_amount, total_qty}]` | GROUP BY sale_date |
| `GET /api/analysis/monthly?year=` | `[{month, total_amount, total_qty}]` | GROUP BY MONTH |
| `GET /api/analysis/hourly?start=&end=` | `[{hour, total_amount}]` | GROUP BY sale_hour |
| `GET /api/analysis/category?start=&end=` | `[{category, total_amount, pct}]` | JOIN products |
| `GET /api/analysis/products?start=&end=&limit=` | `[{name, total_amount, total_qty}]` | Top N |
| `GET /api/analysis/summary` | `{today, yesterday, this_month, total_products}` | 요약 카드용 |

**Redis 캐싱**: 분석 API 응답 5분 캐시 (`analysis:{user_id}:{endpoint_hash}`)

**완료 기준**: `pytest tests/` 통과 또는 `/docs`에서 각 API 수동 테스트

---

## Phase 3: 프론트엔드 MVP UI

**목표**: 대시보드, 업로드, 매출 조회 화면 구현 (API 연동 완료)

### 3-1. 공통 설정
**파일**: `frontend/src/lib/api.ts`
```typescript
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL })
// 인터셉터: Authorization: Bearer {token} 자동 첨부
// 401 → /login 리다이렉트
```

**파일**: `frontend/src/store/authStore.ts` (Zustand)
```typescript
interface AuthStore {
  user: User | null
  token: string | null
  login: (email, password) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}
```

### 3-2. 레이아웃
**파일**: `frontend/src/app/layout.tsx`
- 인증 여부에 따라 `<Sidebar>` + `<Header>` 표시
- 미인증 시 /login 리다이렉트

**파일**: `frontend/src/components/layout/Sidebar.tsx`
```
로고: ConveniSight
메뉴:
  📊 대시보드        /dashboard
  📁 데이터 업로드   /upload
  📋 매출 조회      /sales
  📈 상세 분석      /analysis
  ⚙️ 설정           /settings
하단: 점포명 + 로그아웃
```
색상: 사이드바 `bg-[#1e3a5f]`, 액센트 `blue-500`

### 3-3. 인증 페이지
**파일**: `frontend/src/app/login/page.tsx`, `register/page.tsx`
- react-hook-form + 유효성 검사
- 로그인 성공 → /dashboard 리다이렉트

### 3-4. 대시보드
**파일**: `frontend/src/app/dashboard/page.tsx`

```
┌──────────────────────────────────────────────┐
│  요약 카드 (4개)                               │
│  오늘 매출 | 전일 대비 | 이번달 매출 | 상품 수  │
├──────────────────┬───────────────────────────┤
│ 매출 추이 차트   │ 카테고리별 파이차트         │
│ (30일 LineChart) │ (PieChart)                │
├──────────────────┴───────────────────────────┤
│ 매출 상위 상품 Top 10 (리스트 or BarChart)    │
└──────────────────────────────────────────────┘
```

**컴포넌트**:
- `SummaryCards.tsx` → `GET /api/analysis/summary`
- `SalesLineChart.tsx` → `GET /api/analysis/daily` (Recharts LineChart)
- `CategoryPieChart.tsx` → `GET /api/analysis/category` (Recharts PieChart)
- `TopProductsChart.tsx` → `GET /api/analysis/products?limit=10`

### 3-5. 파일 업로드
**파일**: `frontend/src/app/upload/page.tsx`

```
드래그앤드롭 영역 (점선 박스)
  └── 파일 선택 버튼 (.xlsx, .csv 허용)

업로드 진행: 파일명 + 진행 상태 (processing/completed/failed)

업로드 이력 테이블:
  날짜 | 파일명 | 유형 | 건수 | 상태
```

**컴포넌트**: `FileUploader.tsx`
- `onDrop` → `POST /api/upload/file` (multipart)
- 성공 시 업로드 이력 갱신

### 3-6. 매출 조회
**파일**: `frontend/src/app/sales/page.tsx`
- 날짜 범위 필터 (DatePicker)
- 카테고리 필터
- 테이블: 날짜 | 시간 | 상품명 | 카테고리 | 수량 | 금액
- 페이지네이션

### 3-7. 상세 분석
**파일**: `frontend/src/app/analysis/page.tsx`
- 탭: [월별] [시간대별] [카테고리] [상품별]
- 월별: BarChart (`/api/analysis/monthly`)
- 시간대별: BarChart (`/api/analysis/hourly`)
- 상품별: 수평 BarChart Top 20

**완료 기준**: `npm run build` 성공 + 전체 페이지 수동 E2E 확인

---

## Phase 4: 환경 변수 연동

**목표**: 날씨/휴일 자동 수집 + 이벤트 수동 입력 + 상관관계 시각화

### 4-1. 날씨 API 연동
**파일**: `backend/app/services/weather.py`
- 기상청 단기예보 API (`api.kma.go.kr`)
- 매일 0시 cron job으로 전날 날씨 저장
- WeatherData 테이블 upsert

### 4-2. 공휴일 API 연동
**파일**: `backend/app/services/holiday.py`
- 공공데이터포털 특일정보 API
- 연 1회 일괄 수집 (연초)
- Event 테이블에 저장 (`event_type=holiday`)

### 4-3. 이벤트 관리 API + UI
**백엔드**: `backend/app/routers/events.py`
- `GET/POST/DELETE /api/events`

**프론트엔드**: `frontend/src/app/settings/page.tsx`
- 이벤트 등록 폼 (날짜, 유형, 설명)
- 이벤트 목록 캘린더 or 테이블

### 4-4. 상관관계 차트
**파일**: `frontend/src/app/analysis/page.tsx` (탭 추가)
- [환경변수 분석] 탭
- 날씨 조건별 평균 매출 비교 BarChart
- 이벤트 전후 매출 변화 차트

---

## Phase 5: OCR 파이프라인

**목표**: POS 스크린샷 → 매출 데이터 자동 추출

### 5-1. OCR 서비스
**파일**: `backend/app/services/ocr.py`
```python
# 의존성: pytesseract, Pillow, opencv-python
def process_screenshot(image_bytes) -> dict:
    # 1. 이미지 전처리 (grayscale, threshold, denoise)
    # 2. Tesseract OCR (kor+eng)
    # 3. 정규식으로 날짜/상품명/수량/금액 패턴 추출
    # 4. 신뢰도 점수와 함께 반환
    return {"rows": [...], "confidence": 0.85}
```

### 5-2. 스크린샷 업로드 API
**파일**: `backend/app/routers/upload.py` (확장)
- `POST /api/upload/screenshot` → 이미지 수신 → OCR → 결과 반환 (저장 안 함)
- `POST /api/upload/screenshot/confirm` → 사용자 확인 후 저장

### 5-3. OCR 확인 UI
**파일**: `frontend/src/app/upload/page.tsx` (탭 추가)
- [파일 업로드] / [스크린샷 OCR] 탭
- 이미지 업로드 → OCR 결과 테이블 표시
- 수정 가능한 인라인 편집
- "저장" 버튼 → confirm API 호출

---

## Phase 6: 예측 & 행사 분석

**목표**: 수요 예측 + 행사 이익율 계산기

### 6-1. 수요 예측 모델
**파일**: `backend/app/services/prediction.py`
- 기본: 이동 평균 (7일, 30일)
- 심화: 계절성 + 환경변수 가중치 적용
- `GET /api/analysis/predict?product_id=&days=7`

### 6-2. 폐기 위험 알림
- 유통기한 임박 상품 + 재고 과잉 감지
- `GET /api/analysis/waste-risk` → 위험 상품 목록
- 대시보드 알림 배너

### 6-3. 행사 아이템 분석
**파일**: `backend/app/routers/promotion.py`
- `POST /api/promotion/calculate` → 이익율 계산
  - 입력: 입고가, 판매가, 예상 판매량, 행사 기간
  - 출력: 총 이익, 이익율, 손익분기점 판매량

**파일**: `frontend/src/app/promotion/page.tsx`
- 행사 아이템 입력 폼
- 이익 시뮬레이션 결과 카드
- "참여 O vs 미참여" 비교 뷰

---

## 태스크 의존성 맵

```
[1-1 Docker] ──→ [1-2 ENV] ──→ [2-1 Models] ──→ [2-2 Migration]
                                                        │
                    ┌───────────────────────────────────┤
                    ↓                                   ↓
              [2-3 Auth API]                    [2-4 Upload API]
                    │                                   │
              [2-5 Sales API]              [2-6 Analysis API]
                    │                           │
                    └───────────┬───────────────┘
                                ↓
                        [3-1 API 설정]
                                │
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
       [3-3 Auth UI]    [3-4 Dashboard]    [3-5 Upload UI]
                                │
                        [3-6 Sales UI]
                                │
                        [3-7 Analysis UI]
                                │
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
       [4 Weather]         [5 OCR]          [6 Prediction]
```

---

## 각 Phase별 검증 체크리스트

### Phase 1 완료 기준
- [x] `docker-compose up -d` → 4개 컨테이너 모두 running
- [x] `http://localhost:8000/docs` 접속 가능
- [x] `http://localhost:3000` 접속 가능

### Phase 2 완료 기준
- [x] `POST /api/auth/register` → 201 응답
- [x] `POST /api/auth/login` → JWT 토큰 반환
- [x] `.csv` 파일 업로드 → `GET /api/sales` 데이터 확인
- [x] `GET /api/analysis/daily` → 배열 반환

### Phase 3 완료 기준
- [x] 로그인 → 대시보드 → 차트 4개 모두 렌더링
- [x] 파일 업로드 후 새로고침 → 대시보드 데이터 반영
- [x] `npm run build` 에러 없음

### Phase 4 완료 기준
- [x] 날씨 데이터 API 호출 → weather_data 테이블 저장
- [x] 이벤트 등록 → 분석 차트에 반영
- [x] 시간대별 분석 API (hourly, hourly-avg) 구현
- [x] 공휴일 자동 동기화 API 구현
- [x] /analysis 페이지 mock 데이터 → 실제 API 연동
- [x] /settings 페이지 이벤트 CRUD → 실제 API 연동

### Phase 5 완료 기준
- [x] POS 스크린샷 업로드 → OCR 결과 테이블 표시
- [x] 수정 후 저장 → sales 데이터 반영

### Phase 6 완료 기준
- [x] 행사 아이템 입력 → 이익율 계산 API 연동
- [x] 행사 참여 vs 미참여 비교 계산
- [x] 행사 이력 저장/조회/삭제 CRUD
- [x] 수요 예측 (이동 평균 기반) 엔드포인트
- [x] 폐기 위험 알림 엔드포인트 + UI
- [x] /promotion 페이지 mock → 실제 API 연동

---

## 병렬 팀 구성 (Team Agents)

### 현재 완료 상태 (2026-03-18)

#### 전체 완료 — main 브랜치 머지됨 (PR #3)

| Wave / Phase | 작업 | 상태 |
|---|---|---|
| Wave 0 | Docker Compose, .env, DB 모델 6개 (user/product/sales/upload/event/weather), Alembic | ✅ 완료 |
| Wave 1 | Auth/Sales/Upload/Analysis/Events 라우터 + summary 엔드포인트 | ✅ 완료 |
| Wave 2 | 프론트엔드 전체 API 연동 (login/register/dashboard/sales/upload) | ✅ 완료 |
| Wave 3 | 기상청 ASOS API 연동, 공휴일 API 연동, 시간대별 분석 API | ✅ 완료 |
| Wave 4 | /settings 이벤트 CRUD 연동, /analysis mock→API 전환, 날씨/이벤트 병합 | ✅ 완료 |
| Phase 5 | OCR 파이프라인 (POS 스크린샷) | ✅ 완료 |
| Phase 6 | 수요 예측, 폐기 알림, 행사 이익율 고도화 | ✅ 완료 |
| QA/인프라 | 타입 불일치 수정, 빌드 Warning 제거, 시드 데이터, CI/CD | ✅ 완료 |
| Phase 7 | Playwright E2E 테스트 63개 (7페이지 전체 커버), noValidate, 401 인터셉터 수정 | ✅ 완료 |

#### Wave 3~4 완료 파일 목록 (2026-03-17 세션)
**백엔드 신규:**
- `services/weather.py` — 기상청 ASOS 일자료 API 연동 (fetch_daily_weather, fetch_weather_range, save_weather_to_db)
- `services/holiday.py` — 공공데이터포털 특일정보 API 연동 (fetch_holidays, sync_holidays_to_events)
- `routers/weather.py` — GET /api/weather/daily|range, POST /api/weather/sync
- `schemas/weather.py` — WeatherResponse, WeatherSyncRequest, WeatherSyncResponse

**백엔드 수정:**
- `core/config.py` — WEATHER_API_KEY, HOLIDAY_API_KEY 추가
- `main.py` — weather 라우터 등록
- `routers/analysis.py` — GET /api/analysis/hourly, hourly-avg 추가
- `services/analysis.py` — get_hourly_sales(), get_hourly_avg_sales() 추가
- `routers/events.py` — POST /api/events/sync-holidays 추가
- `schemas/event.py` — HolidaySyncResponse 추가

**프론트엔드 수정:**
- `lib/api.ts` — weatherApi, eventsApi, analysisApi.getHourly/getHourlyAvg 추가
- `app/settings/page.tsx` — mock 제거 → eventsApi CRUD 연동 + 공휴일 동기화 버튼
- `app/analysis/page.tsx` — 7개 mock 데이터 삭제 → analysisApi/weatherApi/eventsApi 실제 연동

#### Phase 5 완료 파일 목록 (2026-03-17 세션)
**백엔드 신규:**
- `services/ocr.py` — pytesseract + OpenCV 전처리 (그레이스케일, 적응형 이진화, 노이즈 제거, 선명화) + POS 스크린샷 OCR (한국어+영어)
- `schemas/upload.py` — OCRRow, OCRResultResponse, OCRConfirmRequest, OCRConfirmResponse 추가

**백엔드 수정:**
- `routers/upload.py` — POST /api/upload/screenshot (OCR 처리, 미저장), POST /api/upload/screenshot/confirm (사용자 확인 후 매출 저장)
- `requirements.txt` — pytesseract, opencv-python-headless, Pillow 추가

**프론트엔드 신규:**
- `components/upload/ScreenshotOCR.tsx` — 이미지 업로드 → OCR → 인라인 편집 테이블 (행 추가/삭제/수정, 날짜·시간 편집, 원본 텍스트 확인) → 매출 저장

**프론트엔드 수정:**
- `app/upload/page.tsx` — [파일 업로드] / [스크린샷 OCR] 탭 UI 추가
- `lib/api.ts` — uploadApi.uploadScreenshot(), uploadApi.confirmScreenshot() 추가
- `types/index.ts` — OCRRow, OCRResult, OCRConfirmRequest 타입 추가

#### Phase 6 완료 파일 목록 (2026-03-17 세션)
**백엔드 신규:**
- `services/prediction.py` — 이동 평균 기반 수요 예측 (predict_demand, get_waste_risk_products), 요일별 보정 계수 적용
- `models/promotion.py` — Promotion 모델 (user_id FK, product_name, promotion_name, start/end_date, cost/sale_price, expected_qty, waste_rate, joined, actual_qty, actual_profit_rate)
- `schemas/promotion.py` — PromotionCalculateRequest/Response, ComparisonResult, PromotionCreate/Update/Response, PromotionHistoryResponse
- `routers/promotion.py` — POST /api/promotion/calculate, GET /api/promotion/history, POST/PUT/DELETE /api/promotion

**백엔드 수정:**
- `schemas/analysis.py` — PredictionItem, PredictionResponse, WasteRiskItem, WasteRiskResponse 추가
- `routers/analysis.py` — GET /api/analysis/predict, GET /api/analysis/waste-risk 추가
- `models/__init__.py` — Promotion 임포트 추가
- `models/user.py` — promotions relationship 추가
- `main.py` — promotion 라우터 등록

**프론트엔드 수정:**
- `types/index.ts` — Promotion, Prediction, WasteRisk 관련 타입 추가
- `lib/api.ts` — promotionApi 객체 추가, analysisApi.getPredict/getWasteRisk 추가
- `app/promotion/page.tsx` — mock 데이터 제거 → 실제 API 연동 (행사 계산기 + 폐기 위험 알림 탭)

#### Phase 7: E2E 테스트 완료 파일 목록 (2026-03-19 세션)

**신규:**
- `frontend/e2e/test.md` — 63개 테스트 전체 문서화 (결과표, flaky 원인, API mock 전략)

**수정:**
- `frontend/playwright.config.ts` — timeout 90s, retries 1 (dev server 슬로우다운 대응)
- `frontend/e2e/tests/auth/login.spec.ts` — waitForTimeout(500), 유효성 에러 timeout 강화
- `frontend/e2e/tests/auth/register.spec.ts` — waitForTimeout(1000), 유효성 에러 timeout 10s로 증가
- `frontend/e2e/tests/promotion/promotion.spec.ts` — strict mode violation 수정 (getByRole('heading'), getByRole('cell').locator('span'))
- `frontend/e2e/tests/sales/sales.spec.ts` — 페이지네이션 버튼 `toBeVisible({ timeout: 30000 })`
- `frontend/e2e/tests/upload/file-upload.spec.ts` — (flaky, retries로 처리)
- `frontend/src/app/login/page.tsx` — 폼에 `noValidate` 추가 (react-hook-form 단독 유효성 처리)
- `frontend/src/app/register/page.tsx` — 폼에 `noValidate` 추가
- `frontend/src/lib/api.ts` — 401 인터셉터에서 auth 엔드포인트 제외 처리

**테스트 결과**: 63개 전체 통과 (59 passed, 4 flaky → retry 통과, 0 failed)

---

#### QA / 인프라 완료 파일 목록 (2026-03-18 세션)
**타입 불일치 수정:**
- `types/index.ts` — `TopProduct.name` (product_name → name), `CategorySales.percentage` required (ratio 제거), `SalesRecord.product?` 중첩 타입 추가
- `app/analysis/page.tsx` — `c.ratio` → `c.percentage` 3곳, `p.product_name` → `p.name` 6곳 수정
- `components/dashboard/TopProducts.tsx` — `product.product_name` → `product.name` 수정

**빌드 Warning 제거:**
- `components/upload/FileUploader.tsx` — useCallback 의존성 배열 수정 (validateFile 추가, allowedTypes/allowedExtensions useMemo 처리)
- `components/upload/ScreenshotOCR.tsx` — `<img>` → `next/image <Image>` 교체
- `store/authStore.ts` — 미사용 `removeToken` import 제거

**인프라 신규:**
- `.github/workflows/ci.yml` — frontend(lint+build) + backend(py_compile) 병렬 CI (Node.js 20, Python 3.11)
- `backend/scripts/seed_data.py` — 90일치 데모 매출 데이터 생성 (데모 계정, 상품 20개, 시간대 가중치, 주말 보정)

**Git:**
- PR #3 머지 (feat/backend-api-and-frontend-integration → main), 브랜치 삭제

### Wave 0: Foundation (선행 순차)

| 팀 | 담당 | 이유 |
|---|---|---|
| **Foundation** | Phase 1 (Docker Compose, .env) + Phase 2-1 (전체 DB 모델) + Phase 2-2 (Alembic 마이그레이션) | 모든 팀이 공유하는 DB 스키마가 먼저 확정되어야 함 |

### Wave 1: 백엔드 API (병렬 - 3개 팀)

모델/마이그레이션 완료 후, 라우터+서비스+스키마는 독립적이므로 동시 작업 가능:

| 팀 | 담당 | 주요 파일 |
|---|---|---|
| **Auth** | Phase 2-3 인증 API | `routers/auth.py`, `services/auth.py`, `schemas/auth.py` |
| **Data** | Phase 2-4 업로드 + Phase 2-5 매출 조회 | `routers/upload.py`, `routers/sales.py`, `services/upload.py`, `schemas/sales.py` |
| **Analytics** | Phase 2-6 분석 API + Redis 캐싱 | `routers/analysis.py`, `services/analysis.py`, `schemas/analysis.py` |

### Wave 2: 프론트엔드 연동 (병렬 - 3개 팀)

백엔드 API 완성 후, 각 페이지의 mock → API 교체는 독립적:

| 팀 | 담당 | 주요 파일 |
|---|---|---|
| **FE-Core** | API 클라이언트 설정 + authStore + 로그인/회원가입 연동 | `lib/api.ts`, `store/authStore.ts`, `login/`, `register/` |
| **FE-Dashboard** | 대시보드 + 매출조회 페이지 API 연동 | `dashboard/page.tsx`, `sales/page.tsx` |
| **FE-Analysis** | 분석 + 업로드 + 프로모션 페이지 API 연동 | `analysis/page.tsx`, `upload/page.tsx`, `promotion/page.tsx` |

### 의존성 흐름

```
Wave 0: [Foundation] ─────────────────────────────
                │
Wave 1:         ├── [Auth]      ─┐
                ├── [Data]      ─┼── 병렬
                └── [Analytics] ─┘
                         │
Wave 2:         ├── [FE-Core]      ─┐
                ├── [FE-Dashboard] ─┼── 병렬
                └── [FE-Analysis]  ─┘
```

---

## 핵심 파일 경로 요약

```
convienceStore/
├── docker-compose.yml                ← Phase 1
├── backend/
│   ├── .env.example                  ← Phase 1
│   ├── app/
│   │   ├── main.py                   ← 이미 존재 (라우터 등록 필요)
│   │   ├── core/
│   │   │   ├── config.py             ← 이미 존재
│   │   │   ├── database.py           ← 이미 존재
│   │   │   └── security.py           ← 이미 존재
│   │   ├── models/                   ← Phase 2-1 (신규)
│   │   ├── schemas/                  ← Phase 2-3~6 (신규)
│   │   ├── routers/                  ← Phase 2-3~6 (신규)
│   │   └── services/                 ← Phase 2-4, 2-6 (신규)
│   └── alembic/                      ← Phase 2-2
└── frontend/
    └── src/
        ├── app/                      ← Phase 3 (신규)
        ├── components/               ← Phase 3 (신규)
        ├── lib/api.ts                ← Phase 3-1 (신규)
        └── store/authStore.ts        ← Phase 3-1 (신규)
```
