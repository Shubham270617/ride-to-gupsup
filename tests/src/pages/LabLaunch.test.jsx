import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Lab from "../../../src/pages/Lab";

vi.mock("../../../src/lib/publicData", () => ({ useSiteSettings: () => ({}) }));
const reads = vi.hoisted(() => ({ highlights: vi.fn(() => []), periods: vi.fn(() => []) }));
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
    useLabPrinciples: () => [{ id: "old", title: "Recognition", text: "Weekly to yearly rewards" }],
  };
});

describe("Lab during the Strava pause", () => {
  it("keeps Ridge, hides Strava, suppresses tiles/period reads and safely reopens the about dialog", () => {
    render(<MemoryRouter><Lab /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Explore Ridge" })).toHaveAttribute("href", "/lab/ridge");
    expect(screen.queryByText("RTG Club Lab")).not.toBeInTheDocument();
    expect(screen.queryByText(/two labs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/weekly to yearly rewards/i)).not.toBeInTheDocument();
    expect(reads.highlights).not.toHaveBeenCalled();
    expect(reads.periods).not.toHaveBeenCalled();
    const about = screen.getByRole("button", { name: /how it works/i });
    fireEvent.click(about);
    expect(screen.getByRole("dialog")).not.toHaveTextContent(/Strava|RTG Club Lab|weekly, monthly/i);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(about);
    fireEvent.click(screen.getAllByRole("button", { name: "Got it", exact: true })[1]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
