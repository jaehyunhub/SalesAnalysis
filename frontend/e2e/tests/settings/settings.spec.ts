/**
 * 설정 페이지 E2E 테스트
 *
 * authedPage fixture (e2e/.auth/user.json storageState)를 사용합니다.
 * SettingsPage POM을 통해 locator를 추상화합니다.
 *
 * 각 test는 beforeEach에서 /settings로 이동하여 독립적으로 실행됩니다.
 *
 * 페이지 구조 (settings/page.tsx 기준):
 *   - 점포 정보 카드  : 점포명·주소 input, "저장" 버튼
 *   - 이벤트 등록 카드 : 이벤트 유형 select, 설명 input(placeholder="예) 인근 초등학교 운동회"),
 *                       날짜 input[type="date"], "이벤트 추가" 버튼
 *   - 등록된 이벤트 카드 : 이벤트 테이블, "공휴일 자동 등록 (YYYY년)" 버튼, 삭제 버튼(TrashIcon)
 *
 * 사용 소스:
 *   - src/app/settings/page.tsx
 *   - e2e/pages/SettingsPage.ts  (POM)
 */

import { test, expect } from "../../fixtures";
import { SettingsPage } from "../../pages/SettingsPage";

test.describe("설정 페이지", () => {
  test.beforeEach(async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);
    await settingsPage.goto();
    // 점포 정보 섹션이 렌더링될 때까지 대기
    await authedPage.waitForSelector("h3:text('점포 정보')", { timeout: 10000 });
  });

  // ------------------------------------------------------------------
  // 1. 설정 페이지 기본 렌더링 확인
  // ------------------------------------------------------------------
  test("설정 페이지가 올바르게 렌더링된다", async ({ authedPage }) => {
    await expect(authedPage.locator("h3", { hasText: "점포 정보" })).toBeVisible();
    await expect(authedPage.locator("h3", { hasText: "이벤트 등록" })).toBeVisible();
    await expect(authedPage.locator("h3", { hasText: "등록된 이벤트" })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 2. 점포 정보 저장 → "저장되었습니다." 메시지 표시
  //    settings/page.tsx: handleSaveStoreInfo → setStoreInfoSaved(true), 2초 후 false
  //    UI: <span class="text-sm text-green-600 font-medium">저장되었습니다.</span>
  // ------------------------------------------------------------------
  test("점포 정보 저장 버튼 클릭 시 저장 완료 메시지가 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);
    await settingsPage.saveStoreInfo("CU E2E 테스트점", "서울특별시 강남구 테스트로 1");

    // "저장되었습니다." 메시지가 잠깐 나타나야 함
    await expect(
      authedPage.locator("span.text-green-600", { hasText: "저장되었습니다." })
    ).toBeVisible({ timeout: 3000 });
  });

  // ------------------------------------------------------------------
  // 3. 이벤트 추가 → 등록된 이벤트 목록에 표시
  //    settings/page.tsx: handleAddEvent → eventsApi.create() → fetchEvents() 재호출
  // ------------------------------------------------------------------
  test("이벤트를 추가하면 등록된 이벤트 목록에 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);
    const testDescription = `E2E 테스트 이벤트 ${Date.now()}`;

    await settingsPage.addEvent("2026-06-01", "other", testDescription);

    // API 응답 후 fetchEvents()가 목록을 갱신할 때까지 대기
    // 테이블 tbody 행에 새 설명이 나타나야 함
    await expect(
      authedPage.locator("td", { hasText: testDescription })
    ).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 4. 설명 없이 이벤트 추가 → 폼 에러 메시지
  //    settings/page.tsx: handleAddEvent → "설명을 입력해주세요." formError
  // ------------------------------------------------------------------
  test("설명을 입력하지 않고 이벤트 추가 시 에러 메시지가 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);

    // 날짜만 입력하고 설명 비워두기
    await settingsPage.eventDateInput.fill("2026-06-01");
    await settingsPage.addEventButton.click();

    // formError: <p class="mt-2 text-xs text-red-500">설명을 입력해주세요.</p>
    await expect(settingsPage.formError).toHaveText("설명을 입력해주세요.", { timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 5. 날짜 없이 이벤트 추가 → 폼 에러 메시지
  //    settings/page.tsx: handleAddEvent → "날짜를 입력해주세요." formError
  // ------------------------------------------------------------------
  test("날짜를 입력하지 않고 이벤트 추가 시 에러 메시지가 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);

    // 설명만 입력하고 날짜 비워두기
    await settingsPage.eventDescInput.fill("날짜 없는 이벤트");
    await settingsPage.addEventButton.click();

    // formError: "날짜를 입력해주세요."
    await expect(settingsPage.formError).toHaveText("날짜를 입력해주세요.", { timeout: 5000 });
  });

  // ------------------------------------------------------------------
  // 6. 이벤트 삭제 → 목록에서 제거
  //    settings/page.tsx: handleDeleteEvent → eventsApi.delete(id) → filter로 목록 갱신
  // ------------------------------------------------------------------
  test("이벤트 삭제 버튼 클릭 시 해당 이벤트가 목록에서 제거된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);
    const testDescription = `삭제 테스트 이벤트 ${Date.now()}`;

    // 먼저 이벤트 추가
    await settingsPage.addEvent("2026-07-15", "local", testDescription);

    // 목록에 나타날 때까지 대기
    await expect(
      authedPage.locator("td", { hasText: testDescription })
    ).toBeVisible({ timeout: 15000 });

    // 목록에서 해당 설명을 가진 행의 삭제 버튼 클릭
    // TrashIcon 버튼: <button class="rounded-md p-1.5 text-gray-400 ...">
    const targetRow = authedPage.locator("tr", {
      has: authedPage.locator("td", { hasText: testDescription }),
    });
    await targetRow.locator("button.rounded-md").click();

    // 삭제 후 해당 행이 사라지는지 확인
    await expect(
      authedPage.locator("td", { hasText: testDescription })
    ).not.toBeVisible({ timeout: 10000 });
  });

  // ------------------------------------------------------------------
  // 7. 공휴일 자동 등록 버튼 클릭 → 완료 메시지 표시
  //    settings/page.tsx: handleSyncHolidays → eventsApi.syncHolidays(year)
  //    성공: "N건의 공휴일이 등록되었습니다." (text-green-600)
  //    실패: "공휴일 동기화에 실패했습니다." (text-red-500)
  // ------------------------------------------------------------------
  test("공휴일 자동 등록 버튼 클릭 시 결과 메시지가 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);

    await settingsPage.syncHolidays();

    // 결과 메시지가 텍스트를 가져야 함
    const messageText = await settingsPage.syncMessage.textContent();
    expect(messageText).toBeTruthy();
    expect(messageText).toMatch(/공휴일|동기화/);
  });

  // ------------------------------------------------------------------
  // 8. 이벤트 유형 select 옵션 확인
  //    settings/page.tsx: eventTypeLabels — 공휴일, 학교 행사, 지역 행사, 기타
  // ------------------------------------------------------------------
  test("이벤트 유형 드롭다운에 4가지 유형이 표시된다", async ({ authedPage }) => {
    const settingsPage = new SettingsPage(authedPage);

    // 각 option 값 확인
    const optionValues = await settingsPage.eventTypeSelect.locator("option").allTextContents();
    expect(optionValues).toContain("공휴일");
    expect(optionValues).toContain("학교 행사");
    expect(optionValues).toContain("지역 행사");
    expect(optionValues).toContain("기타");
    expect(optionValues).toHaveLength(4);
  });
});
