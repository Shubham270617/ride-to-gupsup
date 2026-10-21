import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CommunityDetail from "../../src/pages/CommunityDetail";
import { communityPagePath, safeCommunityLink, useCommunityDetail } from "../../src/lib/communityDetails";
const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("../../src/lib/supabaseClient", () => ({ isSupabaseConfigured: true, supabase: { from: mocks.from } }));
const id = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";
const group = { id, name: "Test Cycling", description: "Published community description", contact_person: "Public representative", join_text: "Join a community session", sport: "Cycling", location: "Delhi" };
let groupQuery, activityQuery;
function query(result, terminal) {
  const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), [terminal]: vi.fn().mockResolvedValue(result) };
  return q;
}
beforeEach(() => {
  groupQuery = query({ data: group, error: null }, "maybeSingle");
  activityQuery = query({ data: [], error: null }, "order");
  mocks.from.mockReset().mockImplementation((table) => table === "community_network_groups" ? groupQuery : activityQuery);
});
const page = (path = `/community/${id}`) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/community/:communityId" element={<CommunityDetail />} /></Routes></MemoryRouter>);

describe("community detail pages", () => {
  it("loads public details and only exact organiser activities", async () => {
    activityQuery.order.mockResolvedValue({ data: [{ id: "activity-1", title: "Weekly ride", schedule_type: "weekly", weekday: "Tuesday", time_text: "6 AM", link_url: "/weekly-rides/test", link_label: "Ride details" }], error: null });
    page();
    expect(screen.getByRole("status")).toHaveTextContent("Loading community");
    expect(await screen.findByRole("heading", { name: group.name })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Weekly ride" })).toBeInTheDocument();
    expect(groupQuery.eq).toHaveBeenCalledWith("published", true);
    expect(groupQuery.eq).toHaveBeenCalledWith("id", id);
    expect(activityQuery.eq).toHaveBeenCalledWith("published", true);
    expect(activityQuery.eq).toHaveBeenCalledWith("organiser", group.name);
    expect(screen.getByRole("link", { name: /Ride details/ })).toHaveAttribute("href", "/weekly-rides/test");
    expect(groupQuery.select.mock.calls[0][0]).not.toContain("*");
  });
  it("does not treat loading as not found", async () => {
    let resolve;
    groupQuery.maybeSingle.mockReturnValue(new Promise((r) => { resolve = r; }));
    page();
    expect(screen.queryByText("Community not found")).not.toBeInTheDocument();
    await act(async () => resolve({ data: null, error: null }));
    expect(screen.getByRole("heading", { name: "Community not found" })).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalledWith("calendar_activities");
  });
  it("handles invalid IDs without querying the database", async () => {
    page("/community/not-a-uuid");
    expect(await screen.findByText("Community not found")).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("handles a rejected request and retries instead of hiding errors", async () => {
    groupQuery.maybeSingle.mockRejectedValueOnce(new Error("offline"));
    page();
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
    await act(async () => screen.getByRole("button", { name: "Try again" }).click());
    expect(await screen.findByRole("heading", { name: group.name })).toBeInTheDocument();
  });
  it("keeps community content if activity access fails", async () => {
    activityQuery.order.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    page();
    expect(await screen.findByRole("alert")).toHaveTextContent("Activities could not be loaded");
    expect(screen.getByRole("heading", { name: group.name })).toBeInTheDocument();
    expect(screen.queryByText(/No activities are currently listed/)).not.toBeInTheDocument();
  });
  it("ignores stale results when navigating between communities", async () => {
    let resolveOld;
    groupQuery.maybeSingle.mockReturnValueOnce(new Promise((r) => { resolveOld = r; }));
    const { result, rerender } = renderHook(({ current }) => useCommunityDetail(current), { initialProps: { current: id } });
    groupQuery.maybeSingle.mockResolvedValue({ data: { ...group, id: secondId, name: "New community" }, error: null });
    rerender({ current: secondId });
    await waitFor(() => expect(result.current.group?.name).toBe("New community"));
    await act(async () => resolveOld({ data: group, error: null }));
    expect(result.current.group.name).toBe("New community");
  });
  it("renders no placeholder community facts when there are no activities", async () => {
    page();
    expect(await screen.findByText(/No activities are currently listed/)).toBeInTheDocument();
    expect(screen.getByText("Published community description")).toBeInTheDocument();
  });
  it("uses stable IDs and rejects unsafe application links", () => {
    expect(communityPagePath(id)).toBe(`/community/${id}`);
    for (const value of ["javascript:alert(1)", "data:text/html,test", "//evil.test", "/\\evil.test", "/\nevil.test", "not a url"]) expect(safeCommunityLink(value)).toBeNull();
    expect(safeCommunityLink("https://example.com/ride")).toBe("https://example.com/ride");
    expect(safeCommunityLink("/calendar?category=cycling")).toBe("/calendar?category=cycling");
  });
});
