// Decorative "sports art" layer — faint line-art bike/runner/stopwatch/route
// icons that drift gently in place, plus a few pulsing color dots. Purely
// visual (aria-hidden, pointer-events none), matching the quiet motion used
// across the brand reference on light sections. Drop it as the first child
// of any `relative overflow-hidden` section.
export default function FloatingIcons({ variant = "default", className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 170 105"
        className="absolute w-36 md:w-44 -left-8 top-[12%] text-rtg-orange-500/15"
        style={{ animation: "rtg-float-bike 8.5s ease-in-out infinite" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="38" cy="72" r="27" />
        <circle cx="131" cy="72" r="27" />
        <path d="M38 72 67 37l29 35H38l29-35 27-5 37 40" />
        <path d="M86 32h17" />
        <path d="m93 32 6-14" />
      </svg>

      <svg
        viewBox="0 0 150 150"
        className="absolute w-32 md:w-36 right-[4%] top-[13%] text-[#ff6374]/15"
        style={{ animation: "rtg-float-run 7.5s ease-in-out infinite" }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="91" cy="22" r="9" />
        <path d="M82 37 65 54l12 20 19-13 12 17" />
        <path d="M66 54 44 60 27 50" />
        <path d="M77 74 58 98 34 118" />
        <path d="M79 75 98 98l25 10" />
        <path d="M99 98 121 126" />
        <path d="M58 98 50 130" />
        <path d="M95 40 114 53l19-2" />
      </svg>

      {variant !== "compact" && (
        <svg
          viewBox="0 0 100 110"
          className="absolute w-24 md:w-28 right-[22%] bottom-[12%] text-rtg-purple-600/12"
          style={{ animation: "rtg-float-watch 10s ease-in-out infinite" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="50" cy="61" r="34" />
          <path d="M50 27V14M38 12h24M73 35l9-9M50 61l15-11" />
        </svg>
      )}

      {variant !== "compact" && (
        <svg
          viewBox="0 0 300 150"
          className="absolute w-64 md:w-80 left-[38%] -bottom-9 text-[#4aa9d5]/10"
          style={{ animation: "rtg-float-route 12s ease-in-out infinite" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 123c52-73 100-6 143-60 36-45 67 22 137-43" />
          <path d="M260 17v52M260 17h25l-8 11 8 11h-25" />
        </svg>
      )}

      <span
        className="absolute w-2.5 h-2.5 rounded-full bg-rtg-orange-500 opacity-40"
        style={{ left: "18%", top: "18%", animation: "rtg-float-dot 5.5s ease-in-out infinite" }}
      />
      <span
        className="absolute w-1.5 h-1.5 rounded-full bg-rtg-purple-300 opacity-40"
        style={{ right: "13%", top: "51%", animation: "rtg-float-dot 5.5s ease-in-out infinite -1.4s" }}
      />
      <span
        className="absolute w-3 h-3 rounded-full bg-[#45b9ca] opacity-40"
        style={{ left: "47%", bottom: "12%", animation: "rtg-float-dot 5.5s ease-in-out infinite -2.7s" }}
      />
    </div>
  );
}
