import { test, expect } from "@playwright/test";

const password=process.env.READQUEST_E2E_PASSWORD;
test.beforeEach(async ({page})=> {
  if (!password) throw new Error("READQUEST_E2E_PASSWORD must match the explicit development seed password");
  await page.goto("/");
});
async function login(page,role) {
  await page.getByLabel("Email",{exact:true}).fill(`${role}@readquest.example.org`);
  await page.getByLabel("Password",{exact:true}).fill(password);
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await expect(page.getByRole("button",{name:"Sign out"})).toBeVisible();
}
test("child answers, sees mastery and next practice, then signs out",async({page})=>{
  const errors=[]; page.on("pageerror",e=>errors.push(e.message));
  await login(page,"child");
  await expect(page.getByRole("heading",{name:"Hello, Demo Reader!"})).toBeVisible();
  await page.getByRole("radio").first().check();
  await page.getByRole("button",{name:"Check my answer"}).click();
  await expect(page.getByText("Great reading!")).toBeVisible();
  await expect(page.getByRole("heading",{name:"Reading progress"})).toBeVisible();
  await page.getByRole("button",{name:/^Try /}).click();
  await expect(page.getByRole("radio").first()).not.toBeChecked();
  await page.getByRole("button",{name:"Sign out"}).click();
  await expect(page.getByRole("button",{name:"Sign in",exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
test("parent sees linked reader progress",async({page})=>{
  await login(page,"parent");
  await expect(page.getByRole("heading",{name:"Your family"})).toBeVisible();
  await expect(page.getByLabel("Reader",{exact:true})).toContainText("Demo Reader");
  await expect(page.getByRole("heading",{name:"Letter Sounds",exact:true})).toBeVisible();
});
test("teacher sees enrolled reader and class",async({page})=>{
  await login(page,"teacher");
  await expect(page.getByRole("heading",{name:"Your readers"})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Demo reading class"})).toBeVisible();
});
test("admin has account and curriculum tools",async({page})=>{
  await login(page,"admin");
  await expect(page.getByRole("heading",{name:"Accounts",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Curriculum",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Save activity"})).toBeVisible();
});
