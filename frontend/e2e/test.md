# ConveniSight E2E 테스트 문서

## 개요

Playwright 기반의 E2E(End-to-End) 테스트 suite입니다.
7개 페이지 × 총 **63개 테스트**를 포함하며, 실제 브라우저(Chromium)에서 UI 동작을 검증합니다.

---

## 실행 방법

```bash
# 전체 테스트 실행 (기본)
npx playwright test

# 특정 spec 파일만 실행
npx playwright test e2e/tests/auth/login.spec.ts

# HTML 리포트 확인
npx playwright show-report

# UI 모드 (대화형)
npx playwright test --ui

# 디버그 모드
npx playwright test --debug e2e/tests/auth/login.spec.ts
```

> **사전 조건**: 백엔드 서버(`:8000`)와 Next.js dev server(`:3000`)가 실행 중이어야 합니다.
> `webServer` 설정으로 `npm run dev`가 자동 시작됩니다 (`reuseExistingServer: true`).

---

## 설정 (`playwright.config.ts`)

| 설정 | 값 | 비고 |
|------|-----|------|
| `testDir` | `./e2e/tests` | 테스트 파일 경로 |
| `timeout` | 90,000ms | 테스트당 최대 실행 시간 |
| `workers` | 1 | 순차 실행 (race condition 방지) |
| `retries` | 1 | flaky 테스트 자동 재시도 |
| `baseURL` | `http://localhost:3000` | Next.js dev server |
| `browser` | Chromium | Desktop Chrome 프로파일 |
| `globalSetup` | `e2e/fixtures/auth.fixture.ts` | 인증 상태(`e2e/.auth/user.json`) 사전 생성 |

---

## 디렉토리 구조

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts     # globalSetup: demo 계정 로그인 → storageState 저장
│   └── index.ts            # authedPage fixture (storageState 주입)
├── pages/                  # Page Object Models (POM)
│   ├── LoginPage.ts
│   ├── SalesPage.ts
│   └── UploadPage.ts
├── tests/
│   ├── analysis/           # 분석 페이지 (8개)
│   ├── auth/               # 로그인(7개) + 회원가입(7개)
│   ├── dashboard/          # 대시보드 (9개)
│   ├── promotion/          # 행사 분석 (11개)
│   ├── sales/              # 매출 내역 (6개)
│   ├── settings/           # 설정 (8개)
│   └── upload/             # 파일 업로드 (7개)
└── test.md                 # 이 문서
```

---

## 테스트 목록 및 결과

### 최종 실행 결과 (2026-03-19)

| 결과 | 수 |
|------|-----|
| ✅ 통과 | 59 |
| ⚠️ Flaky (retry 통과) | 4 |
| ❌ 실패 | 0 |
| **합계** | **63** |

---

### 1. 분석 페이지 (`analysis/analysis.spec.ts`) — 8개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 분석 페이지 접근 시 탭 바의 세 탭이 모두 표시된다 | ✅ |
| 2 | 월별 탭이 기본으로 활성화되어 있다 | ⚠️ Flaky |
| 3 | 월별 탭 - 데이터 없을 때 안내 메시지가 표시된다 | ✅ |
| 4 | 주별 탭 클릭 시 해당 탭이 활성화된다 | ✅ |
| 5 | 일별 탭 클릭 시 날짜 선택기가 표시된다 | ⚠️ Flaky |
| 6 | 탭 전환이 월별 → 주별 → 일별 순서로 모두 가능하다 | ✅ |
| 7 | 월별 탭 - 데이터 있을 때 연도 선택기와 차트가 렌더링된다 | ✅ |
| 8 | 연도 선택기 클릭 시 이전 연도로 이동하고 API가 재호출된다 | ✅ |

---

### 2. 로그인 (`auth/login.spec.ts`) — 7개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 올바른 자격증명으로 로그인하면 /dashboard로 이동한다 | ✅ |
| 2 | 잘못된 비밀번호 입력 시 에러 메시지가 표시된다 | ✅ |
| 3 | 이메일을 입력하지 않고 제출하면 유효성 검사 메시지가 표시된다 | ⚠️ Flaky |
| 4 | 비밀번호가 6자 미만이면 유효성 검사 메시지가 표시된다 | ✅ |
| 5 | 잘못된 이메일 형식 입력 시 유효성 검사 메시지가 표시된다 | ✅ |
| 6 | 하단 '회원가입' 링크를 클릭하면 /register 페이지로 이동한다 | ✅ |
| 7 | 로그인 상태에서 /login 방문 시 /dashboard로 이동하거나 로그인 폼이 표시된다 | ✅ |

---

### 3. 회원가입 (`auth/register.spec.ts`) — 7개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 유효한 정보로 회원가입하면 /dashboard로 이동한다 | ✅ |
| 2 | 이미 등록된 이메일로 가입하면 에러 메시지가 표시된다 | ✅ |
| 3 | 이메일을 입력하지 않으면 유효성 검사 메시지가 표시된다 | ✅ |
| 4 | 점포명을 입력하지 않으면 유효성 검사 메시지가 표시된다 | ✅ |
| 5 | 비밀번호가 6자 미만이면 유효성 검사 메시지가 표시된다 | ✅ |
| 6 | 잘못된 이메일 형식 입력 시 유효성 검사 메시지가 표시된다 | ✅ |
| 7 | 하단 '로그인' 링크를 클릭하면 /login 페이지로 이동한다 | ✅ |

---

### 4. 대시보드 (`dashboard/dashboard.spec.ts`) — 9개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | KPI 요약 카드 4개가 렌더링된다 | ✅ |
| 2 | 기본(일별) 탭에서 KPI 카드 제목이 올바르게 표시된다 | ✅ |
| 3 | 주별 탭 클릭 시 첫 번째 카드 제목이 '이번 주 매출'로 변경된다 | ✅ |
| 4 | 월별 탭 클릭 시 첫 번째 카드 제목이 '이번 달 매출'로 변경된다 | ✅ |
| 5 | 선택된 탭 버튼에 활성 스타일(bg-blue-500)이 적용된다 | ✅ |
| 6 | 매출 추이 차트(recharts SVG)가 렌더링된다 | ✅ |
| 7 | 탭 전환 후에도 차트가 렌더링된 상태를 유지한다 | ✅ |
| 8 | 사이드바에 주요 메뉴 항목이 표시된다 | ✅ |
| 9 | /dashboard 직접 접근 시 /login으로 리다이렉트되거나 대시보드가 표시된다 | ✅ |

---

### 5. 행사 분석 (`promotion/promotion.spec.ts`) — 11개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 행사 분석 페이지 접근 시 두 탭 버튼이 표시된다 | ✅ |
| 2 | 행사 이익율 계산기 탭이 기본으로 활성화되어 있다 | ✅ |
| 3 | 계산기 폼의 모든 입력 필드가 존재한다 | ✅ |
| 4 | 입력 없이 계산하기 클릭 시 에러 메시지가 표시된다 | ✅ |
| 5 | 계산기 폼 입력값이 올바르게 바인딩된다 | ✅ |
| 6 | 유효한 값으로 계산하기 클릭 시 API가 호출되고 결과가 표시된다 | ✅ |
| 7 | 과거 행사 이력 섹션과 빈 상태 메시지가 표시된다 | ✅ |
| 8 | 과거 행사 이력이 있을 때 테이블이 렌더링된다 | ✅ |
| 9 | 폐기 위험 탭 클릭 시 폐기 위험 섹션이 표시된다 | ✅ |
| 10 | 폐기 위험 탭 - 위험 상품이 있을 때 테이블이 렌더링된다 | ✅ |
| 11 | 폐기 위험 탭에서 계산기 탭으로 다시 돌아올 수 있다 | ✅ |

---

### 6. 매출 내역 (`sales/sales.spec.ts`) — 6개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 매출 페이지 접근 시 테이블 헤더가 표시된다 | ✅ |
| 2 | 날짜 필터 입력 후 조회 버튼 클릭 시 API가 재호출된다 | ✅ |
| 3 | 카테고리 필터 변경 시 목록이 업데이트된다 | ✅ |
| 4 | 초기화 버튼 클릭 시 필터가 초기값으로 돌아간다 | ✅ |
| 5 | 페이지네이션 버튼은 데이터가 없을 때 표시되지 않는다 | ✅ |
| 6 | 데이터가 있을 때 페이지네이션 이전/다음 버튼이 동작한다 | ✅ |

---

### 7. 설정 (`settings/settings.spec.ts`) — 8개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 설정 페이지가 올바르게 렌더링된다 | ✅ |
| 2 | 점포 정보 저장 버튼 클릭 시 저장 완료 메시지가 표시된다 | ✅ |
| 3 | 이벤트를 추가하면 등록된 이벤트 목록에 표시된다 | ✅ |
| 4 | 설명을 입력하지 않고 이벤트 추가 시 에러 메시지가 표시된다 | ✅ |
| 5 | 날짜를 입력하지 않고 이벤트 추가 시 에러 메시지가 표시된다 | ✅ |
| 6 | 이벤트 삭제 버튼 클릭 시 해당 이벤트가 목록에서 제거된다 | ✅ |
| 7 | 공휴일 자동 등록 버튼 클릭 시 결과 메시지가 표시된다 | ✅ |
| 8 | 이벤트 유형 드롭다운에 4가지 유형이 표시된다 | ✅ |

---

### 8. 파일 업로드 (`upload/file-upload.spec.ts`) — 7개

| # | 테스트명 | 결과 |
|---|---------|------|
| 1 | 업로드 페이지 접근 시 두 탭 버튼이 모두 표시된다 | ✅ |
| 2 | 파일 업로드 탭이 기본으로 활성화되어 있다 | ✅ |
| 3 | 파일 업로드 탭에서 드래그앤드롭 영역과 file input이 렌더링된다 | ⚠️ Flaky |
| 4 | OCR 탭 클릭 시 스크린샷 OCR 영역으로 전환된다 | ✅ |
| 5 | 파일 업로드 탭으로 다시 돌아올 수 있다 | ✅ |
| 6 | 업로드 이력 섹션과 테이블 헤더가 렌더링된다 | ✅ |
| 7 | 업로드 이력이 있을 때 상태 배지가 올바르게 표시된다 | ✅ |

---

## Flaky 테스트 원인 및 대응

| 테스트 | 원인 | 대응 |
|-------|------|------|
| analysis #2, #5 | Next.js dev server 첫 페이지 컴파일 지연으로 `beforeEach`의 `waitForResponse` 90초 초과 | `retries: 1`로 자동 재시도 |
| login #3 | 동일 원인 (dev server 누적 슬로우다운) | `retries: 1`로 자동 재시도 |
| upload #3 | 동일 원인 | `retries: 1`로 자동 재시도 |

> **Flaky 근본 원인**: Next.js dev server는 각 페이지를 처음 방문할 때 JIT 컴파일합니다.
> 63개 테스트가 순차 실행되면서 서버 부하가 누적되어 일부 `page.goto()` 호출이 90초를 초과합니다.
> **프로덕션 빌드(`npm run build && npm run start`) 사용 시 이 문제가 해소됩니다.**

---

## 인증 설정 (`globalSetup`)

`e2e/fixtures/auth.fixture.ts`에서 테스트 실행 전 한 번 실행됩니다:

1. 데모 계정(`demo@conveni.com` / `demo1234`)으로 로그인
2. 로그인 성공 시 쿠키/로컬스토리지를 `e2e/.auth/user.json`에 저장
3. `storageState: "e2e/.auth/user.json"`을 사용하는 테스트는 자동으로 인증된 상태로 시작

---

## API Mocking 전략

모든 인증된 페이지 테스트는 `page.route()`를 사용하여 API를 mock합니다:

- **목적**: 백엔드 데이터 상태에 독립적인 UI 검증
- **패턴**: `beforeEach`에서 route mock 등록 → `waitForResponse` promise 생성 → `page.goto()` → `await` promise
- **race condition 방지**: `waitForResponse`를 `goto()` 이전에 등록

```typescript
// 패턴 예시
await authedPage.route("**/api/sales*", async (route) => {
  await route.fulfill({ status: 200, body: JSON.stringify(mockData) });
});
const responsePromise = authedPage.waitForResponse(
  (res) => res.url().includes("/api/sales") && res.status() === 200
);
await authedPage.goto("/sales");
await responsePromise;
```
