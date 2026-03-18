/**
 * file-upload.spec.ts — 파일 업로드 페이지 E2E 테스트
 *
 * 실제 페이지 구조 근거:
 *  - 탭 버튼 텍스트: "파일 업로드" / "스크린샷 OCR"
 *  - 탭 초기 상태: "file" (파일 업로드 탭이 기본 활성화)
 *  - 업로드 이력 섹션 제목: "업로드 이력"
 *  - 이력 테이블 헤더: 파일명 / 형식 / 레코드 수 / 상태 / 업로드 일시
 *  - 데이터 없을 때 메시지: "업로드 이력이 없습니다."
 *  - FileUploader 컴포넌트는 파일 드래그앤드롭 영역을 렌더링
 *  - ScreenshotOCR 컴포넌트는 OCR 전용 업로드 영역을 렌더링
 *
 * 주의: 실제 파일 업로드(API 전송)는 테스트하지 않음 — UI 동작만 검증
 *
 * POM: e2e/pages/UploadPage.ts
 */

import { test, expect } from "../../fixtures";
import { UploadPage } from "../../pages/UploadPage";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("파일 업로드 페이지", () => {
  test.beforeEach(async ({ authedPage }) => {
    // 업로드 이력 API mock: 빈 목록
    await authedPage.route("**/api/upload/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
    });

    await authedPage.goto("/upload");
    // 이력 API 응답 대기
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/upload/history") && res.status() === 200
    );
  });

  test("1. 업로드 페이지 접근 시 두 탭 버튼이 모두 표시된다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);
    await expect(uploadPage.fileTab).toBeVisible();
    await expect(uploadPage.ocrTab).toBeVisible();
  });

  test("2. 파일 업로드 탭이 기본으로 활성화되어 있다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // 활성 탭은 bg-white + shadow-sm 클래스를 가짐
    await expect(uploadPage.fileTab).toHaveClass(/bg-white/);

    // OCR 탭은 비활성 상태 (bg-white 없음)
    await expect(uploadPage.ocrTab).not.toHaveClass(/bg-white/);
  });

  test("3. 파일 업로드 탭에서 드래그앤드롭 영역과 file input이 렌더링된다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // POM: 드롭존 표시 확인
    await expect(uploadPage.dropzone).toBeVisible();

    // POM: hidden file input이 DOM에 존재하는지 확인 (accept 속성 포함)
    await expect(uploadPage.fileInput).toBeAttached();
  });

  test("4. OCR 탭 클릭 시 스크린샷 OCR 영역으로 전환된다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // POM: OCR 탭으로 전환
    await uploadPage.switchToOcrTab();

    // OCR 탭이 활성화되었는지 확인
    await expect(uploadPage.ocrTab).toHaveClass(/bg-white/);

    // 파일 업로드 탭은 비활성화
    await expect(uploadPage.fileTab).not.toHaveClass(/bg-white/);

    // ScreenshotOCR 컴포넌트 내부 file input이 렌더링되어야 함
    const fileInput = authedPage.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
  });

  test("5. 파일 업로드 탭으로 다시 돌아올 수 있다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // OCR 탭으로 전환
    await uploadPage.switchToOcrTab();
    await expect(uploadPage.ocrTab).toHaveClass(/bg-white/);

    // POM: 파일 업로드 탭으로 복귀
    await uploadPage.switchToFileTab();
    await expect(uploadPage.fileTab).toHaveClass(/bg-white/);
  });

  test("6. 업로드 이력 섹션과 테이블 헤더가 렌더링된다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // 섹션 제목
    await expect(authedPage.getByText("업로드 이력")).toBeVisible();

    // POM: 이력 테이블이 존재하는지 확인
    await expect(uploadPage.historyTable).toBeVisible();

    // 테이블 헤더 5개 컬럼
    await expect(authedPage.getByRole("columnheader", { name: "파일명" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "형식" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "레코드 수" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "상태" })).toBeVisible();
    await expect(authedPage.getByRole("columnheader", { name: "업로드 일시" })).toBeVisible();

    // 빈 상태 메시지
    await expect(authedPage.getByText("업로드 이력이 없습니다.")).toBeVisible();

    // 데이터 행 없음 확인
    await expect(uploadPage.historyRows).toHaveCount(0);
  });

  test("7. 업로드 이력이 있을 때 상태 배지가 올바르게 표시된다", async ({ authedPage }) => {
    const uploadPage = new UploadPage(authedPage);

    // 다양한 상태의 이력 mock
    await authedPage.route("**/api/upload/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              id: 1,
              file_name: "sales_202601.xlsx",
              file_type: "xlsx",
              record_count: 150,
              status: "completed",
              created_at: "2026-01-15 10:30:00",
            },
            {
              id: 2,
              file_name: "sales_202602.csv",
              file_type: "csv",
              record_count: 0,
              status: "failed",
              created_at: "2026-02-01 09:00:00",
            },
            {
              id: 3,
              file_name: "screenshot.png",
              file_type: "png",
              record_count: 0,
              status: "processing",
              created_at: "2026-03-01 11:00:00",
            },
          ],
          total: 3,
        }),
      });
    });

    await authedPage.reload();
    await authedPage.waitForResponse((res) =>
      res.url().includes("/api/upload/history") && res.status() === 200
    );

    // POM: 3개의 이력 행이 렌더링되었는지 확인
    await uploadPage.waitForHistoryRows(3);

    // 파일명 표시 확인
    await expect(authedPage.getByText("sales_202601.xlsx")).toBeVisible();
    await expect(authedPage.getByText("sales_202602.csv")).toBeVisible();
    await expect(authedPage.getByText("screenshot.png")).toBeVisible();

    // POM: 각 행의 상태 배지 텍스트 확인
    expect(await uploadPage.getHistoryRowStatus(0)).toBe("완료");
    expect(await uploadPage.getHistoryRowStatus(1)).toBe("실패");
    expect(await uploadPage.getHistoryRowStatus(2)).toBe("처리중");
  });
});
