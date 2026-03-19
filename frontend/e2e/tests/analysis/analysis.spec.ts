/**
 * analysis.spec.ts — 분석 페이지 E2E 테스트
 *
 * 실제 페이지 구조 근거:
 *  - 탭 버튼 텍스트: "월별" / "주별" / "일별"  (type AnalysisTab = "monthly"|"weekly"|"daily")
 *  - 기본 활성 탭: "monthly" (월별)
 *  - 월별 탭: 연도 선택기 (이전연도 ← / 다음연도 → 버튼 + 현재연도 텍스트)
 *  - 월별 탭: "월별 매출 현황" 제목과 ComposedChart (h-[320px] 컨테이너 내부 SVG)
 *  - 데이터 없을 때 메시지: "해당 연도의 매출 데이터가 없습니다."
 *  - 일별 탭: input[type=date] 날짜 선택기
 *  - 로딩 중: animate-spin 클래스를 가진 스피너 + "데이터를 불러오는 중..." 텍스트
 */

import { test, expect } from "../../fixtures";
import { waitForChart, waitForLoading } from "../../utils/test-helpers";

test.use({ storageState: "e2e/.auth/user.json" });

/** 분석 페이지 API들을 빈 응답으로 mock하는 헬퍼 */
async function mockAnalysisApis(authedPage: import("@playwright/test").Page) {
  await authedPage.route("**/api/analysis/monthly*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/analysis/daily*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/analysis/hourly*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/analysis/category*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/analysis/products*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/weather/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await authedPage.route("**/api/events*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

test.describe("분석 페이지", () => {
  test.beforeEach(async ({ authedPage }) => {
    await mockAnalysisApis(authedPage);
    // waitForResponse를 goto() 이전에 등록 (race condition 방지)
    const monthlyResponse = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/monthly") && res.status() === 200
    );
    await authedPage.goto("/analysis");
    await monthlyResponse;
  });

  test("1. 분석 페이지 접근 시 탭 바의 세 탭이 모두 표시된다", async ({ authedPage }) => {
    await expect(authedPage.getByRole("button", { name: "월별" })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: "주별" })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: "일별" })).toBeVisible();
  });

  test("2. 월별 탭이 기본으로 활성화되어 있다", async ({ authedPage }) => {
    const monthlyBtn = authedPage.getByRole("button", { name: "월별" });

    // 활성 탭: bg-blue-500 text-white 클래스
    await expect(monthlyBtn).toHaveClass(/bg-blue-500/);
    await expect(monthlyBtn).toHaveClass(/text-white/);

    // 비활성 탭은 bg-blue-500 없음
    await expect(authedPage.getByRole("button", { name: "주별" })).not.toHaveClass(/bg-blue-500/);
    await expect(authedPage.getByRole("button", { name: "일별" })).not.toHaveClass(/bg-blue-500/);
  });

  test("3. 월별 탭 - 데이터 없을 때 안내 메시지가 표시된다", async ({ authedPage }) => {
    await expect(authedPage.getByText("해당 연도의 매출 데이터가 없습니다.")).toBeVisible();
  });

  test("4. 주별 탭 클릭 시 해당 탭이 활성화된다", async ({ authedPage }) => {
    const weeklyBtn = authedPage.getByRole("button", { name: "주별" });

    const weeklyApiRes = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/daily") && res.status() === 200
    );
    await weeklyBtn.click();
    await weeklyApiRes;

    await expect(weeklyBtn).toHaveClass(/bg-blue-500/);
    await expect(weeklyBtn).toHaveClass(/text-white/);

    // 월별 탭은 비활성화
    await expect(authedPage.getByRole("button", { name: "월별" })).not.toHaveClass(/bg-blue-500/);
  });

  test("5. 일별 탭 클릭 시 날짜 선택기가 표시된다", async ({ authedPage }) => {
    const dailyBtn = authedPage.getByRole("button", { name: "일별" });

    const hourlyApiRes = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/hourly") && res.status() === 200
    );
    await dailyBtn.click();
    await hourlyApiRes;

    await expect(dailyBtn).toHaveClass(/bg-blue-500/);

    // 일별 탭에는 날짜 선택 input[type=date]가 렌더링되어야 함
    const dateInput = authedPage.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // 기본값: 오늘 날짜 (ISO 형식)
    const today = new Date().toISOString().split("T")[0];
    await expect(dateInput).toHaveValue(today);
  });

  test("6. 탭 전환이 월별 → 주별 → 일별 순서로 모두 가능하다", async ({ authedPage }) => {
    // 월별 → 주별
    const weeklyRes = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/daily") && res.status() === 200
    );
    await authedPage.getByRole("button", { name: "주별" }).click();
    await weeklyRes;
    await expect(authedPage.getByRole("button", { name: "주별" })).toHaveClass(/bg-blue-500/);

    // 주별 → 일별
    const hourlyRes = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/hourly") && res.status() === 200
    );
    await authedPage.getByRole("button", { name: "일별" }).click();
    await hourlyRes;
    await expect(authedPage.getByRole("button", { name: "일별" })).toHaveClass(/bg-blue-500/);

    // 일별 → 월별
    const monthlyRes2 = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/monthly") && res.status() === 200
    );
    await authedPage.getByRole("button", { name: "월별" }).click();
    await monthlyRes2;
    await expect(authedPage.getByRole("button", { name: "월별" })).toHaveClass(/bg-blue-500/);
  });

  test("7. 월별 탭 - 데이터 있을 때 연도 선택기와 차트가 렌더링된다", async ({ authedPage }) => {
    const currentYear = new Date().getFullYear();

    // 월별 API에 데이터 있는 응답으로 mock 재설정
    await authedPage.route("**/api/analysis/monthly*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { year: currentYear, month: 1, total_amount: 1200000, total_quantity: 300 },
          { year: currentYear, month: 2, total_amount: 1500000, total_quantity: 380 },
          { year: currentYear, month: 3, total_amount: 1800000, total_quantity: 450 },
        ]),
      });
    });

    const reloadRes7 = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/monthly") && res.status() === 200
    );
    await authedPage.reload();
    await reloadRes7;

    // 연도 텍스트 표시 확인
    await expect(authedPage.getByText(`${currentYear}년`)).toBeVisible();

    // 이전/다음 연도 이동 버튼 확인
    await expect(
      authedPage.getByRole("button", { name: String(currentYear - 1) })
    ).toBeVisible();
    await expect(
      authedPage.getByRole("button", { name: String(currentYear + 1) })
    ).toBeVisible();

    // 로딩 스피너가 사라질 때까지 대기
    await waitForLoading(authedPage);

    // waitForChart 유틸: Recharts SVG 렌더링 대기
    await waitForChart(authedPage);

    // SVG 요소 존재 확인
    const chart = authedPage.locator(".recharts-wrapper svg").first();
    await expect(chart).toBeVisible();

    // 차트 제목 확인
    await expect(authedPage.getByText("월별 매출 현황")).toBeVisible();
  });

  test("8. 연도 선택기 클릭 시 이전 연도로 이동하고 API가 재호출된다", async ({ authedPage }) => {
    const currentYear = new Date().getFullYear();

    // 데이터 있는 응답 설정
    await authedPage.route("**/api/analysis/monthly*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { year: currentYear, month: 1, total_amount: 1000000, total_quantity: 250 },
        ]),
      });
    });

    const reloadRes8 = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/monthly") && res.status() === 200
    );
    await authedPage.reload();
    await reloadRes8;

    // 이전 연도 버튼 클릭
    const prevYearResponsePromise = authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/monthly") && res.status() === 200
    );
    await authedPage.getByRole("button", { name: String(currentYear - 1) }).click();
    const prevYearApiRes = await prevYearResponsePromise;

    expect(prevYearApiRes.status()).toBe(200);

    // URL에 이전 연도 파라미터 포함 확인
    const url = prevYearApiRes.url();
    expect(url).toContain(`year=${currentYear - 1}`);
  });
});
