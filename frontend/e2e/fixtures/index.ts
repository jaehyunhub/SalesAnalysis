import { test as base, expect, type Page } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.join(__dirname, "../.auth/user.json");

type CustomFixtures = {
  /** storageState를 e2e/.auth/user.json으로 설정한 인증된 page */
  authedPage: Page;
};

export const test = base.extend<CustomFixtures>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
