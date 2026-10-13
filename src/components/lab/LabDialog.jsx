import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// A window over the page: the access steps, "How it works", a rider's
// record, the plan summary … It is drawn at the end of <body> so it covers
// the navbar, but it stays BELOW the site's intro and login pop-up (so "Log
// in" inside a window can open the login pop-up on top of it).
//
// `scope` is the page's root class (rtg-lab | rtg-mem | rtg-ridge): the
// window is outside the page's own element, and this is what gives it that
// page's look (styles/lab.css). Escape, and a click on the dimmed area
// around it, close it through `onClose`.
export default function LabDialog({ open, onClose, scope = "rtg-lab", className, labelledBy, children }) {
  const overlay = useRef(null);
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus({ preventScroll: true });

    // With two windows open (a rider's record, then their photo card),
    // Escape closes only the one on top.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const all = document.querySelectorAll(".lab-overlay");
      if (all[all.length - 1] === overlay.current) close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (before && before.isConnected) before.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div
      ref={overlay}
      className={`lab-overlay ${scope}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog open ref={dialog} tabIndex={-1} className={className} aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </dialog>
    </div>,
    document.body
  );
}
