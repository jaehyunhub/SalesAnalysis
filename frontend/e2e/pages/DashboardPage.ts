import { Page, Locator, expect } from '@playwright/test';

/**
 * DashboardPage POM
 *
 * 대응 소스:
 *   - src/app/dashboard/page.tsx          — 탭 버튼, 폐기 위험 배너
 *   - src/components/dashboard/SummaryCards.tsx  — KPI 카드 4개
 *   - src/components/dashboard/SalesChart.tsx    — 매출 추이 차트 (recharts)
 *   - src/components/dashboard/CategoryChart.tsx — 카테고리 파이 차트 (recharts)
 *
 * 기간 탭 버튼은 dashboard/page.tsx 에서 직접 렌더링됩니다:
 *   <button onClick={() => setPeriod(tab.key)}>일별 / 주별 / 월별</button>
 *
 * KPI 카드는 SummaryCards 컴포넌트가 grid 안에 4개의
 *   <div class="rounded-xl bg-white p-5 shadow-sm border border-gray-100"> 로 렌더링합니다.
 *
 * 차트는 recharts 가 SVG 를 생성하며, 각 차트를 감싸는
 *   <div class="h-[300px]"> 컨테이너 안에 위치합니다.
 */
export class DashboardPage {
  readonly page: Page;

  /**
   * 기간 탭 컨테이너 (일별/주별/월별 버튼을 감싸는 flex div)
   * dashboard/page.tsx: <div class="flex overflow-hidden rounded-xl border ...">
   */
  readonly periodTabsContainer: Locator;

  /** 일별 탭 버튼 */
  readonly dailyTab: Locator;

  /** 주별 탭 버튼 */
  readonly weeklyTab: Locator;

  /** 월별 탭 버튼 */
  readonly monthlyTab: Locator;

  /**
   * KPI 요약 카드 4개
   * SummaryCards: grid > div.rounded-xl.bg-white.p-5 (4개)
   * 상위 grid 는 sm:grid-cols-2 xl:grid-cols-4 클래스를 가집니다.
   */
  readonly kpiCards: Locator;

  /**
   * 매출 추이 차트 컨테이너
   * SalesChart: <div class="rounded-xl bg-white p-5 ..."> 안에 h-[300px] div
   * recharts 가 내부에 <svg> 를 렌더링합니다.
   */
  readonly salesChart: Locator;

  /**
   * 카테고리 파이 차트 컨테이너
   * CategoryChart: <div class="rounded-xl bg-white p-5 ..."> 안에 h-[300px] div
   */
  readonly categoryChart: Locator;

  /**
   * 폐기 위험 알림 배너
   * dashboard/page.tsx: wasteRiskTotal > 0 일 때 렌더링
   * <div class="... border-amber-200 bg-amber-50 ...">
   */
  readonly wasteRiskBanner: Locator;

  constructor(page: Page) {
    this.page = page;

    // 기간 탭 — dashboard/page.tsx 의 PERIOD_TABS 버튼
    this.periodTabsContainer = page.locator(
      'div.flex.overflow-hidden.rounded-xl.border.border-gray-200'
    );
    this.dailyTab = this.periodTabsContainer.getByRole('button', { name: '일별' });
    this.weeklyTab = this.periodTabsContainer.getByRole('button', { name: '주별' });
    this.monthlyTab = this.periodTabsContainer.getByRole('button', { name: '월별' });

    // KPI 카드 — SummaryCards: sm:grid-cols-2 xl:grid-cols-4 grid 안의 직계 자식
    this.kpiCards = page.locator(
      'div.grid.grid-cols-1.gap-4.sm\\:grid-cols-2.xl\\:grid-cols-4 > div.rounded-xl.bg-white'
    );

    // 차트 — 각 차트 컴포넌트의 h-[300px] 래퍼 내부 svg
    // SalesChart 는 "최근 N일/주/월 매출 추이" 제목을 가지는 카드 안에 있음
    this.salesChart = page
      .locator('div.rounded-xl.bg-white', {
        has: page.locator('h3', { hasText: /매출 추이/ }),
      })
      .locator('div.h-\\[300px\\]');

    // CategoryChart 는 "N 카테고리별 매출" 제목을 가지는 카드 안에 있음
    this.categoryChart = page
      .locator('div.rounded-xl.bg-white', {
        has: page.locator('h3', { hasText: /카테고리별 매출/ }),
      })
      .locator('div.h-\\[300px\\]');

    // 폐기 위험 배너
    this.wasteRiskBanner = page.locator('div.bg-amber-50');
  }

  /** /dashboard 페이지로 이동 */
  async goto() {
    await this.page.goto('/dashboard');
  }

  /**
   * 기간 탭 선택
   * @param period 'daily' | 'weekly' | 'monthly'
   */
  async selectPeriod(period: 'daily' | 'weekly' | 'monthly') {
    const tabMap = {
      daily: this.dailyTab,
      weekly: this.weeklyTab,
      monthly: this.monthlyTab,
    } as const;
    await tabMap[period].click();
  }

  /**
   * 현재 활성 탭의 텍스트 반환
   * 활성 탭은 bg-blue-500 text-white 클래스를 가짐
   */
  async getActivePeriodLabel(): Promise<string> {
    const activeTab = this.periodTabsContainer.locator('button.bg-blue-500');
    return activeTab.innerText();
  }

  /**
   * KPI 카드가 4개 렌더링됐는지 검증
   */
  async expectKpiCardsVisible() {
    await expect(this.kpiCards).toHaveCount(4);
  }

  /**
   * 매출 차트에 SVG 가 렌더링됐는지 검증
   */
  async expectSalesChartVisible() {
    await expect(this.salesChart.locator('svg')).toBeVisible();
  }

  /**
   * 카테고리 차트에 SVG 가 렌더링됐는지 검증
   */
  async expectCategoryChartVisible() {
    await expect(this.categoryChart.locator('svg')).toBeVisible();
  }
}
