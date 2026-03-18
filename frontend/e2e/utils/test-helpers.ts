import { type Page } from "@playwright/test";

/**
 * Recharts SVG가 렌더링될 때까지 대기합니다.
 * ResponsiveContainer 하위의 svg 요소가 나타날 때까지 기다립니다.
 */
export async function waitForChart(page: Page): Promise<void> {
  await page.waitForSelector(".recharts-wrapper svg", {
    state: "visible",
    timeout: 10000,
  });
}

/**
 * 로딩 스피너(animate-spin 클래스)가 사라질 때까지 대기합니다.
 */
export async function waitForLoading(page: Page): Promise<void> {
  // animate-spin 클래스를 가진 요소가 없을 때까지 대기
  try {
    await page.waitForSelector(".animate-spin", {
      state: "detached",
      timeout: 10000,
    });
  } catch {
    // 처음부터 스피너가 없는 경우 정상 처리
  }
}

/**
 * date 타입 input에 날짜 값을 입력합니다.
 * @param page Playwright Page 객체
 * @param selector input 요소 선택자
 * @param date "YYYY-MM-DD" 형식의 날짜 문자열
 */
export async function fillDateInput(
  page: Page,
  selector: string,
  date: string
): Promise<void> {
  const input = page.locator(selector);
  await input.focus();
  // input[type="date"]는 직접 fill로 처리
  await input.fill(date);
  // 변경 이벤트 트리거
  await input.dispatchEvent("change");
}
