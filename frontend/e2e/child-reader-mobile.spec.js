import { test, expect } from "@playwright/test";

test.describe("Child Reader Mechanics & Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    const password = process.env.READQUEST_E2E_PASSWORD;
    if (!password) throw new Error("READQUEST_E2E_PASSWORD must match the explicit development seed password");
    await page.goto("/");
    await page.getByLabel("Email", { exact: true }).fill("child@readquest.example.org");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Hello, Demo Reader!" })).toBeVisible();
  });

  test("Selects an answer and views explained recommendation", async ({ page }) => {
    const answerOption = page.getByRole("radio").first();
    await expect(answerOption).toBeVisible();
    await answerOption.check();
    await page.getByRole("button", { name: "Check my answer", exact: true }).click();
    await expect(page.getByText(/Great reading!|Good try\. Keep learning!/)).toBeVisible();
    await expect(page.getByLabel("Next practice")).toContainText(/What is next\?/);
  });

  test("Views server mastery progress", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Reading progress", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar").first()).toBeVisible();
    await expect(page.getByText("Class Leaderboard")).not.toBeVisible();
  });

  test("Mobile layout enforces strict 44x44px minimum touch targets", async ({ page }) => {
    const buttons = page.locator("button, a[href], [role='button'], [role='radio'], input[type='radio']");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
    const readingPanel = page.locator("section[aria-labelledby='activity-title']");
    const panelBox = await readingPanel.boundingBox();
    expect(panelBox?.width ?? 0).toBeGreaterThan(300);
  });
});
