/**
 * sales.spec.ts — 매출 내역 페이지 E2E 테스트
 *
 * 실제 페이지 구조 근거:
 *  - 검색 필터 카드: "검색 필터" 제목, 시작·종료 날짜 input[type=date], 카테고리 select
 *  - 조회 버튼 텍스트: "조회" / 초기화 버튼 텍스트: "초기화"
 *  - 테이블 헤더 컬럼: 날짜 / 시간 / 상품명 / 카테고리 / 수량 / 금액
 *  - 데이터 없을 때 메시지: "조회된 매출 내역이 없습니다."
 *  - 페이지네이션 버튼 텍스트: "이전" / "다음"  (totalPages > 1 조건부 렌더링)
 *  - 요약 카드: "조회 기간 총 매출 (현재 페이지)" / "총 판매 수량" / "카테고리별 매출"
 *
 * POM: e2e/pages/SalesPage.ts
 */

import { test, expect } from "../../fixtures";
import { SalesPage } from "../../pages/SalesPage";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("매출 내역 페이지", () => {
  test.beforeEach(async ({ authedPage }) => {
    // API 응답 mock: 빈 목록으로 설정하여 UI 구조 검증에 집중
    await authedPage.route("**/api/sales*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
    });

    // waitForResponse를 goto() 이전에 등록 (race condition 방지)
    const salesResponse = authedPage.waitForResponse((res) =>
      res.url().includes("/api/sales") && res.status() === 200
    );
    await authedPage.goto("/sales");
    await salesResponse;
  });

  test("1. 매출 페이지 접근 시 테이블 헤더가 표시된다", async ({ authedPage }) => {
    const salesPage = new SalesPage(authedPage);

    // 필터 카드 제목 확인
    await expect(authedPage.getByText("검색 필터")).toBeVisible();

    // POM: 테이블이 DOM에 존재하는지 확인
    await expect(salesPage.table).toBeVisible();

    // 테이블 헤더 6개 컬럼 모두 확인
    await expect(authedPage.getByRole("columnheader", { name: "날짜" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "시간" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "상품명" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "카테고리" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "수량" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "금액" })).toBeVisible();

    // 데이터 없을 때 빈 상태 메시지 확인
    await expect(authedPage.getByText("조회된 매출 내역이 없습니다.")).toBeVisible();

    // 데이터 행은 없어야 함
    await salesPage.waitForTableReady();
    await expect(salesPage.tableRows).toHaveCount(0);
  });

  test("2. 날짜 필터 입력 후 조회 버튼 클릭 시 API가 재호출된다", async ({ authedPage }) => {
    const salesPage = new SalesPage(authedPage);

    // POM을 통해 날짜 필터 입력
    await salesPage.startDateInput.fill("2026-01-01");
    await salesPage.endDateInput.fill("2026-01-31");

    // 조회 버튼 클릭 후 API 재호출 대기 (race condition 방지)
    const responsePromise = authedPage.waitForResponse((res) =>
      res.url().includes("/api/sales") && res.status() === 200
    );
    await salesPage.applyFilterButton.click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);

    // URL 파라미터에 날짜 필터가 포함되어 있는지 확인
    const url = response.url();
    expect(url).toContain("start_date=2026-01-01");
    expect(url).toContain("end_date=2026-01-31");
  });

  test("3. 카테고리 필터 변경 시 목록이 업데이트된다", async ({ authedPage }) => {
    const salesPage = new SalesPage(authedPage);

    // 초기값은 "전체"
    await expect(salesPage.categoryFilter).toHaveValue("전체");

    // "음료"로 변경 시 API 재호출 확인 (race condition 방지)
    const categoryResponsePromise = authedPage.waitForResponse((res) =>
      res.url().includes("/api/sales") && res.status() === 200
    );
    await salesPage.categoryFilter.selectOption("음료");
    const response = await categoryResponsePromise;

    expect(response.status()).toBe(200);

    // URL에 카테고리 파라미터 포함 확인 ("음료" URL 인코딩)
    const url = response.url();
    expect(url).toContain("category=");

    // 선택된 값 유지 확인
    await expect(salesPage.categoryFilter).toHaveValue("음료");
  });

  test("4. 초기화 버튼 클릭 시 필터가 초기값으로 돌아간다", async ({ authedPage }) => {
    const salesPage = new SalesPage(authedPage);

    // 필터 값 설정
    await salesPage.startDateInput.fill("2026-01-01");
    await salesPage.categoryFilter.selectOption("음료");

    // POM: 초기화 클릭
    await salesPage.resetFilter();

    // 필터가 초기화되었는지 확인
    await expect(salesPage.startDateInput).toHaveValue("");
    await expect(salesPage.categoryFilter).toHaveValue("전체");
  });

  test("5. 페이지네이션 버튼은 데이터가 없을 때 표시되지 않는다", async ({ authedPage }) => {
    // total: 0 이므로 totalPages = 0, 페이지네이션 영역 비표시
    await expect(authedPage.getByRole("button", { name: "이전" })).not.toBeVisible();
    await expect(authedPage.getByRole("button", { name: "다음" })).not.toBeVisible();
  });

  test("6. 데이터가 있을 때 페이지네이션 이전/다음 버튼이 동작한다", async ({ authedPage }) => {
    const salesPage = new SalesPage(authedPage);

    // 21건(2페이지 분량) mock 데이터 설정
    const mockItems = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      sale_date: "2026-01-01",
      sale_time: "10:00:00",
      quantity: 1,
      total_amount: 1000,
      product: { name: `상품${i + 1}`, category: "음료" },
    }));

    let callCount = 0;
    await authedPage.route("**/api/sales*", async (route) => {
      callCount += 1;
      // 1페이지: 20건, 전체 21건 (2페이지 존재)
      if (callCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: mockItems, total: 21 }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ items: [mockItems[0]], total: 21 }),
        });
      }
    });

    const reloadResponse = authedPage.waitForResponse((res) =>
      res.url().includes("/api/sales") && res.status() === 200
    );
    await authedPage.reload();
    await reloadResponse;

    // POM: 페이지네이션 버튼 렌더링 확인
    await expect(salesPage.prevPageButton).toBeVisible({ timeout: 30000 });
    await expect(salesPage.nextPageButton).toBeVisible({ timeout: 30000 });

    // 1페이지: "이전" 비활성화
    await expect(salesPage.prevPageButton).toBeDisabled();
    // 1페이지: "다음" 활성화
    await expect(salesPage.nextPageButton).toBeEnabled();

    // "다음" 클릭 → 2페이지 이동 (race condition 방지)
    const nextResponsePromise = authedPage.waitForResponse((res) =>
      res.url().includes("/api/sales") && res.status() === 200
    );
    await salesPage.nextPageButton.click();
    const nextResponse = await nextResponsePromise;

    const nextUrl = nextResponse.url();
    expect(nextUrl).toContain("page=2");
  });
});
