import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CodeInput from "../../../src/components/CodeInput.jsx";

// CodeInput is controlled, so tests drive it through a tiny stateful parent
// and observe both the boxes and every value passed to onChange.
function Harness({ initial = "", onChange = () => {}, ...props }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <CodeInput
        value={value}
        onChange={(v) => {
          onChange(v);
          setValue(v);
        }}
        {...props}
      />
      <output data-testid="value">{value}</output>
    </>
  );
}

const boxes = () => screen.getAllByRole("textbox");
const value = () => screen.getByTestId("value").textContent;

describe("CodeInput", () => {
  it("renders six labelled boxes, the first with one-time-code autofill", () => {
    render(<Harness />);
    expect(boxes()).toHaveLength(6);
    expect(screen.getByRole("group", { name: "6-digit code" })).toBeInTheDocument();
    expect(boxes()[0]).toHaveAttribute("autocomplete", "one-time-code");
    expect(boxes()[1]).toHaveAttribute("autocomplete", "off");
    expect(boxes()[0]).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Digit 6")).toBe(boxes()[5]);
  });

  it("supports a custom length", () => {
    render(<Harness length={4} />);
    expect(boxes()).toHaveLength(4);
  });

  it("typing advances focus box by box", async () => {
    const user = userEvent.setup();
    render(<Harness autoFocus />);
    expect(boxes()[0]).toHaveFocus();
    await user.keyboard("123");
    expect(value()).toBe("123");
    expect(boxes()[3]).toHaveFocus();
    await user.keyboard("456");
    expect(value()).toBe("123456");
    expect(boxes().map((b) => b.value)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(boxes()[5]).toHaveFocus();
  });

  it("ignores non-digits", async () => {
    const user = userEvent.setup();
    render(<Harness autoFocus />);
    await user.keyboard("a-1 b2");
    expect(value()).toBe("12");
  });

  it("pasting a whole code fills every box", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness autoFocus onChange={onChange} />);
    await user.paste("Your code: 987-654");
    expect(value()).toBe("987654");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(boxes()[5]).toHaveFocus();
  });

  it("pasting more than six digits keeps the first six", async () => {
    const user = userEvent.setup();
    render(<Harness autoFocus />);
    await user.paste("12345678");
    expect(value()).toBe("123456");
  });

  it("pasting into a later box keeps the digits before it", async () => {
    render(<Harness initial="12" />);
    fireEvent.paste(boxes()[2], { clipboardData: { getData: () => "3456" } });
    expect(value()).toBe("123456");
  });

  it("pasting text without digits changes nothing", async () => {
    const onChange = vi.fn();
    render(<Harness initial="12" onChange={onChange} />);
    fireEvent.paste(boxes()[2], { clipboardData: { getData: () => "abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("autofill of the whole code into the first box fills them all", () => {
    render(<Harness />);
    fireEvent.change(boxes()[0], { target: { value: "246810" } });
    expect(value()).toBe("246810");
  });

  it("Backspace on an empty box deletes the previous digit and moves back", async () => {
    const user = userEvent.setup();
    render(<Harness autoFocus />);
    await user.keyboard("123");
    expect(boxes()[3]).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(value()).toBe("12");
    expect(boxes()[2]).toHaveFocus();
    await user.keyboard("{Backspace}");
    expect(value()).toBe("1");
    expect(boxes()[1]).toHaveFocus();
  });

  it("Backspace on a filled box clears it and stays put", async () => {
    const user = userEvent.setup();
    render(<Harness initial="123456" />);
    await user.click(boxes()[5]);
    await user.keyboard("{Backspace}");
    expect(value()).toBe("12345");
    expect(boxes()[5]).toHaveFocus();
  });

  it("Backspace on the first, empty box does nothing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness autoFocus onChange={onChange} />);
    await user.keyboard("{Backspace}");
    expect(onChange).not.toHaveBeenCalled();
    expect(boxes()[0]).toHaveFocus();
  });

  it("overtyping a filled box replaces that digit (cursor after it)", () => {
    render(<Harness initial="123456" />);
    // the browser appended the new key after the existing digit
    fireEvent.change(boxes()[2], { target: { value: "39" } });
    expect(value()).toBe("129456");
  });

  it("overtyping a filled box replaces that digit (cursor before it)", () => {
    render(<Harness initial="123456" />);
    fireEvent.change(boxes()[2], { target: { value: "73" } });
    expect(value()).toBe("127456");
  });

  it("typing into a selected box replaces it and advances", async () => {
    const user = userEvent.setup();
    render(<Harness initial="123456" />);
    await user.click(boxes()[1]); // focus selects the digit
    await user.keyboard("9");
    expect(value()).toBe("193456");
    expect(boxes()[2]).toHaveFocus();
  });

  it("clicking a box past the first empty one jumps back to the first empty", async () => {
    const user = userEvent.setup();
    render(<Harness initial="12" />);
    await user.click(boxes()[5]);
    expect(boxes()[2]).toHaveFocus();
  });

  it("arrow keys move between boxes", async () => {
    const user = userEvent.setup();
    render(<Harness initial="123456" />);
    await user.click(boxes()[3]);
    await user.keyboard("{ArrowLeft}");
    expect(boxes()[2]).toHaveFocus();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(boxes()[4]).toHaveFocus();
  });

  it("disables every box when disabled", () => {
    render(<Harness disabled />);
    boxes().forEach((b) => expect(b).toBeDisabled());
  });

  // Regression for a bug found while testing: clearing a box any way other
  // than Backspace (Delete key, cut, some Android keyboards) produced an
  // empty change event that was ignored, so the digit snapped back.
  it("clearing a filled box without Backspace (Delete / cut) removes the digit", () => {
    render(<Harness initial="123456" />);
    fireEvent.change(boxes()[2], { target: { value: "" } });
    expect(value()).toBe("12456");
  });
});
