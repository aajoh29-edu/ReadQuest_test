import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const password = process.env.READQUEST_E2E_PASSWORD;

async function login(page, role) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(`${role}@readquest.example.org`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test.describe("ReadQuest Dashboard E2E", () => {
  test.beforeEach(async ({ page }) => {
    if (!password) throw new Error("READQUEST_E2E_PASSWORD must match the explicit development seed password");
    await page.goto("/");
  });

  test("Teacher Login, Dashboard Load, and WCAG A/AA Scan", async ({ page }) => {
    await login(page, "teacher");
    await expect(page.getByRole("heading", { name: "Your readers" })).toBeVisible();
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("Explicit UI State: Expired Session (401 Unauthorized)", async ({ page }) => {
    await login(page, "child");
    await page.route("**/api/activities", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Unauthorized" }),
      }),
    );
    await page.getByRole("button", { name: "Refresh activities", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Please sign in again to continue.");
    const loginBtn = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(loginBtn).toBeVisible();
    const box = await loginBtn.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("Explicit UI State: Empty Data", async ({ page }) => {
    await login(page, "child");
    await page.route("**/api/activities", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }));
    await page.route("**/api/children", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }));
    await page.getByRole("button", { name: "Refresh activities", exact: true }).click();
    await expect(page.getByText("No activities yet. Ask your grown-up to add some.")).toBeVisible();
    await expect(page.getByText("You have explored today's suggestions. Choose another activity or come back later.")).toBeVisible();
  });

  test("Explicit UI State: Server Error (500)", async ({ page }) => {
    await login(page, "child");
    await page.route("**/api/activities", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({}) }));
    await page.getByRole("button", { name: "Refresh activities", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("We could not complete that request. Please try again.");
    await expect(page.getByRole("button", { name: "Refresh activities", exact: true })).toBeVisible();
  });
});
