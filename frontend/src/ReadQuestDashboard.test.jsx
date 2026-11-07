import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import ReadQuestDashboard from "./ReadQuestDashboard.jsx";

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows loading first", () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  render(<ReadQuestDashboard />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard");
});

test("shows expired-session state for 401", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({ status: 401, ok: false });
  render(<ReadQuestDashboard />);
  expect(await screen.findByText("Session expired")).toBeInTheDocument();
});

test("shows error state and allows retry", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockResolvedValueOnce({ status: 500, ok: false });
  fetchMock.mockResolvedValueOnce({
    status: 200,
    ok: true,
    json: async () => ({ candidates: [{ id: "1", title: "Read words" }] }),
  });

  render(<ReadQuestDashboard />);
  expect(await screen.findByText("We could not load your dashboard")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("ReadQuest dashboard")).toBeInTheDocument();
});

test("shows empty and no-candidate states", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  fetchMock.mockResolvedValueOnce({ status: 200, ok: true, json: async () => [] });
  render(<ReadQuestDashboard />);
  expect(await screen.findByText("Nothing to show yet")).toBeInTheDocument();

  fetchMock.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ candidates: [] }) });
  render(<ReadQuestDashboard />);
  await waitFor(() => expect(screen.getAllByText("No next recommendation").length).toBeGreaterThan(0));
});
