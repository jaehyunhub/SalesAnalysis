import { Page, Locator, expect } from '@playwright/test';

/**
 * SalesPage POM
 *
 * 대응 소스: src/app/sales/page.tsx
 *
 * 주요 UI 구성:
 *   1. 검색 필터 카드 — 시작/종료 날짜(type="date"), 카테고리 <select>, 조회/초기화 버튼
 *   2. 요약 통계 카드 3개 (총 매출, 총 수량, 카테고리별 매출)
 *   3. 매출 내역 테이블 (<table> — thead/tbody)
 *   4. 페이지네이션 (이전/다음 버튼, 페이지 번호 버튼) — totalPages > 1 일 때만 렌더링
 *
 * 날짜 입력에는 label 이 "시작 날짜", "종료 날짜" 로 지정되어 있습니다.
 * 카테고리 <select> 는 label "카테고리" 와 연결되어 있습니다.
 */
export class SalesPage {
  readonly page: Page;

  // ── 필터 섹션 ──────────────────────────────────────────────
  /** 시작 날짜 — label "시작 날짜" 바로 아래 type="date" input */
  readonly startDateInput: Locator;

  /** 종료 날짜 — label "종료 날짜" 바로 아래 type="date" input */
  readonly endDateInput: Locator;

  /**
   * 카테고리 필터 select
   * 값: "전체" | "음료" | "도시락/간편식" | "과자/스낵" | "유제품" | "생활용품" | "담배" | "식품" | "기타"
   */
  readonly categoryFilter: Locator;

  /** 조회 버튼 — bg-blue-500, 텍스트 "조회" */
  readonly applyFilterButton: Locator;

  /** 초기화 버튼 — border-gray-300, 텍스트 "초기화" */
  readonly resetFilterButton: Locator;

  // ── 테이블 섹션 ────────────────────────────────────────────
  /**
   * 매출 내역 테이블 tbody 행 전체
   * 각 행: <tr class="border-b border-gray-100 text-gray-700">
   */
  readonly tableRows: Locator;

  /** 테이블 전체 (<table>) */
  readonly table: Locator;

  // ── 페이지네이션 ───────────────────────────────────────────
  /** "이전" 버튼 */
  readonly prevPageButton: Locator;

  /** "다음" 버튼 */
  readonly nextPageButton: Locator;

  /**
   * 현재 페이지 번호 버튼 (bg-blue-500 으로 활성 표시)
   */
  readonly activePageButton: Locator;

  /**
   * 페이지 번호 버튼 전체 (이전/다음 제외)
   * — 각 페이지 버튼: "border border-gray-300 text-gray-600" or "bg-blue-500 text-white"
   */
  readonly pageButtons: Locator;

  constructor(page: Page) {
    this.page = page;

    // 날짜 입력 — label 텍스트로 식별
    this.startDateInput = page
      .locator('label', { hasText: '시작 날짜' })
      .locator('+ input[type="date"]');
    this.endDateInput = page
      .locator('label', { hasText: '종료 날짜' })
      .locator('+ input[type="date"]');

    // 카테고리 select — label 텍스트로 식별
    this.categoryFilter = page
      .locator('label', { hasText: '카테고리' })
      .locator('+ select');

    // 조회 / 초기화 버튼 — 텍스트로 식별
    this.applyFilterButton = page.getByRole('button', { name: '조회' });
    this.resetFilterButton = page.getByRole('button', { name: '초기화' });

    // 테이블
    this.table = page.locator('table').filter({
      has: page.locator('th', { hasText: '날짜' }),
    });
    this.tableRows = this.table.locator('tbody tr.border-b.border-gray-100');

    // 페이지네이션
    // 페이지네이션 컨테이너: mt-4 flex items-center justify-center gap-2
    const paginationContainer = page.locator(
      'div.mt-4.flex.items-center.justify-center.gap-2'
    );
    this.prevPageButton = paginationContainer.getByRole('button', { name: '이전' });
    this.nextPageButton = paginationContainer.getByRole('button', { name: '다음' });
    this.activePageButton = paginationContainer.locator('button.bg-blue-500');
    // 이전/다음을 제외한 숫자 버튼들
    this.pageButtons = paginationContainer.locator(
      'button:not(:has-text("이전")):not(:has-text("다음"))'
    );
  }

  /** /sales 페이지로 이동 */
  async goto() {
    await this.page.goto('/sales');
  }

  /**
   * 날짜 범위 + 카테고리 설정 후 조회 버튼 클릭
   * @param startDate 'YYYY-MM-DD' 형식 (옵션)
   * @param endDate   'YYYY-MM-DD' 형식 (옵션)
   * @param category  카테고리 텍스트 (옵션, 기본 "전체")
   */
  async applyFilter(startDate?: string, endDate?: string, category?: string) {
    if (startDate) {
      await this.startDateInput.fill(startDate);
    }
    if (endDate) {
      await this.endDateInput.fill(endDate);
    }
    if (category) {
      await this.categoryFilter.selectOption(category);
    }
    await this.applyFilterButton.click();
  }

  /** 필터 초기화 */
  async resetFilter() {
    await this.resetFilterButton.click();
  }

  /**
   * 특정 페이지 번호로 이동
   * @param pageNumber 1부터 시작하는 페이지 번호
   */
  async goToPage(pageNumber: number) {
    const paginationContainer = this.page.locator(
      'div.mt-4.flex.items-center.justify-center.gap-2'
    );
    await paginationContainer
      .getByRole('button', { name: String(pageNumber) })
      .click();
  }

  /**
   * 테이블에 표시된 건수 텍스트 반환
   * "총 N건" 형태로 테이블 헤더 우측에 표시됩니다.
   */
  async getTotalCountText(): Promise<string> {
    return this.page
      .locator('span.text-sm.text-gray-500', { hasText: /^총 \d+건$/ })
      .innerText();
  }

  /**
   * 로딩 완료 후 테이블 행이 보이는지 대기
   */
  async waitForTableReady() {
    // "로딩 중..." 텍스트가 사라질 때까지 대기
    await expect(
      this.page.locator('td', { hasText: '로딩 중...' })
    ).toHaveCount(0);
  }
}
