/**
 * 회원가입 페이지 E2E 테스트
 *
 * 비인증 상태에서 실행합니다.
 * 각 test는 beforeEach에서 /register로 이동하여 독립적으로 실행됩니다.
 *
 * 폼 필드 구성 (register/page.tsx 기준):
 *   - 이메일   : input[name="email"], placeholder="example@email.com"
 *   - 비밀번호 : input[name="password"], placeholder="비밀번호 입력"
 *   - 점포명   : input[name="store_name"], placeholder="예: CU 강남점"
 *   - 제출     : button[type="submit"] 텍스트 "회원가입"
 */

import { test, expect } from "../../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

/** 매 테스트마다 유니크한 이메일 생성 */
function uniqueEmail(): string {
  return `e2e_${Date.now()}_${Math.floor(Math.random() * 9999)}@testmail.com`;
}

test.describe("회원가입 페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
    // 이메일 입력 필드가 나타날 때까지 대기
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  });

  // ------------------------------------------------------------------
  // 1. 유효한 정보로 회원가입 성공 → /dashboard 리다이렉트
  //    register/page.tsx: authApi.register() 성공 시 router.push("/dashboard")
  // ------------------------------------------------------------------
  test("유효한 정보로 회원가입하면 /dashboard로 이동한다", async ({ page }) => {
    await page.fill('input[name="email"]', uniqueEmail());
    await page.fill('input[name="password"]', "testpass123");
    await page.fill('input[name="store_name"]', "CU 테스트점");
    await page.click('button[type="submit"]');

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");
  });

  // ------------------------------------------------------------------
  // 2. 이미 사용 중인 이메일 → 서버 에러 메시지 표시
  //    register/page.tsx: <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
  // ------------------------------------------------------------------
  test("이미 등록된 이메일로 가입하면 에러 메시지가 표시된다", async ({ page }) => {
    // globalSetup에서 사용하는 기존 계정으로 재시도
    await page.fill('input[name="email"]', "demo@conveni.com");
    await page.fill('input[name="password"]', "demo1234");
    await page.fill('input[name="store_name"]', "CU 강남점");
    await page.click('button[type="submit"]');

    // 서버 에러 배너 출현 대기
    const errorDiv = page.locator("div.rounded-lg.bg-red-50.text-red-600");
    await expect(errorDiv).toBeVisible({ timeout: 10000 });

    const text = await errorDiv.textContent();
    expect(text).toBeTruthy();
    // 에러 문구 확인 ("이미", "중복", "오류" 등 포함)
    expect(text).toMatch(/이미|중복|오류|등록/);

    // /dashboard로 이동하지 않아야 함
    expect(page.url()).not.toContain("/dashboard");
  });

  // ------------------------------------------------------------------
  // 3. 이메일 미입력 → react-hook-form required 에러
  //    register/page.tsx: required: "이메일을 입력해주세요"
  // ------------------------------------------------------------------
  test("이메일을 입력하지 않으면 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await page.fill('input[name="password"]', "testpass123");
    await page.fill('input[name="store_name"]', "CU 테스트점");
    await page.click('button[type="submit"]');

    const emailError = page.locator("p.text-red-500", { hasText: "이메일을 입력해주세요" });
    await expect(emailError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 4. 점포명 미입력 → react-hook-form required 에러
  //    register/page.tsx: required: "점포명을 입력해주세요"
  // ------------------------------------------------------------------
  test("점포명을 입력하지 않으면 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await page.fill('input[name="email"]', uniqueEmail());
    await page.fill('input[name="password"]', "testpass123");
    // store_name 비워두고 제출
    await page.click('button[type="submit"]');

    const storeNameError = page.locator("p.text-red-500", { hasText: "점포명을 입력해주세요" });
    await expect(storeNameError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 5. 비밀번호 6자 미만 → react-hook-form minLength 에러
  //    register/page.tsx: minLength: { value: 6, message: "비밀번호는 6자 이상이어야 합니다" }
  // ------------------------------------------------------------------
  test("비밀번호가 6자 미만이면 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await page.fill('input[name="email"]', uniqueEmail());
    await page.fill('input[name="password"]', "12345"); // 5자
    await page.fill('input[name="store_name"]', "CU 테스트점");
    await page.click('button[type="submit"]');

    const passwordError = page.locator("p.text-red-500", {
      hasText: "비밀번호는 6자 이상이어야 합니다",
    });
    await expect(passwordError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 6. 잘못된 이메일 형식 → react-hook-form pattern 에러
  //    register/page.tsx: pattern: { message: "올바른 이메일 형식이 아닙니다" }
  // ------------------------------------------------------------------
  test("잘못된 이메일 형식 입력 시 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await page.fill('input[name="email"]', "invalid-email-format");
    await page.fill('input[name="password"]', "testpass123");
    await page.fill('input[name="store_name"]', "CU 테스트점");
    await page.click('button[type="submit"]');

    const emailFormatError = page.locator("p.text-red-500", {
      hasText: "올바른 이메일 형식이 아닙니다",
    });
    await expect(emailFormatError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 7. 하단 로그인 링크 → /login 페이지 이동
  //    register/page.tsx: <Link href="/login">로그인</Link>
  // ------------------------------------------------------------------
  test("하단 '로그인' 링크를 클릭하면 /login 페이지로 이동한다", async ({ page }) => {
    await page.click('a[href="/login"]');
    await page.waitForURL("**/login", { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });
});
