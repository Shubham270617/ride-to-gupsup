import { it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RiderMemberLink from "../../../src/admin/components/RiderMemberLink";

const member = { id: "00000000-0000-4000-8000-000000000002", full_name: "Rohit Kumar", email: "rohit@example.com" };
function fakeClient(rows) {
  const calls = [];
  const q = { select: () => q, or: (f) => { calls.push(f); return q; }, limit: () => Promise.resolve({ data: rows, error: null }) };
  return { client: { from: () => q }, calls };
}

it("searches members by name or email and links the chosen one", async () => {
  const { client, calls } = fakeClient([member]);
  const onSave = vi.fn().mockResolvedValue(true);
  render(<RiderMemberLink rider={{ id: "r1", name: "Rohit" }} onSave={onSave} client={client} />);
  fireEvent.click(screen.getByRole("button", { name: "Link member" }));
  fireEvent.change(screen.getByLabelText("Find the RTG member for Rohit"), { target: { value: "roh,it" } });
  fireEvent.click(await screen.findByRole("button", { name: /Rohit Kumar/ }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(member.id, "Rohit Kumar"));
  expect(calls[0]).toBe("full_name.ilike.%roh it%,email.ilike.%roh it%"); // commas can't break the filter
});

it("a linked rider shows the member and can be unlinked", () => {
  const onSave = vi.fn();
  render(<RiderMemberLink rider={{ id: "r1", name: "Rohit", profileId: member.id, memberName: "Rohit Kumar" }} onSave={onSave} client={fakeClient([]).client} />);
  expect(screen.getByText(/Rohit Kumar/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
  expect(onSave).toHaveBeenCalledWith(null, "");
});
