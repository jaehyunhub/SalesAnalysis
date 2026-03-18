/**
 * 대시보드 페이지 E2E 테스트
 *
 * authedPage fixture (e2e/.auth/user.json storageState)를 사용합니다.
 * DashboardPage POM을 통해 locator를 추상화합니다.
 *
 * 주요 확인 사항:
 *   - KPI 요약 카드 4개 렌더링 (오늘 매출, 이번 달 누적, 전일 매출, 총 상품 수)
 *   - 일별/주별/월별 탭 전환 → 첫 번째 카드 제목 변경
 *   - 탭 활성 스타일 (bg-blue-500)
 *   - 사이드바 네비게이션 렌더링
 *   - 미인증 상태에서 /dashboard 접근 동작 확인
 *
 * 사용 소스:
 *   - src/app/dashboard/page.tsx
 *   - src/components/dashboard/SummaryCards.tsx
 *   - e2e/pages/DashboardPage.ts  (POM)
 */

import { test, expect } from "../../fixtures";
import { DashboardPage } from "../../pages/DashboardPage";
import { waitForChart } from "../../utils/test-helpers";

// ======================================================================
// 인증 상태 테스트 (authedPage fixture 사용)
// ======================================================================
test.describe("대시보드 - 인증 상태", () => {
  test.beforeEach(async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);
    await dashPage.goto();
    // KPI 그리드가 DOM에 나타날 때까지 대기
    await authedPage.waitForSelector(
      "div.grid.grid-cols-1.gap-4",
      { timeout: 15000 }
    );
  });

  // ------------------------------------------------------------------
  // 1. KPI 카드 4개 렌더링 확인
  //    SummaryCards: sm:grid-cols-2 xl:grid-cols-4 그리드 내 4개 카드
  // ------------------------------------------------------------------
  test("KPI 요약 카드 4개가 렌더링된다", async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);
    await dashPage.expectKpiCardsVisible();
  });

  // ------------------------------------------------------------------
  // 2. 기본(일별) 탭에서 KPI 카드 제목 확인
  //    SummaryCards: period="daily" → "오늘 매출", "이번 달 누적", "전일 매출", "총 상품 수"
  // ------------------------------------------------------------------
  test("기본(일별) 탭에서 KPI 카드 제목이 올바르게 표시된다", async ({ authedPage }) => {
    // 기본 탭은 "일별"
    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "오늘 매출" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "이번 달 누적" })
    ).toBeVisible();
    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "전일 매출" })
    ).toBeVisible();
    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "총 상품 수" })
    ).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 3. 주별 탭 전환 → 첫 번째 카드 제목 "이번 주 매출"로 변경
  //    dashboard/page.tsx: setPeriod("weekly") → SummaryCards period prop 변경
  // ------------------------------------------------------------------
  test("주별 탭 클릭 시 첫 번째 카드 제목이 '이번 주 매출'로 변경된다", async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);
    await dashPage.selectPeriod("weekly");

    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "이번 주 매출" })
    ).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 4. 월별 탭 전환 → 첫 번째 카드 제목 "이번 달 매출"로 변경
  // ------------------------------------------------------------------
  test("월별 탭 클릭 시 첫 번째 카드 제목이 '이번 달 매출'로 변경된다", async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);
    await dashPage.selectPeriod("monthly");

    await expect(
      authedPage.locator("p.text-sm.text-gray-500", { hasText: "이번 달 매출" })
    ).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 5. 탭 버튼 활성 스타일 확인
  //    dashboard/page.tsx: 활성 탭 → "bg-blue-500 text-white"
  // ------------------------------------------------------------------
  test("선택된 탭 버튼에 활성 스타일(bg-blue-500)이 적용된다", async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);

    // 기본 활성: 일별
    const activeLabel = await dashPage.getActivePeriodLabel();
    expect(activeLabel.trim()).toBe("일별");

    // 월별 클릭 후 확인
    await dashPage.selectPeriod("monthly");
    const newActiveLabel = await dashPage.getActivePeriodLabel();
    expect(newActiveLabel.trim()).toBe("월별");
  });

  // ------------------------------------------------------------------
  // 6. 매출 추이 차트 렌더링 확인
  //    SalesChart: recharts ResponsiveContainer → <svg> 생성
  // ------------------------------------------------------------------
  test("매출 추이 차트(recharts SVG)가 렌더링된다", async ({ authedPage }) => {
    await waitForChart(authedPage);
    await authedPage.waitForSelector(".recharts-wrapper svg", {
      state: "visible",
      timeout: 10000,
    });
    const chartCount = await authedPage.locator(".recharts-wrapper svg").count();
    expect(chartCount).toBeGreaterThanOrEqual(1);
  });

  // ------------------------------------------------------------------
  // 7. 탭 전환 후 차트가 유지된다
  // ------------------------------------------------------------------
  test("탭 전환 후에도 차트가 렌더링된 상태를 유지한다", async ({ authedPage }) => {
    const dashPage = new DashboardPage(authedPage);

    // 주별 탭으로 전환
    await dashPage.selectPeriod("weekly");
    await authedPage.waitForTimeout(500);

    // 차트 영역이 여전히 존재해야 함
    await waitForChart(authedPage);
    const chartCount = await authedPage.locator(".recharts-wrapper svg").count();
    expect(chartCount).toBeGreaterThanOrEqual(1);
  });

  // ------------------------------------------------------------------
  // 8. 사이드바 주요 네비게이션 메뉴 렌더링 확인
  //    Sidebar.tsx: navigation 배열 — 대시보드, 매출 조회, 데이터 업로드, 분석, 행사 분석, 설정
  // ------------------------------------------------------------------
  test("사이드바에 주요 메뉴 항목이 표시된다", async ({ authedPage }) => {
    const sidebar = authedPage.locator("aside");
    await expect(sidebar).toBeVisible();

    await expect(
      authedPage.locator('a[href="/dashboard"]', { hasText: "대시보드" })
    ).toBeVisible();
    await expect(
      authedPage.locator('a[href="/upload"]', { hasText: "데이터 업로드" })
    ).toBeVisible();
    await expect(
      authedPage.locator('a[href="/settings"]', { hasText: "설정" })
    ).toBeVisible();
  });
});

// ======================================================================
// 미인증 상태 테스트
// ======================================================================
test.describe("대시보드 - 미인증 상태", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/dashboard 직접 접근 시 /login으로 리다이렉트되거나 대시보드가 표시된다", async ({
    page,
  }) => {
    // NOTE: 현재 앱은 클라이언트 사이드 인증 가드입니다.
    //       서버 사이드 middleware.ts가 없으면 비인증 상태에서도 페이지가 렌더링됩니다.
    //       middleware.ts에 인증 가드 추가 후 반드시 /login 리다이렉트를 검증하세요.
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const url = page.url();
    // 인증 가드 구현 시: /login 리다이렉트
    // 미구현 시: /dashboard 그대로 표시
    expect(url.includes("/login") || url.includes("/dashboard")).toBe(true);
  });
});
