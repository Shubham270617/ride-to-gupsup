import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Lab from "../../../src/pages/Lab";

vi.mock("../../../src/lib/publicData", () => ({ useSiteSettings: () => ({}) }));
const reads = vi.hoisted(() => ({
  highlights: vi.fn(() => [{ id: "km", value: "13,277", label: "km ridden" }]),
  periods: vi.fn(() => []),
}));
vi.mock("../../../src/lib/labData", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useLabProgrammes: () => ({ items: [
      { id: "strava", slug: "strava-challenge", title: "RTG Club Lab", tags: [], link: "/lab/strava" },
      { id: "ridge", slug: "ridge-repeats", title: "Ridge Repeats", tags: [], tone: "purple", link: "/lab/ridge", buttonLabel: "Explore Ridge" },
    ] }),
    useLabHighlights: reads.highlights,
    useLabPeriods: reads.periods,
    useLabPrinciples: () => [{ id: "p1", title: "Recognition", text: "Weekly to yearly rewards" }],
  };
});

// Strava stays live on RTG: Randeep's branch paused it, and that pause was
// deliberately left out. Lab must keep showing the Strava lab and its data.
describe("Lab keeps Strava live", () => {
  it("shows the Strava lab next to Ridge, its highlights and the admin's principles", () => {
    render(<MemoryRouter><Lab /></MemoryRouter>);
    expect(screen.getByText("RTG Club Lab")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore Ridge" })).toHaveAttribute("href", "/lab/ridge");
    expect(screen.getByText(/weekly to yearly rewards/i)).toBeInTheDocument();
    expect(reads.highlights).toHaveBeenCalled();
    expect(reads.periods).toHaveBeenCalled();
  });

  it("opens and closes the about dialog", () => {
    render(<MemoryRouter><Lab /></MemoryRouter>);
    const about = screen.getByRole("button", { name: /how it works/i });
    fireEvent.click(about);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
