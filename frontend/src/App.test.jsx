import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import App, { Progress } from "./App.jsx";
import { request } from "./api.js";

vi.mock("./api.js", () => ({ request: vi.fn() }));
const reader={id:"reader",display_name:"Sam"};
const activity={id:"activity",title:"Read a word",difficulty:1,content:{choices:["cat","dog"]},prompt:"Choose cat"};
const mastery={skill_id:"skill",skill_name:"Phonics",score:.8,band:"normal_review",confidence:"medium",attempt_count:5,last_practiced_at:"2026-09-01T12:00:00Z"};
const recommendation={activity,explanation:"Let's practice a growing skill."};

beforeEach(() => { request.mockReset(); });

function mockChild() {
  request.mockImplementation(async (path, options) => {
    if(path==="/auth/me") return {role:"child"};
    if(path==="/activities") return [activity];
    if(path==="/children") return [reader];
    if(path.endsWith("/progress")) return [mastery];
    if(path.endsWith("/recommendations")) return recommendation;
    if(path==="/attempts") return {attempt_id:"attempt",is_correct:false,mastery:[mastery],recommendation};
    if(path==="/auth/logout") return null;
    throw new Error(`Unexpected ${path}`);
  });
}

test("login handles invalid credentials without displaying unsafe HTML", async () => {
  request.mockImplementation(async path => { const error=new Error("<script>bad</script>"); error.status=401; throw error; });
  render(<App />); const user=userEvent.setup();
  await user.type(await screen.findByLabelText("Email"), "reader@example.org");
  await user.type(screen.getByLabelText("Password"), "bad-password");
  await user.click(screen.getByRole("button",{name:"Sign in"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("did not match");
  expect(document.querySelector("script")).toBeNull();
});

test("child selects a real answer and submits no correctness or identity", async () => {
  mockChild(); render(<App />); const user=userEvent.setup();
  await user.click(await screen.findByLabelText("dog"));
  await user.click(screen.getByRole("button",{name:"Check my answer"}));
  expect(await screen.findByText("Good try. Keep learning!")).toBeInTheDocument();
  const call=request.mock.calls.find(([path])=>path==="/attempts");
  expect(call[1].body).toMatchObject({activity_id:"activity",selected_index:1});
  expect(call[1].body).not.toHaveProperty("is_correct");
  expect(call[1].body).not.toHaveProperty("child_id");
  expect(screen.getByRole("button",{name:"Check my answer"})).toBeDisabled();
  await user.click(screen.getByRole("button",{name:"Try Read a word"}));
  expect(screen.getByRole("radio",{name:"dog"})).not.toBeChecked();
});

test("progress shows server mastery and unassessed wording", () => {
  render(<Progress rows={[mastery,{...mastery,skill_id:"new",skill_name:"New skill",attempt_count:0,last_practiced_at:null}]} />);
  expect(screen.getByRole("progressbar")).toHaveAttribute("value","0.8");
  expect(screen.getByText("Ready to try")).toBeInTheDocument();
  expect(screen.getByText("No practice yet")).toBeInTheDocument();
});

test("loading, empty and no-candidate states are usable", async () => {
  request.mockImplementation(async path => path==="/auth/me" ? {role:"child"} : []);
  render(<App />);
  expect(screen.getByRole("status")).toHaveTextContent("Opening");
  expect(await screen.findByText("No activities yet. Ask your grown-up to add some.")).toBeInTheDocument();
  expect(screen.getByText(/You have explored today's suggestions/)).toBeInTheDocument();
});

test("parent role has scoped dashboard and create-child flow", async () => {
  request.mockImplementation(async path => {
    if(path==="/auth/me") return {role:"parent"};
    if(path==="/children") return [reader];
    if(path.endsWith("/progress")) return [mastery];
    if(path.endsWith("/recommendations")) return recommendation;
    throw new Error("unexpected route");
  });
  render(<App />);
  expect(await screen.findByText("Your family")).toBeInTheDocument();
  expect(screen.getByText("Create a child account")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Check my answer"})).not.toBeInTheDocument();
  expect(await screen.findByText("Phonics")).toBeInTheDocument();
});

test("network error remains retryable", async () => {
  request.mockImplementation(async path => { if(path==="/auth/me") return {role:"child"}; throw new Error("Network unavailable"); });
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
  expect(screen.getByRole("button",{name:"Refresh activities"})).not.toBeDisabled();
});

test("logout returns to login", async () => {
  mockChild(); render(<App />);
  await userEvent.click(await screen.findByRole("button",{name:"Sign out"}));
  expect(await screen.findByRole("button",{name:"Sign in"})).toBeInTheDocument();
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/auth/logout",{method:"POST"}));
});
