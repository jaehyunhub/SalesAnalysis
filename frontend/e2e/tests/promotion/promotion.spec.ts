/**
 * promotion.spec.ts — 행사 분석 페이지 E2E 테스트
 *
 * 실제 페이지 구조 근거:
 *  - 탭 버튼 텍스트: "행사 이익율 계산기" / "폐기 위험 알림"  (type TabType = "calculator" | "waste-risk")
 *  - 기본 활성 탭: "calculator"
 *  - 계산기 폼 필드 label:
 *    "상품명" / "행사명" / "입고가 (원)" / "판매가 (원)" / "예상 판매량 (개)" / "예상 폐기율 (%)"
 *  - 계산기 폼 placeholder: "예) 바나나맛 우유" / "예) 1+1 행사" / "900" / "1500" / "100"
 *  - 계산하기 버튼 텍스트: "계산하기"
 *  - 과거 행사 이력 섹션 제목: "과거 행사 이력"
 *  - 이력 없을 때 메시지: "등록된 행사 이력이 없습니다."
 *  - 폐기 위험 탭: "폐기 위험 알림" 제목
 *  - 폐기 위험 없을 때 메시지: "현재 폐기 위험 상품이 없습니다."
 *  - 계산 에러 메시지: "입고가, 판매가, 예상 판매량을 입력해주세요."
 */

import { test, expect } from "../../fixtures";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("행사 분석 페이지", () => {
  test.beforeEach(async ({ authedPage }) => {
    // 행사 이력 API mock: 빈 목록
    await authedPage.route("**/api/promotion/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
    });

    // 폐기 위험 API mock: 빈 목록 (waste-risk 탭 전환 시 호출)
    await authedPage.route("**/api/analysis/waste-risk*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
    });

    await authedPage.goto("/promotion");
    // 이력 API 응답 대기
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/promotion/history") && res.status() === 200
    );
  });

  test("1. 행사 분석 페이지 접근 시 두 탭 버튼이 표시된다", async ({ authedPage }) => {
    await expect(authedPage.getByRole("button", { name: "행사 이익율 계산기" })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: "폐기 위험 알림" })).toBeVisible();
  });

  test("2. 행사 이익율 계산기 탭이 기본으로 활성화되어 있다", async ({ authedPage }) => {
    const calcTab = authedPage.getByRole("button", { name: "행사 이익율 계산기" });

    // 활성 탭: bg-blue-500 text-white 클래스
    await expect(calcTab).toHaveClass(/bg-blue-500/);
    await expect(calcTab).toHaveClass(/text-white/);

    // 폐기 위험 탭은 비활성 (border-gray-300 스타일)
    const wasteTab = authedPage.getByRole("button", { name: "폐기 위험 알림" });
    await expect(wasteTab).not.toHaveClass(/bg-blue-500/);
  });

  test("3. 계산기 폼의 모든 입력 필드가 존재한다", async ({ authedPage }) => {
    // label 텍스트로 필드 존재 확인
    await expect(authedPage.getByText("상품명")).toBeVisible();
    await expect(authedPage.getByText("행사명")).toBeVisible();
    await expect(authedPage.getByText("입고가 (원)")).toBeVisible();
    await expect(authedPage.getByText("판매가 (원)")).toBeVisible();
    await expect(authedPage.getByText("예상 판매량 (개)")).toBeVisible();
    await expect(authedPage.getByText("예상 폐기율 (%)")).toBeVisible();

    // placeholder로 input 존재 확인
    await expect(authedPage.getByPlaceholder("예) 바나나맛 우유")).toBeVisible();
    await expect(authedPage.getByPlaceholder("예) 1+1 행사")).toBeVisible();
    await expect(authedPage.getByPlaceholder("900")).toBeVisible();
    await expect(authedPage.getByPlaceholder("1500")).toBeVisible();
    await expect(authedPage.getByPlaceholder("100")).toBeVisible();

    // 계산하기 버튼
    await expect(authedPage.getByRole("button", { name: "계산하기" })).toBeVisible();
    await expect(authedPage.getByRole("button", { name: "계산하기" })).toBeEnabled();
  });

  test("4. 입력 없이 계산하기 클릭 시 에러 메시지가 표시된다", async ({ authedPage }) => {
    await authedPage.getByRole("button", { name: "계산하기" }).click();

    await expect(
      authedPage.getByText("입고가, 판매가, 예상 판매량을 입력해주세요.")
    ).toBeVisible();
  });

  test("5. 계산기 폼 입력값이 올바르게 바인딩된다", async ({ authedPage }) => {
    await authedPage.getByPlaceholder("예) 바나나맛 우유").fill("바나나맛 우유");
    await authedPage.getByPlaceholder("예) 1+1 행사").fill("1+1 행사");
    await authedPage.getByPlaceholder("900").fill("800");
    await authedPage.getByPlaceholder("1500").fill("1200");
    await authedPage.getByPlaceholder("100").fill("50");

    await expect(authedPage.getByPlaceholder("예) 바나나맛 우유")).toHaveValue("바나나맛 우유");
    await expect(authedPage.getByPlaceholder("예) 1+1 행사")).toHaveValue("1+1 행사");
    await expect(authedPage.getByPlaceholder("900")).toHaveValue("800");
    await expect(authedPage.getByPlaceholder("1500")).toHaveValue("1200");
    await expect(authedPage.getByPlaceholder("100")).toHaveValue("50");
  });

  test("6. 유효한 값으로 계산하기 클릭 시 API가 호출되고 결과가 표시된다", async ({ authedPage }) => {
    // calculate API mock
    await authedPage.route("**/api/promotion/calculate*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          joined: {
            label: "행사 참여",
            expected_qty: 60,
            total_revenue: 72000,
            total_cost: 48000,
            waste_cost: 2400,
            net_profit: 21600,
            profit_rate: 30.0,
          },
          not_joined: {
            label: "행사 미참여",
            expected_qty: 50,
            total_revenue: 60000,
            total_cost: 40000,
            waste_cost: 2000,
            net_profit: 18000,
            profit_rate: 30.0,
          },
          recommendation: "행사 참여를 권장합니다.",
          break_even_qty: 40,
        }),
      });
    });

    // 폼 입력
    await authedPage.getByPlaceholder("900").fill("800");
    await authedPage.getByPlaceholder("1500").fill("1200");
    await authedPage.getByPlaceholder("100").fill("50");

    const [calcResponse] = await Promise.all([
      authedPage.waitForResponse((res) =>
        res.url().includes("/api/promotion/calculate") && res.status() === 200
      ),
      authedPage.getByRole("button", { name: "계산하기" }).click(),
    ]);

    expect(calcResponse.status()).toBe(200);

    // 결과 카드 표시 확인 (참여 / 미참여 비교)
    await expect(authedPage.getByText("행사 참여")).toBeVisible();
    await expect(authedPage.getByText("행사 미참여")).toBeVisible();

    // 추천 메시지 표시 확인
    await expect(authedPage.getByText("행사 참여를 권장합니다.")).toBeVisible();

    // 손익분기 판매량 표시 확인
    await expect(authedPage.getByText(/손익분기 판매량/)).toBeVisible();
  });

  test("7. 과거 행사 이력 섹션과 빈 상태 메시지가 표시된다", async ({ authedPage }) => {
    // 계산기 탭에서 이력 섹션 확인
    await expect(authedPage.getByText("과거 행사 이력")).toBeVisible();
    await expect(authedPage.getByText("등록된 행사 이력이 없습니다.")).toBeVisible();
  });

  test("8. 과거 행사 이력이 있을 때 테이블이 렌더링된다", async ({ authedPage }) => {
    // 이력 데이터가 있는 응답으로 재설정
    await authedPage.route("**/api/promotion/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: 1,
              promotion_name: "1+1 행사",
              product_name: "바나나맛 우유",
              start_date: "2026-01-01",
              end_date: "2026-01-07",
              cost_price: 800,
              sale_price: 1200,
              expected_qty: 50,
              waste_rate: 5,
              joined: true,
              actual_qty: 55,
              actual_profit_rate: 32.5,
            },
          ],
          total: 1,
        }),
      });
    });

    await authedPage.reload();
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/promotion/history") && res.status() === 200
    );

    // 이력 테이블 헤더 확인
    await expect(authedPage.getByRole("columnheader", { name: "행사명" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "상품명" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "기간" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "참여" })).toBeVisible();

    // 데이터 행 확인
    await expect(authedPage.getByText("1+1 행사")).toBeVisible();
    await expect(authedPage.getByText("바나나맛 우유")).toBeVisible();

    // 참여 배지 확인
    await expect(authedPage.getByText("참여")).toBeVisible();
  });

  test("9. 폐기 위험 탭 클릭 시 폐기 위험 섹션이 표시된다", async ({ authedPage }) => {
    const wasteTab = authedPage.getByRole("button", { name: "폐기 위험 알림" });

    const [wasteResponse] = await Promise.all([
      authedPage.waitForResponse((res) =>
        res.url().includes("/api/analysis/waste-risk") && res.status() === 200
      ),
      wasteTab.click(),
    ]);

    expect(wasteResponse.status()).toBe(200);

    // 탭 활성화 확인
    await expect(wasteTab).toHaveClass(/bg-blue-500/);

    // 폐기 위험 섹션 표시 확인
    await expect(authedPage.getByText("폐기 위험 알림")).toBeVisible();

    // 데이터 없을 때 안내 메시지 확인
    await expect(authedPage.getByText("현재 폐기 위험 상품이 없습니다.")).toBeVisible();
    await expect(
      authedPage.getByText("매출 데이터가 충분히 쌓이면 자동으로 분석됩니다.")
    ).toBeVisible();
  });

  test("10. 폐기 위험 탭 - 위험 상품이 있을 때 테이블이 렌더링된다", async ({ authedPage }) => {
    // 위험 상품 데이터 있는 응답으로 재설정
    await authedPage.route("**/api/analysis/waste-risk*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              product_id: 1,
              product_name: "삼각김밥 참치마요",
              category: "도시락/간편식",
              recent_7day_qty: 10,
              avg_30day_qty: 25,
              decline_rate: 60.0,
              risk_level: "high",
            },
            {
              product_id: 2,
              product_name: "컵라면 신라면",
              category: "식품",
              recent_7day_qty: 18,
              avg_30day_qty: 28,
              decline_rate: 35.7,
              risk_level: "medium",
            },
          ],
          total: 2,
        }),
      });
    });

    // 폐기 위험 탭으로 전환
    await authedPage.getByRole("button", { name: "폐기 위험 알림" }).click();
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/waste-risk") && res.status() === 200
    );

    // 테이블 헤더 확인
    await expect(authedPage.getByRole("columnheader", { name: "상품명" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "카테고리" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "최근 7일 판매량" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "30일 평균 판매량" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "감소율" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "위험도" })).toBeVisible();

    // 데이터 행 확인
    await expect(authedPage.getByText("삼각김밥 참치마요")).toBeVisible();
    await expect(authedPage.getByText("컵라면 신라면")).toBeVisible();

    // 위험도 배지 확인 (높음 / 보통)
    await expect(authedPage.getByText("높음")).toBeVisible();
    await expect(authedPage.getByText("보통")).toBeVisible();
  });

  test("11. 폐기 위험 탭에서 계산기 탭으로 다시 돌아올 수 있다", async ({ authedPage }) => {
    // 폐기 위험 탭으로 전환
    await authedPage.getByRole("button", { name: "폐기 위험 알림" }).click();
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/analysis/waste-risk") && res.status() === 200
    );

    // 계산기 탭으로 복귀
    await authedPage.getByRole("button", { name: "행사 이익율 계산기" }).click();

    const calcTab = authedPage.getByRole("button", { name: "행사 이익율 계산기" });
    await expect(calcTab).toHaveClass(/bg-blue-500/);

    // 계산기 폼이 다시 표시되어야 함
    await expect(authedPage.getByRole("button", { name: "계산하기" })).toBeVisible();
  });
});
