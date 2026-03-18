import { Page, Locator, expect } from '@playwright/test';

/**
 * SettingsPage POM
 *
 * 대응 소스: src/app/settings/page.tsx
 *
 * 주요 UI 구성:
 *   1. 점포 정보 카드 — 점포명/주소 input, 저장 버튼
 *   2. 이벤트 등록 카드 — 유형 select, 설명 input, 날짜 input, "이벤트 추가" 버튼
 *   3. 등록된 이벤트 카드 — 이벤트 테이블, "공휴일 자동 등록" 버튼
 *
 * 이벤트 폼 필드에는 label 이 있으나 for/id 연결 없이 인접 형제 관계입니다.
 * label 텍스트 → 바로 아래(+) 형제 input/select 로 locator 구성합니다.
 *
 * 이벤트 유형 값: "holiday" | "school" | "local" | "other"
 * (option 텍스트: "공휴일" | "학교 행사" | "지역 행사" | "기타")
 */
export class SettingsPage {
  readonly page: Page;

  // ── 점포 정보 섹션 ─────────────────────────────────────────
  /** 점포명 입력 — label "점포명" */
  readonly storeNameInput: Locator;

  /** 주소 입력 — label "주소" */
  readonly storeAddressInput: Locator;

  /** 저장 버튼 — 점포 정보 섹션 */
  readonly saveStoreInfoButton: Locator;

  // ── 이벤트 등록 폼 ─────────────────────────────────────────
  /**
   * 이벤트 날짜 — label "날짜", type="date"
   * form.event_date 에 바인딩됩니다.
   */
  readonly eventDateInput: Locator;

  /**
   * 이벤트 유형 select — label "이벤트 유형"
   * option value: "holiday" | "school" | "local" | "other"
   */
  readonly eventTypeSelect: Locator;

  /**
   * 이벤트 설명 input — label "설명", placeholder "예) 인근 초등학교 운동회"
   */
  readonly eventDescInput: Locator;

  /** "이벤트 추가" 버튼 */
  readonly addEventButton: Locator;

  /** 이벤트 등록 폼 에러 메시지 — <p class="mt-2 text-xs text-red-500"> */
  readonly formError: Locator;

  // ── 이벤트 목록 섹션 ───────────────────────────────────────
  /**
   * 등록된 이벤트 테이블 전체
   * "등록된 이벤트" 제목을 가지는 카드 안에 위치합니다.
   */
  readonly eventList: Locator;

  /**
   * 이벤트 테이블 tbody 행
   * <tr class="border-b border-gray-100 text-gray-700">
   */
  readonly eventRows: Locator;

  /**
   * 공휴일 자동 등록 버튼
   * 현재 연도 공휴일을 동기화합니다.
   * 텍스트: "공휴일 자동 등록 (YYYY년)"
   */
  readonly syncHolidaysButton: Locator;

  /** 동기화 결과 메시지 — syncMessage state, 성공/실패 모두 포함 */
  readonly syncMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // 점포 정보 섹션 — "점포 정보" 제목을 가지는 카드
    const storeSection = page.locator('div.rounded-xl.bg-white', {
      has: page.locator('h3', { hasText: '점포 정보' }),
    });
    this.storeNameInput = storeSection
      .locator('label', { hasText: '점포명' })
      .locator('+ input[type="text"]');
    this.storeAddressInput = storeSection
      .locator('label', { hasText: '주소' })
      .locator('+ input[type="text"]');
    this.saveStoreInfoButton = storeSection.getByRole('button', { name: '저장' });

    // 이벤트 등록 폼 — "이벤트 등록" 제목을 가지는 카드
    const eventFormSection = page.locator('div.rounded-xl.bg-white', {
      has: page.locator('h3', { hasText: '이벤트 등록' }),
    });
    this.eventTypeSelect = eventFormSection
      .locator('label', { hasText: '이벤트 유형' })
      .locator('+ select');
    this.eventDescInput = eventFormSection
      .locator('label', { hasText: '설명' })
      .locator('+ input[type="text"]');
    this.eventDateInput = eventFormSection
      .locator('label', { hasText: '날짜' })
      .locator('+ input[type="date"]');
    this.addEventButton = eventFormSection.getByRole('button', {
      name: /이벤트 추가/,
    });
    this.formError = eventFormSection.locator('p.text-red-500');

    // 이벤트 목록 — "등록된 이벤트" 제목을 가지는 카드
    const eventListSection = page.locator('div.rounded-xl.bg-white', {
      has: page.locator('h3', { hasText: '등록된 이벤트' }),
    });
    this.eventList = eventListSection.locator('table');
    this.eventRows = this.eventList.locator('tbody tr.border-b.border-gray-100');

    // 공휴일 자동 등록 버튼 — "공휴일 자동 등록 (YYYY년)" 형태
    this.syncHolidaysButton = eventListSection.getByRole('button', {
      name: /공휴일 자동 등록/,
    });

    // 동기화 결과 메시지
    this.syncMessage = eventListSection.locator('p', {
      hasText: /건의 공휴일이 등록|동기화/,
    });
  }

  /** /settings 페이지로 이동 */
  async goto() {
    await this.page.goto('/settings');
  }

  /**
   * 이벤트 등록 폼을 채우고 추가 버튼 클릭
   * @param date        'YYYY-MM-DD' 형식 날짜
   * @param type        이벤트 유형 option value ("holiday" | "school" | "local" | "other")
   * @param description 이벤트 설명 텍스트
   */
  async addEvent(date: string, type: string, description: string) {
    await this.eventDateInput.fill(date);
    await this.eventTypeSelect.selectOption(type);
    await this.eventDescInput.fill(description);
    await this.addEventButton.click();
  }

  /**
   * 이벤트 목록에서 특정 인덱스의 행을 삭제
   *
   * 각 행 우측에 <button><TrashIcon /></button> 이 있습니다.
   * aria-label 이 없으므로 행 내부의 버튼(trash icon 버튼)을 클릭합니다.
   * @param index 0-based 행 인덱스
   */
  async deleteEvent(index: number) {
    const row = this.eventRows.nth(index);
    // 삭제 버튼: rounded-md p-1.5 text-gray-400 hover:text-red-500
    await row.locator('button.rounded-md').click();
  }

  /**
   * 이벤트 목록이 특정 건수가 될 때까지 대기
   * @param count 기대하는 이벤트 행 수
   */
  async waitForEventCount(count: number) {
    await expect(this.eventRows).toHaveCount(count, { timeout: 10_000 });
  }

  /**
   * 공휴일 동기화 버튼 클릭 후 결과 메시지 대기
   */
  async syncHolidays() {
    await this.syncHolidaysButton.click();
    // 동기화 완료 시 syncMessage 가 표시됩니다
    await expect(this.syncMessage).toBeVisible({ timeout: 15_000 });
  }

  /**
   * 점포 정보를 변경하고 저장
   * @param name    점포명
   * @param address 주소
   */
  async saveStoreInfo(name: string, address: string) {
    await this.storeNameInput.fill(name);
    await this.storeAddressInput.fill(address);
    await this.saveStoreInfoButton.click();
    // 저장 완료 피드백: "저장되었습니다." 텍스트가 잠깐 표시됩니다.
    await expect(
      this.page.locator('span.text-green-600', { hasText: '저장되었습니다.' })
    ).toBeVisible();
  }
}
