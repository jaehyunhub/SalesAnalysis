import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/fixtures/auth.fixture.ts",
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
