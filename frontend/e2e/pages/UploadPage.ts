import { Page, Locator, expect } from '@playwright/test';

/**
 * UploadPage POM
 *
 * 대응 소스:
 *   - src/app/upload/page.tsx          — 탭 UI, 업로드 이력 테이블
 *   - src/components/upload/FileUploader.tsx  — 드롭존, 파일 선택, 업로드 버튼
 *   - src/components/upload/ScreenshotOCR.tsx — OCR 탭 내용
 *
 * 탭 구조:
 *   <div class="flex gap-1 rounded-lg bg-gray-100 p-1">
 *     <button>파일 업로드</button>   ← id: "file"
 *     <button>스크린샷 OCR</button>  ← id: "screenshot"
 *   </div>
 *
 * 파일 업로드 탭 (FileUploader):
 *   드롭존: <div class="... border-2 border-dashed ...">
 *   파일 input: <input type="file" accept=".xlsx,.csv,.xls" class="hidden">
 *   업로드 버튼: <button>업로드 시작</button> (파일 선택 후에만 렌더링)
 *
 * 이력 테이블:
 *   <h3>업로드 이력</h3> 아래에 위치
 *   행: <tr class="border-b border-gray-100 text-gray-700">
 */
export class UploadPage {
  readonly page: Page;

  // ── 탭 버튼 ────────────────────────────────────────────────
  /** "파일 업로드" 탭 버튼 */
  readonly fileTab: Locator;

  /** "스크린샷 OCR" 탭 버튼 */
  readonly ocrTab: Locator;

  // ── 파일 업로드 탭 ─────────────────────────────────────────
  /**
   * 드롭존 컨테이너
   * FileUploader: <div class="... border-2 border-dashed ...">
   */
  readonly dropzone: Locator;

  /**
   * 숨겨진 파일 input (Playwright file_upload 에 사용)
   * <input type="file" accept=".xlsx,.csv,.xls" class="hidden">
   */
  readonly fileInput: Locator;

  /**
   * "파일 선택" 버튼 — 드롭존 내부의 클릭 트리거 버튼
   * onClick 으로 hidden input.click() 을 호출합니다.
   */
  readonly fileSelectButton: Locator;

  /**
   * "업로드 시작" 버튼
   * 파일 선택 후 드롭존 아래에 렌더링됩니다.
   * class: "mt-4 w-full rounded-lg bg-blue-500 ..."
   */
  readonly uploadButton: Locator;

  // ── 업로드 이력 테이블 ──────────────────────────────────────
  /**
   * 업로드 이력 테이블 전체
   * upload/page.tsx: <h3>업로드 이력</h3> 아래 <table>
   */
  readonly historyTable: Locator;

  /**
   * 업로드 이력 테이블 tbody 행
   * <tr class="border-b border-gray-100 text-gray-700">
   */
  readonly historyRows: Locator;

  constructor(page: Page) {
    this.page = page;

    // 탭 버튼 — 탭 컨테이너(bg-gray-100) 안에서 텍스트로 식별
    const tabContainer = page.locator('div.rounded-lg.bg-gray-100.p-1');
    this.fileTab = tabContainer.getByRole('button', { name: '파일 업로드' });
    this.ocrTab = tabContainer.getByRole('button', { name: '스크린샷 OCR' });

    // 드롭존 — border-dashed 로 식별
    this.dropzone = page.locator('div.border-2.border-dashed');

    // 파일 input — hidden, accept=".xlsx,.csv,.xls"
    this.fileInput = page.locator('input[type="file"][accept=".xlsx,.csv,.xls"]');

    // "파일 선택" 버튼 — 드롭존 내부
    this.fileSelectButton = this.dropzone.getByRole('button', { name: '파일 선택' });

    // "업로드 시작" 버튼 — 드롭존 하단, w-full 블록 버튼
    this.uploadButton = page.getByRole('button', { name: '업로드 시작' });

    // 이력 테이블 — "업로드 이력" 제목을 가지는 카드 내부
    const historySection = page.locator('div.rounded-xl.bg-white', {
      has: page.locator('h3', { hasText: '업로드 이력' }),
    });
    this.historyTable = historySection.locator('table');
    this.historyRows = this.historyTable.locator('tbody tr.border-b.border-gray-100');
  }

  /** /upload 페이지로 이동 */
  async goto() {
    await this.page.goto('/upload');
  }

  /** "스크린샷 OCR" 탭으로 전환 */
  async switchToOcrTab() {
    await this.ocrTab.click();
    // OCR 탭이 활성화되면 bg-white shadow-sm 이 적용됩니다
    await expect(this.ocrTab).toHaveClass(/bg-white/);
  }

  /** "파일 업로드" 탭으로 전환 */
  async switchToFileTab() {
    await this.fileTab.click();
    await expect(this.fileTab).toHaveClass(/bg-white/);
  }

  /**
   * 파일을 드롭존에 첨부하고 업로드 버튼 클릭
   *
   * Playwright 는 hidden input 에 setInputFiles 를 직접 사용할 수 있습니다.
   * @param filePath 업로드할 파일의 절대 경로
   */
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
    await expect(this.uploadButton).toBeVisible();
    await this.uploadButton.click();
  }

  /**
   * 업로드 이력 테이블에서 특정 인덱스의 상태 배지 텍스트 반환
   * @param rowIndex 0-based 행 인덱스
   */
  async getHistoryRowStatus(rowIndex: number): Promise<string> {
    const row = this.historyRows.nth(rowIndex);
    // 상태 배지: <span class="rounded-full ... text-xs font-medium ...">
    return row.locator('span.rounded-full').innerText();
  }

  /**
   * 업로드 완료 후 이력 테이블에 새 행이 추가될 때까지 대기
   * @param expectedCount 기대하는 최소 행 수
   */
  async waitForHistoryRows(expectedCount: number) {
    await expect(this.historyRows).toHaveCount(expectedCount, { timeout: 15_000 });
  }
}
