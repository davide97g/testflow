import { test, expect } from "@playwright/test";

test("example 1: homepage loads", async ({ page }) => {
  await test.step("Navigate to /", async () => {
    await page.goto("/", { waitUntil: "networkidle" });
  });
  await test.step("Page shows app content", async () => {
    await expect(
      page.getByText(/Testflow Admin|Welcome|Loading|Configuration/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test("example 2: config page loads", async ({ page }) => {
  await test.step("Navigate to /config", async () => {
    await page.goto("/config");
  });
  await test.step("Config content is visible", async () => {
    await expect(page.getByText(/config/i).first()).toBeVisible();
  });
});

test("example 3: workflow page loads", async ({ page }) => {
  await test.step("Navigate to /workflow", async () => {
    await page.goto("/workflow");
  });
  await test.step("Workflow content is visible", async () => {
    await expect(page.getByText(/workflow/i).first()).toBeVisible();
  });
});

test("example 4: jira page loads", async ({ page }) => {
  await test.step("Navigate to /jira", async () => {
    await page.goto("/jira");
  });
  await test.step("Jira content is visible", async () => {
    await expect(page.getByText(/jira|issues/i).first()).toBeVisible();
  });
});

test("example 5: zephyr page loads", async ({ page }) => {
  await test.step("Navigate to /zephyr", async () => {
    await page.goto("/zephyr");
  });
  await test.step("Zephyr content is visible", async () => {
    await expect(page.getByText(/zephyr|test cases/i).first()).toBeVisible();
  });
});

test("example 6: env page loads", async ({ page }) => {
  await test.step("Navigate to /env", async () => {
    await page.goto("/env");
  });
  await test.step("Env content is visible", async () => {
    await expect(page.getByText(/environment|variables/i).first()).toBeVisible();
  });
});

test("example 7: setup page loads", async ({ page }) => {
  await test.step("Navigate to /setup", async () => {
    await page.goto("/setup");
  });
  await test.step("Setup content is visible", async () => {
    await expect(page.getByText(/welcome|setup|jira/i).first()).toBeVisible();
  });
});

test("example 8: E2E page loads", async ({ page }) => {
  await test.step("Navigate to /e2e", async () => {
    await page.goto("/e2e");
  });
  await test.step("E2E content is visible", async () => {
    await expect(page.getByText(/e2e|headless|example test/i).first()).toBeVisible();
  });
});

// Intentionally failing: heading does not exist
test("example 9: non-existent heading (expected to fail)", async ({ page }) => {
  await test.step("Navigate to /", async () => {
    await page.goto("/", { waitUntil: "networkidle" });
  });
  await test.step("Expect heading that does not exist", async () => {
    await expect(
      page.getByRole("heading", { name: "This Heading Does Not Exist" })
    ).toBeVisible({ timeout: 2000 });
  });
});

// Intentionally failing: wrong assertion
test("example 10: wrong URL assertion (expected to fail)", async ({ page }) => {
  await test.step("Navigate to /config", async () => {
    await page.goto("/config");
  });
  await test.step("Expect URL to be /workflow (but we are on /config)", async () => {
    await expect(page).toHaveURL(/\/workflow\/?$/);
  });
});
