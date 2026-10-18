import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MotionGlobalConfig } from "framer-motion";

// Finish every Framer Motion animation instantly, so AnimatePresence swaps
// screens without waiting on animation frames that jsdom never paints.
MotionGlobalConfig.skipAnimations = true;
MotionGlobalConfig.instantAnimations = true;

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    /* some tests replace storage with a throwing stub */
  }
});
