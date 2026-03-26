# ConveniSight — CU 편의점 매출 분석 플랫폼

> **편의점 점주를 위한 데이터 기반 의사결정 도구**
> 날씨·공휴일·이벤트 등 환경 변수와 매출 데이터를 결합하여 폐기율 감소, 매출 증대, 행사 이익율 극대화를 지원합니다.

---

## 주요 화면

| 대시보드 | 분석 - 월별 |
|----------|-------------|
| ![대시보드](dashboard.png) | ![월별 분석](analysis-monthly.png) |

| 분석 - 일별 (날씨 연동) | 분석 - 주별 |
|-------------------------|-------------|
| ![일별 분석](analysis-daily.png) | ![주별 분석](analysis-weekly.png) |

---

## 핵심 기능

| 기능 | 설명 |
|------|------|
| **매출 대시보드** | 오늘/전일/이번달 KPI 요약 카드 + 일별·주별·월별 매출 추이 차트 + 카테고리별 분석 |
| **다중 데이터 입력** | Excel/CSV 업로드 (한글 컬럼 자동 매핑) + POS 스크린샷 OCR 파이프라인 |
| **환경 변수 연동** | 기상청 ASOS API 날씨 데이터 + 공공데이터 공휴일 자동 동기화 |
| **심층 매출 분석** | 월별·주별·일별·시간대별 분석 + 날씨·이벤트 오버레이 |
| **수요 예측 & 폐기 위험** | 이동 평균 기반 상품별 수요 예측 + 폐기 위험 알림 |
| **행사 이익율 계산기** | 행사 참여/미참여 시나리오 비교 + 손익분기점 산출 |
| **E2E 테스트** | Playwright 기반 63개 테스트 — 전체 페이지 커버리지 |

---

## 기술 스택

### Frontend
![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-000000?style=flat)
![Recharts](https://img.shields.io/badge/Recharts-FF6B6B?style=flat)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat&logo=playwright&logoColor=white)

### Backend
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat&logo=python&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=flat)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=flat&logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat&logo=jsonwebtokens&logoColor=white)

### Infra & DevOps
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=githubactions&logoColor=white)

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js :3000)              │
│  /dashboard  /sales  /upload  /analysis  /promotion      │
│  /settings   /login  /register                           │
│                                                          │
│  Zustand (인증 상태)  │  Recharts (차트)  │  Axios (API) │
└────────────────────────────────┬────────────────────────┘
                                 │ HTTP / JSON
┌────────────────────────────────▼────────────────────────┐
│                    Backend (FastAPI :8000)               │
│                                                          │
│  /api/auth      → JWT 인증 (로그인/회원가입)              │
│  /api/sales     → 매출 데이터 CRUD + 페이지네이션         │
│  /api/upload    → CSV/Excel 파싱 + POS OCR 파이프라인    │
│  /api/analysis  → 일별/월별/시간대별/수요예측/폐기위험    │
│  /api/events    → 이벤트 관리 + 공휴일 동기화             │
│  /api/weather   → 기상청 ASOS API 날씨 연동              │
│  /api/promotion → 행사 이익율 계산 + 이력 관리            │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
┌───────────▼──────────┐      ┌──────────▼────────────────┐
│  PostgreSQL :5432     │      │  Redis :6379              │
│  users / products /  │      │  세션 캐시                 │
│  sales_records /     │      └───────────────────────────┘
│  weather_data /      │
│  events / promotions │      ┌───────────────────────────┐
│  upload_history      │      │  외부 API                 │
└──────────────────────┘      │  기상청 ASOS (날씨)        │
                              │  공공데이터포털 (공휴일)    │
                              └───────────────────────────┘
```

---

## 빠른 시작

### 사전 요구사항

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/conveniSight.git
cd conveniSight
```

### 2. 환경 변수 설정

```bash
cp backend/.env.example backend/.env
```

```env
# backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/conveni_sight
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here-32chars-minimum
WEATHER_API_KEY=your-kma-api-key        # 기상청 API Hub
HOLIDAY_API_KEY=your-holiday-api-key    # 공공데이터포털
```

### 3. 인프라 실행

```bash
# PostgreSQL + Redis 실행
docker-compose up -d postgres redis
```

### 4. 백엔드 실행

```bash
cd backend
pip install -r requirements.txt

# DB 마이그레이션 적용
alembic upgrade head

# 데모 데이터 생성 (90일치)
python scripts/seed_data.py

# 개발 서버 실행
uvicorn app.main:app --reload --port 8000
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 데모 계정

```
Email:    demo@conveni.com
Password: demo1234
```

---

## Docker로 전체 실행

```bash
docker-compose up -d
```

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Frontend | :3000 | Next.js 앱 |
| Backend | :8000 | FastAPI 서버 |
| PostgreSQL | :5432 | 데이터베이스 |
| Redis | :6379 | 캐시 서버 |

---

## API 문서

백엔드 실행 후 아래 주소에서 Swagger UI 확인 가능:

```
http://localhost:8000/docs
```

### 주요 엔드포인트 요약

<details>
<summary><b>인증 (Auth)</b></summary>

```
POST /api/auth/register   회원가입
POST /api/auth/login      로그인 → JWT 토큰 반환
GET  /api/auth/me         현재 사용자 정보
```
</details>

<details>
<summary><b>매출 (Sales)</b></summary>

```
GET  /api/sales           목록 조회 (날짜·카테고리 필터, 페이지네이션)
POST /api/sales           매출 기록 생성
GET  /api/sales/{id}      상세 조회
```
</details>

<details>
<summary><b>업로드 (Upload)</b></summary>

```
POST /api/upload/file               CSV/Excel 파일 업로드
POST /api/upload/screenshot         POS 스크린샷 OCR 처리
POST /api/upload/screenshot/confirm OCR 결과 확인 후 DB 저장
GET  /api/upload/history            업로드 이력 조회
```
</details>

<details>
<summary><b>분석 (Analysis)</b></summary>

```
GET /api/analysis/summary     KPI 요약 (오늘/어제/이번달 매출)
GET /api/analysis/daily       일별 매출 집계
GET /api/analysis/monthly     월별 매출 집계
GET /api/analysis/hourly      특정일 시간대별 매출
GET /api/analysis/hourly-avg  기간 평균 시간대별 매출
GET /api/analysis/category    카테고리별 매출 비율
GET /api/analysis/products    상위 N개 상품 랭킹
GET /api/analysis/predict     상품별 수요 예측 (이동 평균)
GET /api/analysis/waste-risk  폐기 위험 상품 목록
```
</details>

<details>
<summary><b>날씨 & 이벤트 (Weather & Events)</b></summary>

```
GET  /api/weather/daily          특정일 날씨
GET  /api/weather/range          기간 날씨 조회
POST /api/weather/sync           기상청 API 동기화

GET    /api/events               이벤트 목록
POST   /api/events               이벤트 생성
DELETE /api/events/{id}          이벤트 삭제
POST   /api/events/sync-holidays 공휴일 자동 동기화
```
</details>

<details>
<summary><b>행사 이익율 (Promotion)</b></summary>

```
POST   /api/promotion/calculate  참여/미참여 시나리오 비교 계산
GET    /api/promotion/history    행사 참여 이력
POST   /api/promotion            행사 생성
PUT    /api/promotion/{id}       행사 수정
DELETE /api/promotion/{id}       행사 삭제
```
</details>

---

## E2E 테스트

**Playwright** 기반 63개 테스트 — 전체 페이지 커버리지

### 실행 방법

```bash
cd frontend

# 전체 테스트
npx playwright test

# 특정 모듈만
npx playwright test e2e/tests/auth/
npx playwright test e2e/tests/dashboard/

# HTML 리포트 확인
npx playwright show-report

# 대화형 UI 모드
npx playwright test --ui
```

> **사전 조건**: 백엔드(`:8000`) + PostgreSQL 실행 필요. Next.js dev server는 자동 시작.

### 테스트 커버리지

| 모듈 | 테스트 수 | 커버 내용 |
|------|-----------|-----------|
| 인증 (Auth) | 2개 | 로그인, 회원가입 |
| 대시보드 | 15개 | KPI 카드, 차트 렌더링, 탭 전환 |
| 매출 내역 | 12개 | 테이블, 필터, 페이지네이션 |
| 업로드 | 16개 | 파일 업로드, OCR 처리 흐름 |
| 분석 | 10개 | 탭 전환, 차트, 날씨 오버레이 |
| 행사 계산기 | 5개 | 이익율 계산, 시나리오 비교 |
| 설정 | 3개 | 이벤트 CRUD, 공휴일 동기화 |
| **합계** | **63개** | **전체 통과** ✅ |

자세한 테스트 결과: [`frontend/e2e/test.md`](frontend/e2e/test.md)

---

## 프로젝트 구조

```
conveniSight/
├── frontend/                  # Next.js 15 앱
│   ├── src/
│   │   ├── app/               # App Router 페이지 (8개 라우트)
│   │   ├── components/        # UI 컴포넌트
│   │   │   ├── layout/        # Sidebar, Header
│   │   │   ├── dashboard/     # SummaryCards, SalesChart, CategoryChart
│   │   │   └── upload/        # FileUploader, ScreenshotOCR
│   │   ├── lib/
│   │   │   ├── api.ts         # API 클라이언트 (6개 객체)
│   │   │   └── auth.ts        # 인증 유틸
│   │   ├── store/
│   │   │   └── authStore.ts   # Zustand 인증 상태
│   │   └── types/
│   │       └── index.ts       # TypeScript 타입 정의
│   └── e2e/                   # Playwright E2E 테스트 (63개)
│
├── backend/                   # FastAPI 서버
│   ├── app/
│   │   ├── main.py            # 앱 초기화, CORS, 라우터 등록
│   │   ├── core/              # config, database, security
│   │   ├── models/            # SQLAlchemy ORM (7개 테이블)
│   │   ├── schemas/           # Pydantic 요청/응답 스키마
│   │   ├── routers/           # API 엔드포인트 (7개 라우터)
│   │   └── services/          # 비즈니스 로직 (OCR, 예측, 분석 등)
│   ├── alembic/               # DB 마이그레이션
│   └── scripts/
│       └── seed_data.py       # 데모 데이터 생성 (90일치)
│
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI (lint + build + py_compile)
│
└── docker-compose.yml         # 전체 서비스 오케스트레이션
```

---

## 개발 과정 (Phase)

| Phase | 기능 | 상태 |
|-------|------|------|
| Phase 1 | MVP — 인증, Excel/CSV 업로드, 기본 대시보드 | ✅ 완료 |
| Phase 2 | 환경 변수 연동 — 기상청/공휴일 API, 이벤트 UI, 분석 페이지 | ✅ 완료 |
| Phase 3 | POS 스크린샷 OCR 파이프라인 (Tesseract + OpenCV) | ✅ 완료 |
| Phase 4 | 수요 예측 · 폐기 위험 알림 · 행사 이익율 분석 | ✅ 완료 |

---

## 기술적 의사결정

### OCR 파이프라인
POS 단말기 스크린샷에서 매출 데이터를 자동 추출하기 위해 **OpenCV + Tesseract** 조합을 선택했습니다.
그레이스케일 변환 → 적응형 이진화 → 노이즈 제거 순서로 이미지를 전처리하여 OCR 정확도를 높이고,
추출된 결과를 사용자가 확인·수정 후 저장하는 **2단계 확인 플로우**로 오류를 최소화했습니다.

### 수요 예측 모델
복잡한 ML 모델 대신 **이동 평균(Moving Average)** 기반 예측을 선택했습니다.
7일/30일 이동 평균으로 추세를 파악하고, 최근 7일 판매량이 30일 평균보다 크게 감소한 상품을
폐기 위험 상품으로 분류합니다. 소규모 점포 데이터에도 안정적으로 동작하고 결과가 직관적입니다.

### 한글 컬럼 자동 매핑
편의점 POS 시스템마다 Excel 컬럼명이 다르므로, 미리 정의된 한글 컬럼 매핑 테이블로
다양한 형식을 자동 인식합니다. 인식되지 않은 컬럼은 사용자에게 경고 메시지로 안내합니다.

---

## CI/CD

GitHub Actions로 `main` 브랜치 및 `feat/**` 브랜치에 push/PR 시 자동 검사:

```yaml
Frontend Check: npm ci → ESLint → Next.js build
Backend Check:  pip install → python -m py_compile (전체 파일)
```

---

## 라이선스

This project is for portfolio purposes.
