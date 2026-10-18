import { useRef } from "react";

// Six separate boxes for a 6-digit code. Typing moves to the next box,
// Backspace on an empty box moves back, and pasting the whole code (or the
// phone's one-time-code autofill) fills every box at once.
export default function CodeInput({ value, onChange, length = 6, autoFocus = false, disabled = false }) {
  const refs = useRef([]);
  // The newest value, including one just passed to onChange that hasn't
  // re-rendered yet. focus() inside onChange fires the next box's onFocus
  // synchronously, before React commits — reading the `value` prop there
  // saw the old code and bounced focus back, dropping typed digits.
  const latest = useRef(value);
  latest.current = value;
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const commit = (next) => {
    latest.current = next;
    onChange(next);
  };

  const setFrom = (index, text) => {
    const incoming = text.replace(/\D/g, "");
    if (!incoming) return;
    const next = (value.slice(0, index) + incoming).slice(0, length);
    commit(next);
    focus(next.length);
  };

  const handleKeyDown = (i) => (e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1));
      } else if (i > 0) {
        commit(value.slice(0, i - 1) + value.slice(i));
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      focus(i + 1);
    }
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-2.5" role="group" aria-label="6-digit code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1}`}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={digit}
          // Only ever lands on the first empty box, so codes can't be
          // entered with gaps in them.
          onFocus={(e) => {
            const filled = latest.current.length;
            if (i > filled) focus(filled);
            else e.target.select();
          }}
          onChange={(e) => {
            let raw = e.target.value.replace(/\D/g, "");
            // Typed over a filled box without selecting it first: keep the new digit.
            if (digit && raw.length === 2) raw = raw.startsWith(digit) ? raw[1] : raw[0];
            if (raw.length === 1) {
              commit((value.slice(0, i) + raw + value.slice(i + 1)).slice(0, length));
              focus(i + 1);
            } else if (!e.target.value && digit) {
              // Cleared some other way than Backspace (Delete, cut, some
              // Android keyboards that don't report the key).
              commit(value.slice(0, i) + value.slice(i + 1));
            } else {
              setFrom(i, raw);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            setFrom(i, e.clipboardData.getData("text"));
          }}
          onKeyDown={handleKeyDown(i)}
          className={`h-14 w-full min-w-0 rounded-2xl border bg-white text-center font-display text-2xl text-rtg-white transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15 disabled:opacity-60 ${
            digit ? "border-rtg-orange-400/60 bg-rtg-orange-500/[0.04]" : "border-rtg-border"
          }`}
        />
      ))}
    </div>
  );
}
