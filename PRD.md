# PRD: CU 편의점 매출 분석 플랫폼 (ConveniSight)

## Context

CU 편의점 점주가 어떤 상품이 잘 팔리는지 데이터 기반으로 파악할 수 없는 문제를 해결하기 위한 웹 플랫폼. 날씨, 휴일, 근처 학교 이벤트 등 다양한 환경 변수와 매출 데이터를 결합 분석하여 **폐기율 감소**, **매출 증대**, **행사 아이템 이익율 극대화**를 목표로 한다.

---

## 1. 문제 정의

| 문제 | 현재 상태 | 영향 |
|------|----------|------|
| 매출 분석 불가 | 어떤 상품이 잘 팔리는지 감으로 판단 | 재고 과잉/부족 발생 |
| 환경 변수 미반영 | 날씨, 이벤트에 따른 수요 변화 대응 불가 | 폐기율 증가, 기회 손실 |
| 본사 행사 아이템 판단 어려움 | 행사 아이템 이익율/적합성 파악 불가 | 수익성 낮은 행사 참여 |

## 2. 타겟 사용자

- **Primary**: CU 편의점 점주 (1인 운영 ~ 소규모)
- **Pain Point**: 데이터 분석 도구 없이 경험에만 의존한 재고/발주 관리
- **기술 수준**: 스마트폰/PC 기본 사용 가능, 전문 분석 도구 미경험

## 3. 제안 해결책

### 3.1 핵심 기능

#### F1. 매출 데이터 입력
- [x] **엑셀/CSV 업로드**: CU POS에서 내보낸 매출 데이터 파일 업로드
  - [x] 한글 컬럼명 자동 매핑 (날짜/상품명/수량/금액 등)
  - [x] 중복 데이터 감지 및 처리
  - [x] 업로드 이력 조회
- [ ] **POS 스크린샷 OCR 인식**: 점주가 POS 화면을 촬영/캡처하여 업로드하면 AI OCR로 매출 데이터 자동 추출
  - [ ] Tesseract OCR 또는 Claude Vision API 파이프라인 (CU POS 화면 특화)
  - [ ] 인식 결과 점주 확인/수정 UI 제공

#### F2. 환경 변수 수집
- [x] **이벤트 DB 모델 및 API** (`/api/events` GET/POST/DELETE)
- [ ] **자동 수집 (공공 API)**:
  - [ ] 기상청 단기예보 API → 날씨/기온/강수 (`/api/weather`)
  - [ ] 공휴일 API (data.go.kr) → 공휴일/대체휴일
- [ ] **수동 입력 UI** (`/settings` 페이지 이벤트 관리 — API 연동):
  - [ ] 근처 학교 이벤트 (체육대회, 축제, 시험기간, 방학)
  - [ ] 지역 행사 (축제, 마라톤, 공사 등)

#### F3. 매출 분석 대시보드
- [x] **시간 단위 분석**: 일별 / 주별 / 월별 (`/api/analysis/daily`, `/monthly`)
- [x] **카테고리별 분석**: 음료, 식품, 생활용품 등 (`/api/analysis/category`)
- [x] **상품별 분석**: 매출 상위 N개 상품 (`/api/analysis/products`)
- [x] **요약 카드**: 오늘/전일/이번달 매출, 총 상품 수 (`/api/analysis/summary`)
- [ ] **시간대별 분석**: 시간대별 매출 패턴 (`/api/analysis/hourly` — 미구현)
- [ ] **환경 변수 상관관계**: 날씨-매출, 이벤트-매출 상관 분석
  - [ ] "비 오는 날 우산 매출 +300%" 등 인사이트 자동 생성

#### F4. 예측 및 추천
- [ ] **수요 예측**: 과거 데이터 + 환경 변수 기반 상품별 수요 예측
- [ ] **발주 추천**: 예측 기반 적정 발주량 제안
- [ ] **폐기 위험 알림**: 폐기 가능성 높은 상품 사전 알림

#### F5. 본사 행사 아이템 분석
- [ ] **행사 아이템 이익율 계산기**: 입고가, 판매가, 예상 판매량 기반 이익율 산출 (`/promotion` 페이지 API 연동)
- [ ] **내 점포 적합성 분석**: 과거 유사 상품 매출 데이터 기반 예상 판매량 추정
- [ ] **행사 참여 의사결정 지원**: "참여 시 예상 이익 vs 미참여" 비교 뷰

### 3.2 기능 우선순위 (MoSCoW)

| 우선순위 | 기능 | 상태 |
|---------|------|------|
| **Must Have** | 엑셀/CSV 업로드, 기본 매출 대시보드 (일/월별, 카테고리별), 상품별 매출 조회 | ✅ 완료 |
| **Should Have** | POS 스크린샷 OCR, 날씨/휴일 API 연동, 시간대별 분석, 환경변수 상관관계 | 진행 예정 |
| **Could Have** | 수요 예측, 발주 추천, 폐기 위험 알림, 본사 행사 이익율 분석 | 미착수 |
| **Won't Have (v1)** | POS 실시간 연동, 다중 점포 관리, 모바일 앱 | — |

## 4. 기술 아키텍처

### 4.1 기술 스택

| 레이어 | 기술 | 선택 이유 | 상태 |
|--------|------|----------|------|
| **프론트엔드** | Next.js 15 + TypeScript + Tailwind CSS | SSR/SSG 지원, 빠른 초기 로딩 | ✅ |
| **백엔드 API** | FastAPI (Python) | Pandas/NumPy 네이티브 활용 | ✅ |
| **OCR** | Tesseract 또는 Claude Vision API | 오픈소스 / 고정확도 선택 가능 | ⬜ |
| **차트** | Recharts | React 네이티브 차트 라이브러리 | ✅ |
| **DB** | PostgreSQL | 시계열 매출 데이터 + JSON 지원 | ✅ |
| **캐시** | Redis | 대시보드 쿼리 결과 캐싱 | ⬜ 미적용 |
| **인프라** | Docker Compose | 로컬 개발 및 배포 일관성 | ✅ |
| **MCP** | PostgreSQL / Redis / Docker MCP | Claude Code 직접 DB·인프라 조작 | ✅ |

### 4.2 시스템 구조

```
[Next.js Frontend :3000]
        ↓
[FastAPI Backend :8000]
    ├── /api/auth     ✅ → 인증 (로그인/회원가입/JWT)
    ├── /api/sales    ✅ → 매출 데이터 CRUD + 목록 조회
    ├── /api/upload   ✅ → 엑셀/CSV 업로드, 이력 조회
    ├── /api/analysis ✅ → daily/monthly/category/products/summary
    ├── /api/events   ✅ → 이벤트/환경변수 CRUD
    ├── /api/weather  ⬜ → 날씨 데이터 (기상청 API 프록시)
    └── /api/promotion ⬜ → 본사 행사 아이템 분석
        ↓
[PostgreSQL :5432]  [Redis :6379]
```

### 4.3 주요 DB 테이블

```
users           ✅ → 점주 계정 (email, password_hash, store_name, store_address)
products        ✅ → 상품 마스터 (barcode, name, category, cost_price, selling_price)
sales_records   ✅ → 매출 원본 (user_id FK, product_id FK, sale_date, sale_time, quantity, total_amount)
weather_data    ✅ → 일별 날씨 모델 생성 완료 (API 연동은 미착수)
events          ✅ → 이벤트/환경변수 (user_id FK, event_date, event_type, description)
upload_history  ✅ → 업로드 이력 (file_name, file_type, record_count, status, error_message)
promotions      ⬜ → 본사 행사 아이템 정보 (미구현)
```

## 5. 목표 및 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 폐기율 | **10% 미만** | (폐기 금액 / 총 입고 금액) × 100 |
| 매출 증가 | **30% 이상** | 도입 전후 동기간 매출 비교 |
| 행사 이익율 | **극대화** | 행사 참여 건별 실제 이익율 추적 |
| 사용자 만족도 | 주 3회 이상 접속 | 접속 빈도 로그 |

## 6. 개발 로드맵 (Phase별)

### Phase 1: MVP — ✅ 완료 (2026-03-15)

- [x] 프로젝트 셋업 (Next.js 15 + FastAPI + PostgreSQL + Redis + Docker Compose)
- [x] 사용자 인증 (로그인/회원가입 — JWT HS256, bcrypt)
- [x] 엑셀/CSV 업로드 및 파싱 (한글 컬럼명 자동 매핑, 중복 감지)
- [x] 업로드 이력 조회 (`GET /api/upload/history`)
- [x] 기본 매출 대시보드 (일별/주별/월별 탭, 카테고리별 파이차트, 상위 상품)
- [x] 매출 조회 페이지 (날짜·카테고리 필터, 서버사이드 페이지네이션)
- [x] 분석 API 전체 (`/api/analysis/daily|monthly|category|products|summary`)
- [x] 이벤트 모델 + CRUD API (`GET/POST/DELETE /api/events`)
- [x] 날씨 DB 모델 (`weather_data` 테이블 — API 연동은 Phase 2)
- [x] MCP 서버 설정 (`.mcp.json` — PostgreSQL / Redis / Docker)
- [x] 프론트엔드 전체 실제 API 연동 (login/register/dashboard/sales/upload)

---

### Phase 2: 환경 변수 연동 — ⬜ 진행 예정

- [ ] `backend/app/services/weather.py` — 기상청 단기예보 API 연동
- [ ] `backend/app/routers/weather.py` — `GET /api/weather`
- [ ] `backend/app/routers/analysis.py` — `GET /api/analysis/hourly` 엔드포인트 추가
- [ ] 공휴일 API 연동 (data.go.kr) — 연간 1회 일괄 수집
- [ ] `frontend/src/app/settings/page.tsx` — 이벤트 CRUD를 `/api/events`에 연동
- [ ] `frontend/src/app/analysis/page.tsx` — mock 제거, 실제 API + 날씨/이벤트 병합
- [ ] 환경 변수-매출 상관관계 시각화 (날씨 조건별 평균 매출 BarChart)

---

### Phase 3: OCR + 고급 분석 — ⬜ 미착수

- [ ] `backend/app/services/ocr.py` — OCR 파이프라인 (pytesseract 또는 Claude Vision API)
- [ ] `POST /api/upload/screenshot` — 이미지 업로드 → OCR 결과 반환 (미저장)
- [ ] `POST /api/upload/screenshot/confirm` — 사용자 확인 후 저장
- [ ] `frontend/src/app/upload/page.tsx` — [파일 업로드] / [스크린샷 OCR] 탭 추가
- [ ] OCR 결과 인라인 편집 UI
- [ ] 수요 예측 모델 (이동평균 기반, `GET /api/analysis/predict`)
- [ ] 폐기 위험 알림 (`GET /api/analysis/waste-risk`)

---

### Phase 4: 행사 분석 + 최적화 — ⬜ 미착수

- [ ] `backend/app/routers/promotion.py` — `POST /api/promotion/calculate`
- [ ] `frontend/src/app/promotion/page.tsx` — `/api/promotion` API 연동
- [ ] 점포 적합성 분석 (과거 유사 상품 매출 기반)
- [ ] Redis 캐싱 적용 (`analysis:*` 키, 5분 TTL — 현재 미적용)
- [ ] 발주 추천 기능

---

## 7. 프로젝트 구조 (실제)

```
convienceStore/
├── docker-compose.yml          ✅
├── .mcp.json                   ✅ (PostgreSQL / Redis / Docker MCP)
├── PRD.md / CLAUDE.md / WORKFLOW.md
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/      ✅ API 연동
│       │   ├── sales/          ✅ API 연동
│       │   ├── upload/         ✅ API 연동
│       │   ├── analysis/       ⬜ mock 데이터 (Phase 2)
│       │   ├── promotion/      ⬜ mock 데이터 (Phase 4)
│       │   ├── settings/       ⬜ mock 데이터 (Phase 2)
│       │   ├── login/          ✅ API 연동
│       │   └── register/       ✅ API 연동
│       ├── components/
│       │   ├── dashboard/      ✅ (SummaryCards, SalesChart, CategoryChart, TopProducts)
│       │   ├── upload/         ✅ (FileUploader)
│       │   ├── layout/         ✅ (Sidebar, Header)
│       │   └── common/         ✅ (LoadingSpinner)
│       ├── lib/
│       │   ├── api.ts          ✅ (authApi / salesApi / analysisApi / uploadApi)
│       │   └── auth.ts         ✅
│       ├── store/authStore.ts  ✅
│       └── types/index.ts      ✅
└── backend/
    └── app/
        ├── main.py             ✅ (auth/sales/upload/analysis/events 라우터)
        ├── core/               ✅ (config, database, security)
        ├── models/             ✅ (user/product/sales/upload/event/weather)
        ├── schemas/            ✅ (user/sales/upload/event/analysis)
        ├── routers/            ✅ (auth/sales/upload/analysis/events)
        └── services/
            ├── auth.py         ✅
            ├── upload.py       ✅
            ├── analysis.py     ✅
            ├── weather.py      ⬜ 미구현
            ├── ocr.py          ⬜ 미구현
            └── prediction.py   ⬜ 미구현
```

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| OCR 인식률 저조 | 데이터 품질 저하 | CU POS 화면 특화 전처리, 수동 수정 UI 제공 |
| 공공 API 장애 | 환경 변수 수집 실패 | Redis 캐싱 + 수동 입력 폴백 |
| 점주 데이터 입력 부담 | 서비스 이탈 | 엑셀 템플릿 제공, OCR 자동화로 부담 최소화 |
| 분석 정확도 | 신뢰도 저하 | 통계 기반 시작 → 점진적 ML 모델 고도화 |
| products 테이블 user_id 없음 | 상품 데이터 유저간 공유 | Phase 2에서 user별 상품 분리 고려 |

## 9. 검증 방법

- [x] **Phase 1**: 샘플 CSV 업로드 → 대시보드 차트 정상 표시
- [ ] **Phase 2**: 기상청 API 호출 → 날씨-매출 상관관계 차트 표시
- [ ] **Phase 3**: CU POS 스크린샷 업로드 → OCR 인식 → 데이터 저장 플로우
- [ ] **전체 E2E**: Docker Compose 기동 → 데이터 입력부터 분석 결과 조회까지

---

## 10. 핵심 결정 사항 요약

- **프로젝트**: 새 프로젝트 (convienceStore)
- **브랜드**: CU 편의점 특화
- **데이터 입력**: POS 스크린샷 OCR + 엑셀/CSV 업로드
- **외부 데이터**: 날씨/휴일은 공공 API, 학교 이벤트 등은 수동 입력
- **기술 스택**: Next.js 15 + FastAPI + PostgreSQL + Redis + Docker
- **현재 상태**: Phase 1 MVP 완료, Phase 2 (환경 변수 연동) 착수 예정
