import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import RidgeImportPreview, { MAX_CSV_BYTES } from "../../../src/admin/pages/RidgeImportPreview";
import { OFFICIAL_HEADERS } from "../../../src/lib/ridge/officialImport";

const csv = (row = "17-10-2026,Synthetic Rider,02:00,1.25,2.5,,0,3.75,4,2,9.75") => `${OFFICIAL_HEADERS.join(",")}\n${row}`;
function change(label, value) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }
function setup(text = csv()) {
  render(<RidgeImportPreview />);
  change("Session Scores CSV", text);
  change(/Confirmed identity map/, JSON.stringify([{ id: "synthetic-stable-id", name: "Synthetic Rider", aliases: [] }]));
  change("Source workbook ID", "synthetic-workbook");
  change("Source sheet", "Session Scores");
  change("Immutable snapshot / version ID", "synthetic-version-1");
}
function validate() { fireEvent.click(screen.getByRole("button", { name: "Validate dry run" })); }

describe("Ridge official import dry-run page", () => {
  it("starts empty without defaults or network access", () => {
    render(<RidgeImportPreview />);
    expect(screen.getByLabelText("Session Scores CSV")).toHaveValue("");
    expect(screen.getByLabelText(/Confirmed identity map/)).toHaveValue("");
    expect(screen.getByText("Dry run only — no data saved or published.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    validate();
    expect(screen.getByRole("alert")).toHaveTextContent("Provide a Session Scores CSV first");
  });
  it("preserves official values, missing points and zero points distinctly", () => {
    setup(); validate();
    expect(screen.getByRole("status")).toHaveTextContent("Validation passed for this preview only");
    const row = within(screen.getByRole("table")).getAllByRole("row")[1];
    expect(within(row).getAllByRole("cell").map(cell => cell.textContent)).toEqual([
      "2026-10-17", "Synthetic Rider", "synthetic-stable-id", "02:00", "1.25", "2.5", "—", "0", "3.75", "4", "2", "9.75", "2",
    ]);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /publish|save|import/i })).not.toBeInTheDocument();
  });
  it("reports missing provenance and unresolved identity rather than inferring either", () => {
    setup(); change("Source workbook ID", ""); change(/Confirmed identity map/, "[]"); validate();
    expect(screen.getByText(/PROVENANCE_REQUIRED/)).toBeInTheDocument();
    expect(screen.getByText(/UNRESOLVED_IDENTITY/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Review required");
  });
  it("reports malformed and non-array JSON", () => {
    setup(); change(/Confirmed identity map/, "{"); validate();
    expect(screen.getByRole("alert")).toHaveTextContent("valid JSON");
    change(/Confirmed identity map/, "{}"); validate();
    expect(screen.getByRole("alert")).toHaveTextContent("JSON array");
  });
  it("shows warnings and preserves totals when improvement is missing", () => {
    setup(csv("17-10-2026,Synthetic Rider,02:00,1.25,2.5,,0,,4,2,9.75")); validate();
    expect(screen.getByText(/TOTAL_UNVERIFIABLE/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Review required");
    expect(screen.getByRole("cell", { name: "9.75", exact: true })).toBeInTheDocument();
  });
  it("shows parser and mismatch errors without a success claim", () => {
    setup('"unclosed'); validate();
    expect(screen.getByText(/INPUT_SCHEMA/)).toBeInTheDocument();
    change("Session Scores CSV", csv("17-10-2026,Synthetic Rider,02:00,1.25,2.5,,0,3.75,4,2,99")); validate();
    expect(screen.getByText(/TOTAL_MISMATCH/)).toBeInTheDocument();
  });
  it("invalidates results on edits and clears all inputs", () => {
    setup(); validate();
    change("Source sheet", "Different sheet");
    expect(screen.queryByRole("region", { name: "Dry run results" })).not.toBeInTheDocument();
    validate();
    fireEvent.click(screen.getByRole("button", { name: "Clear inputs and preview" }));
    expect(screen.getByLabelText("Session Scores CSV")).toHaveValue("");
    expect(screen.getByLabelText(/Confirmed identity map/)).toHaveValue("");
    expect(screen.getByLabelText("Source workbook ID")).toHaveValue("");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("reads a local CSV file and refuses oversized files before parsing", async () => {
    setup("");
    const fileInput = screen.getByLabelText(/CSV file/);
    fireEvent.change(fileInput, { target: { files: [new File([csv()], "scores.csv", { type: "text/csv" })] } });
    await waitFor(() => expect(screen.getByLabelText("Session Scores CSV")).toHaveValue(csv()));
    validate();
    expect(screen.getByRole("status")).toHaveTextContent("Validation passed");
    fireEvent.change(fileInput, { target: { files: [new File(["x".repeat(MAX_CSV_BYTES + 1)], "large.csv")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("exceeds the 1 MiB limit");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects oversized pasted UTF-8 input", () => {
    setup("é".repeat(MAX_CSV_BYTES / 2 + 1)); validate();
    expect(screen.getByRole("alert")).toHaveTextContent("CSV text exceeds");
  });
  it("rejects an oversized identity map before parsing", () => {
    setup(); change(/Confirmed identity map/, "é".repeat(65537)); validate();
    expect(screen.getByRole("alert")).toHaveTextContent("Identity map exceeds the 128 KiB limit");
  });
  it("handles file read failure without showing stale candidate records", () => {
    let reader;
    vi.stubGlobal("FileReader", class {
      constructor() { reader = this; this.readyState = 0; }
      readAsText() { this.readyState = 1; }
      abort() { this.readyState = 2; }
    });
    setup(); validate();
    fireEvent.change(screen.getByLabelText(/CSV file/), { target: { files: [new File([csv()], "scores.csv")] } });
    act(() => reader.onerror());
    expect(screen.getByRole("alert")).toHaveTextContent("Could not read this CSV file");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("ignores a late file read after clearing the page", () => {
    let reader;
    vi.stubGlobal("FileReader", class {
      constructor() { reader = this; this.readyState = 0; }
      readAsText() { this.readyState = 1; }
      abort() { this.readyState = 2; }
    });
    setup("");
    fireEvent.change(screen.getByLabelText(/CSV file/), { target: { files: [new File([csv()], "scores.csv")] } });
    expect(screen.getByRole("button", { name: "Validate dry run" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Clear inputs and preview" }));
    reader.result = csv(); reader.onload();
    expect(screen.getByLabelText("Session Scores CSV")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Validate dry run" })).toBeEnabled();
  });
});
