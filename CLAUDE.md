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
    ├── /api/sales      → 매출 데이터 CRUD
    ├── /api/upload     → 엑셀/CSV/스크린샷 업로드
    ├── /api/analysis   → 분석 결과 조회
    ├── /api/weather    → 날씨 데이터 (기상청 API 프록시)
    ├── /api/events     → 이벤트/환경변수 관리
    └── /api/promotion  → 본사 행사 아이템 분석
        ↓
PostgreSQL :5432  +  Redis :6379
```

### 프론트엔드 페이지 구조
| 경로 | 페이지 | 상태 |
|------|--------|------|
| `/dashboard` | KPI 요약 카드 + 매출 추이 (일별/주별/월별 탭) + 카테고리 차트 | 구현 완료 (mock) |
| `/sales` | 매출 내역 테이블 (날짜·카테고리 필터, 매출 총합 요약, 카테고리별 집계) | 구현 완료 (mock) |
| `/upload` | 엑셀/CSV 업로드 + 이력 테이블 | 구현 완료 (mock) |
| `/analysis` | 탭: 월별(날씨·이벤트)/주별(날씨·이벤트·상품순위)/일별(시간별 차트)/시간대별 | 구현 완료 (mock) |
| `/promotion` | 행사 이익율 계산기 + 참여/미참여 비교 + 이력 | 구현 완료 (mock) |
| `/settings` | 점포 정보 + 이벤트 관리 (추가/삭제) | 구현 완료 (mock) |
| `/login` | 로그인 | 구현 완료 (mock) |
| `/register` | 회원가입 | 구현 완료 (mock) |

### 백엔드 구조
```
backend/app/
├── main.py           # FastAPI 앱, CORS (localhost:3000), 라우터 등록
├── core/
│   ├── config.py     # 환경 설정 (DB URL, JWT, Redis, 업로드 경로)
│   ├── database.py   # SQLAlchemy 엔진, SessionLocal, get_db()
│   └── security.py   # JWT 발급/검증, 비밀번호 해싱 (bcrypt)
├── models/           # SQLAlchemy ORM 모델
├── schemas/          # Pydantic 스키마 (요청/응답)
├── routers/          # API 라우터 (auth, sales, upload, analysis)
└── services/         # 비즈니스 로직 (auth, upload, analysis, ocr, prediction)
```

### DB 테이블
```
users           → 점주 계정 (email, password_hash, store_name, store_address)
products        → 상품 마스터 (바코드, 이름, 카테고리, 입고가)
sales_records   → 매출 원본 (날짜, 시간, 상품, 수량, 금액)
weather_data    → 일별 날씨 (기상청 API 수집)
events          → 환경 변수 (학교 행사, 공휴일, 지역 이벤트)
promotions      → 본사 행사 아이템 정보
upload_history  → 업로드 이력
```

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
- API 호출: `src/lib/api.ts`
- 인증 유틸: `src/lib/auth.ts`

### 새 페이지 추가 시 체크리스트
1. `src/app/[경로]/page.tsx` 생성
2. `src/components/layout/Sidebar.tsx` — `navigation` 배열에 항목 추가
3. `src/components/layout/Header.tsx` — `pageTitles` 객체에 타이틀 추가

## 주요 기술 사항
- 프론트엔드 인증 상태: Zustand (`authStore`) + localStorage 토큰 저장
- 백엔드 인증: JWT (HS256, 24시간 만료)
- 현재 모든 페이지는 mock data 기반으로 동작 → 백엔드 연동 시 `src/lib/api.ts` 교체
- 환경 설정: `backend/app/core/config.py` (DB URL, SECRET_KEY 등)
- CORS: 백엔드에서 `localhost:3000` 허용 설정됨

## Mock 데이터 교체 가이드 (날씨·이벤트)
날씨/이벤트 mock 데이터는 `src/app/analysis/page.tsx` 상단에 집중 정의됨.
추후 API 연동 시 아래 TODO 주석 위치를 교체:
- `mockMonthlyData` → `GET /api/analysis/monthly` + 기상청 API 병합
- `mockWeeklyData`  → `GET /api/analysis/weekly` + 날씨/이벤트 병합
- `mockHourlyByDate` → `GET /api/analysis/hourly?date=YYYY-MM-DD`
- `mockAggregatedHourly` → `GET /api/analysis/hourly-avg`

### 관련 타입 (`src/types/index.ts`)
```ts
WeatherInfo   // avgTemp, condition (sunny/cloudy/rainy/snowy), precipitation
EventInfo     // name, type (holiday/school/local/other), date?
MonthlyWithMeta  // MonthlySales + label + weather + events
WeeklyWithMeta   // WeeklySales + weather + events + topProducts
HourlySales   // hour, total_amount, total_quantity
```

## 개발 로드맵 (Phase)
| Phase | 내용 | 상태 |
|-------|------|------|
| 1 | MVP (인증, 엑셀 업로드, 기본 대시보드) | 프론트 UI 완료, 백엔드 진행중 |
| 2 | 환경 변수 연동 (기상청/공휴일 API, 이벤트 입력) | 미착수 |
| 3 | POS 스크린샷 OCR 파이프라인 | 미착수 |
| 4 | 수요 예측·발주 추천·행사 분석 고도화 | 미착수 |
