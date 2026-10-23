import { it, expect, vi } from "vitest";
import { render, screen, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyRidgeResults, { useMyRidgeResults } from "../../src/components/MyRidgeResults";

vi.mock("../../src/lib/supabaseClient", () => ({ isSupabaseConfigured: true, supabase: {} }));

const row = { id: "s1:r1", session_date: "2026-10-24", session_label: "Evening", completed_laps: 2, total_ms: 61000, break_ms: 30000, finished: true, total_score: 3.5 };

it("lists the member's own sessions with laps, riding and break time, and points", () => {
  render(<MemoryRouter><MyRidgeResults rows={[row]} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "My Ridge Repeats" })).toBeInTheDocument();
  expect(screen.getByText("24 Oct 2026 · Evening")).toBeInTheDocument();
  expect(screen.getByText(/2 laps · riding 1:01.000 · breaks 0:30.000 · finished/)).toBeInTheDocument();
  expect(screen.getAllByText(/3.50 pts/).length).toBeGreaterThan(0);
});

it("shows nothing for members who never rode", () => {
  const { container } = render(<MemoryRouter><MyRidgeResults rows={[]} /></MemoryRouter>);
  expect(container).toBeEmptyDOMElement();
});

it("reads results through my_ridge_results()", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: [row], error: null });
  const { result } = renderHook(() => useMyRidgeResults("u1", { rpc }));
  await waitFor(() => expect(result.current).toEqual([row]));
  expect(rpc).toHaveBeenCalledWith("my_ridge_results");
});
