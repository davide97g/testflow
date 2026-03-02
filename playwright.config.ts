import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const jobId = process.env.E2E_JOB_ID;
const reporters: [string, unknown][] = [["list"]];
if (jobId) {
  reporters.push([
    "json",
    {
      outputFile: `.testflow/e2e-result-${jobId}.json`,
    },
  ]);
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: reporters,
  use: {
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "cd apps/admin && bun run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
