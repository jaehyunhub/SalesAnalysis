import { Page, Locator, expect } from '@playwright/test';

/**
 * LoginPage POM
 *
 * 대응 소스: src/app/login/page.tsx
 *
 * 폼 필드는 react-hook-form 의 {...register("email")} / {...register("password")} 로
 * 렌더링되어 name 어트리뷰트가 "email" / "password" 로 설정됩니다.
 * 그 외 요소는 텍스트·역할(role) 기반 locator 를 사용합니다.
 */
export class LoginPage {
  readonly page: Page;

  // 이메일 입력 — type="email", name="email"
  readonly emailInput: Locator;

  // 비밀번호 입력 — type="password", name="password"
  readonly passwordInput: Locator;

  // 제출 버튼 — type="submit", 텍스트 "로그인"
  readonly submitButton: Locator;

  /**
   * 에러 메시지 컨테이너
   *
   * 서버 측 에러: <div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
   * 필드 유효성 에러: <p class="mt-1 text-xs text-red-500">
   * 두 가지 모두 포함하는 범용 locator 입니다.
   */
  readonly errorMessage: Locator;

  // 이메일 필드 유효성 에러 (react-hook-form)
  readonly emailError: Locator;

  // 비밀번호 필드 유효성 에러 (react-hook-form)
  readonly passwordError: Locator;

  constructor(page: Page) {
    this.page = page;

    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');

    // 서버 에러 배너 (bg-red-50)
    this.errorMessage = page.locator('div.bg-red-50');

    // 필드 단위 에러 텍스트
    this.emailError = page
      .locator('input[name="email"]')
      .locator('.. >> p.text-red-500');
    this.passwordError = page
      .locator('input[name="password"]')
      .locator('.. >> p.text-red-500');
  }

  /** /login 페이지로 이동 */
  async goto() {
    await this.page.goto('/login');
  }

  /** 이메일 입력 */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /** 비밀번호 입력 */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /** 로그인 폼 제출 */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * 로그인 성공 후 /dashboard 로 리다이렉트 됐는지 검증
   *
   * router.push("/dashboard") 가 호출되면 URL 이 변경됩니다.
   */
  async expectRedirectToDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  /**
   * 이메일 + 비밀번호 입력 후 제출까지 한 번에 처리하는 헬퍼
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }
}
