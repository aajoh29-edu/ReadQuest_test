import { defineConfig, devices } from "@playwright/test";

if (!process.env.READQUEST_E2E_PASSWORD) {
  console.error("FATAL: READQUEST_E2E_PASSWORD environment variable is required.");
  process.exit(1);
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.READQUEST_E2E_URL || "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        executablePath: process.env.READQUEST_BROWSER_PATH || undefined,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 12"],
        executablePath: process.env.READQUEST_BROWSER_PATH || undefined,
      },
    },
  ],
});
