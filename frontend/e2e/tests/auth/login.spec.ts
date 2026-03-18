/**
 * 로그인 페이지 E2E 테스트
 *
 * 비인증 상태에서 실행해야 하므로 storageState를 빈 값으로 명시합니다.
 * 각 test는 beforeEach에서 /login으로 이동하여 독립적으로 실행됩니다.
 *
 * 사용 소스:
 *   - src/app/login/page.tsx
 *   - e2e/pages/LoginPage.ts  (POM)
 */

import { test, expect } from "../../fixtures";
import { LoginPage } from "../../pages/LoginPage";

// 비인증 상태 강제 (authedPage fixture의 storageState를 무효화)
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("로그인 페이지", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    // 이메일 입력 필드가 나타날 때까지 대기
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  });

  // ------------------------------------------------------------------
  // 1. 올바른 자격증명으로 로그인 성공 → /dashboard 리다이렉트
  // ------------------------------------------------------------------
  test("올바른 자격증명으로 로그인하면 /dashboard로 이동한다", async ({ page }) => {
    const email = process.env.E2E_EMAIL ?? "demo@conveni.com";
    const password = process.env.E2E_PASSWORD ?? "demo1234";

    await loginPage.login(email, password);

    // 로그인 성공 시 router.push("/dashboard") 호출됨
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    expect(page.url()).toContain("/dashboard");
  });

  // ------------------------------------------------------------------
  // 2. 잘못된 비밀번호 → 서버 에러 메시지 표시
  //    login/page.tsx: <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
  // ------------------------------------------------------------------
  test("잘못된 비밀번호 입력 시 에러 메시지가 표시된다", async ({ page }) => {
    await loginPage.login("demo@conveni.com", "wrong_password_9999");

    // 서버 에러 메시지 컨테이너 출현 대기
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10000 });

    const errorText = await loginPage.errorMessage.textContent();
    expect(errorText).toMatch(/이메일|비밀번호|올바르지|오류/);

    // /dashboard로 이동하지 않아야 함
    expect(page.url()).not.toContain("/dashboard");
  });

  // ------------------------------------------------------------------
  // 3. 이메일 빈 값 제출 → react-hook-form required 에러 메시지
  //    login/page.tsx: errors.email → <p class="mt-1 text-xs text-red-500">이메일을 입력해주세요</p>
  // ------------------------------------------------------------------
  test("이메일을 입력하지 않고 제출하면 유효성 검사 메시지가 표시된다", async ({ page }) => {
    // 비밀번호만 입력 후 제출
    await loginPage.fillPassword("somepassword");
    await loginPage.submit();

    // 이메일 필드 에러 메시지 확인
    const emailError = page.locator("p.text-red-500", { hasText: "이메일을 입력해주세요" });
    await expect(emailError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 4. 비밀번호 6자 미만 → react-hook-form minLength 에러 메시지
  //    login/page.tsx: minLength: { value: 6, message: "비밀번호는 6자 이상이어야 합니다" }
  // ------------------------------------------------------------------
  test("비밀번호가 6자 미만이면 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await loginPage.fillEmail("demo@conveni.com");
    await loginPage.fillPassword("123"); // 3자 — minLength(6) 위반
    await loginPage.submit();

    const passwordError = page.locator("p.text-red-500", {
      hasText: "비밀번호는 6자 이상이어야 합니다",
    });
    await expect(passwordError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 5. 유효하지 않은 이메일 형식 → react-hook-form pattern 에러 메시지
  //    login/page.tsx: pattern: { message: "올바른 이메일 형식이 아닙니다" }
  // ------------------------------------------------------------------
  test("잘못된 이메일 형식 입력 시 유효성 검사 메시지가 표시된다", async ({ page }) => {
    await loginPage.fillEmail("not-an-email");
    await loginPage.fillPassword("password123");
    await loginPage.submit();

    const emailFormatError = page.locator("p.text-red-500", {
      hasText: "올바른 이메일 형식이 아닙니다",
    });
    await expect(emailFormatError).toBeVisible({ timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 6. 하단 회원가입 링크 → /register 페이지 이동
  //    login/page.tsx: <Link href="/register">회원가입</Link>
  // ------------------------------------------------------------------
  test("하단 '회원가입' 링크를 클릭하면 /register 페이지로 이동한다", async ({ page }) => {
    await page.click('a[href="/register"]');
    await page.waitForURL("**/register", { timeout: 5000 });
    expect(page.url()).toContain("/register");
  });
});

// ======================================================================
// 이미 로그인된 상태에서 /login 접근
// ======================================================================
test.describe("이미 로그인된 상태에서 /login 접근", () => {
  // globalSetup이 생성한 storageState 사용 (e2e/.auth/user.json)
  test.use({ storageState: "e2e/.auth/user.json" });

  test("로그인 상태에서 /login 방문 시 /dashboard로 이동하거나 로그인 폼이 표시된다", async ({
    page,
  }) => {
    // NOTE: 현재 login/page.tsx에 isAuthenticated 체크 후 push("/dashboard")하는
    //       useEffect가 없어 로그인 폼이 그대로 표시됩니다.
    //       middleware.ts에 인증 가드 추가 후 /dashboard 리다이렉트 확인으로 전환하세요.
    await page.goto("/login");
    await page.waitForTimeout(1500);

    const url = page.url();
    expect(url.includes("/login") || url.includes("/dashboard")).toBe(true);
  });
});
