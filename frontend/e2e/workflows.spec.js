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

test("guardian creates a reader, joins a teacher class, and teacher sees progress",async({page})=>{
  const name=`Browser reader ${Date.now()}`;
  await login(page,"teacher");
  const className=`Browser class ${Date.now()}`;
  await page.getByLabel("Class name",{exact:true}).fill(className);
  await page.getByRole("button",{name:"Create class",exact:true}).click();
  await expect(page.getByRole("heading",{name:className,exact:true})).toBeVisible();
  const rooms=await (await page.request.get("/api/classes")).json();
  const room=rooms.find(r=>r.name===className);
  await page.getByRole("button",{name:"Sign out"}).click();
  await login(page,"parent");
  await page.getByText("Create a child account",{exact:true}).click();
  const form=page.getByRole("form",{name:"Create child",exact:true});
  await form.getByLabel("Display name",{exact:true}).fill(name);
  await form.getByLabel("Login email",{exact:true}).fill(`browser-${Date.now()}@example.org`);
  await form.getByLabel("Initial password",{exact:true}).fill(password);
  await form.getByRole("button",{name:"Create child",exact:true}).click();
  await expect(page.getByRole("combobox",{name:"Reader",exact:true})).toContainText(name);
  await page.getByRole("combobox",{name:"Reader",exact:true}).selectOption({label:name});
  await page.getByLabel("Class join code",{exact:true}).fill(room.join_code);
  await page.getByRole("button",{name:"Join class",exact:true}).click();
  await expect(page.getByText("Class joined.",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Sign out"}).click();
  await login(page,"teacher");
  await page.getByRole("combobox",{name:"Reader",exact:true}).selectOption({label:name});
  await expect(page.getByRole("heading",{name:"Reading progress",exact:true})).toBeVisible();
});

test("child screen passes WCAG A/AA scan and fits a mobile viewport",async({page})=>{
  const {default:AxeBuilder}=await import("@axe-core/playwright");
  await page.setViewportSize({width:390,height:844});
  await login(page,"child");
  await expect(page.getByRole("heading",{name:"Hello, Demo Reader!"})).toBeVisible();
  await expect(page.getByRole("radio").first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const result=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});

test("admin authors and edits a draft with a reading-skill selector",async({page})=>{
  await login(page,"admin");
  const lessonName=`Authoring lesson ${Date.now()}`;
  const title=`Draft reading ${Date.now()}`;
  await page.getByText("Add a lesson",{exact:true}).click();
  const lessonForm=page.getByRole("form",{name:"Add lesson",exact:true});
  await lessonForm.getByLabel("Lesson title",{exact:true}).fill(lessonName);
  await lessonForm.getByRole("combobox").selectOption("published");
  await lessonForm.getByRole("button",{name:"Add lesson",exact:true}).click();
  const editor=page.getByRole("form",{name:"Activity editor",exact:true});
  await expect(editor.getByRole("combobox",{name:/^Lesson/})).toContainText(lessonName);
  await editor.getByRole("combobox",{name:/^Lesson/}).selectOption({label:lessonName});
  await editor.getByLabel("Title",{exact:true}).fill(title);
  await editor.getByRole("textbox",{name:"Prompt",exact:true}).fill("Choose cat.");
  await editor.getByLabel("Choices (one per line)",{exact:true}).fill("cat\ndog");
  await expect(editor.getByLabel("Weight for skill 1",{exact:true})).toHaveValue("1");
  await editor.getByRole("button",{name:"Save activity",exact:true}).click();
  await page.getByRole("button",{name:`Edit ${title}`,exact:true}).click();
  await editor.getByRole("textbox",{name:"Prompt",exact:true}).fill("Choose the word cat.");
  await editor.getByRole("button",{name:"Save activity",exact:true}).click();
  await expect(page.getByText("Curriculum saved.",{exact:true})).toBeVisible();
});
