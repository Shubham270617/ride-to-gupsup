import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

// A timer code with an eye button (show / hide) and a copy button. Starts
// hidden so it isn't exposed on a shared or recorded screen.
export default function SecretCode({ code }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Older browsers / blocked clipboard: show it so it can be copied by hand.
      setShown(true);
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tc-secret-row">
      <output className="tc-secret" aria-label={shown ? "Timer code" : "Timer code (hidden)"}>
        {shown ? code : "•".repeat(Math.min(code.length, 12))}
      </output>
      <button type="button" className="tc-icon-btn" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide code" : "Show code"} title={shown ? "Hide code" : "Show code"}>
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      <button type="button" className="tc-icon-btn" onClick={copy} aria-label="Copy code" title="Copy code">
        {copied ? <Check size={18} /> : <Copy size={18} />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    </div>
  );
}

// The "Access code" box on the timer page, with an eye button to check
// what was typed or pasted.
export function CodeInput({ value, onChange }) {
  const [shown, setShown] = useState(false);
  return (
    <span style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <input type={shown ? "text" : "password"} autoComplete="off" spellCheck={false} value={value} onChange={onChange} required style={{ flex: 1, minWidth: 0 }} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-label={shown ? "Hide code" : "Show code"} title={shown ? "Hide code" : "Show code"} style={{ display: "grid", placeItems: "center", minWidth: 48 }}>
        {shown ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
