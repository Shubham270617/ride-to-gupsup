// The Lab pages' backdrop, fixed to the viewport: soft colour washes, two big
// rings, drifting sports line-art, two dashed routes and three pulsing dots.
// Purely decorative. `className` is the page's own name for it (its position
// and colours are in styles/lab.css).
export default function LabBackdrop({ className = "lab-background" }) {
  return (
    <div className={className} aria-hidden="true">
      <svg className="bg-bike-v4" viewBox="0 0 240 150">
        <circle cx="52" cy="104" r="32" />
        <circle cx="187" cy="104" r="32" />
        <path d="M52 104 93 46h34l60 58M93 46l31 58M82 72h76M110 28h39" />
        <path d="M124 104 143 70" />
      </svg>
      <svg className="bg-runner-v4" viewBox="0 0 150 150">
        <circle cx="92" cy="22" r="9" />
        <path d="M83 37 65 55l13 20 19-13 12 17" />
        <path d="M66 55 44 61 26 51" />
        <path d="M78 75 58 99 34 120" />
        <path d="M80 76 99 99l25 10" />
        <path d="M99 99 121 128" />
        <path d="M58 99 50 131" />
      </svg>
      <svg className="bg-shoe-v4" viewBox="0 0 180 95">
        <path d="M17 58c22 3 37 1 52-10l19-14 18 15c11 9 22 14 39 17l18 4c7 2 10 8 8 14-2 5-6 7-13 7H42c-18 0-28-7-25-33Z" />
        <path d="M72 47 84 57M84 39 96 50M98 43l13 12" />
        <path d="M31 72h120" />
      </svg>
      <svg className="bg-watch-v4" viewBox="0 0 140 140">
        <circle cx="70" cy="78" r="39" />
        <path d="M70 39V23M55 19h30M96 47l10-10" />
        <path d="M70 78 88 63" />
        <circle cx="70" cy="78" r="4" />
      </svg>
      <svg className="bg-flag-v4" viewBox="0 0 120 150">
        <path d="M33 127V21" />
        <path d="M34 26c27-13 36 11 61-2v45c-23 13-36-10-61 3" />
        <path d="M22 128h23" />
      </svg>
      <svg className="bg-route-v4" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <path className="route-a-v4" d="M-40 170C150 80 260 260 430 165C590 72 720 265 885 158C1034 61 1170 193 1480 72" />
        <path className="route-b-v4" d="M-80 738C120 622 255 798 450 687C632 584 790 755 970 650C1126 558 1250 664 1480 560" />
      </svg>
      <span className="bg-pulse-v4 pulse-a-v4" />
      <span className="bg-pulse-v4 pulse-b-v4" />
      <span className="bg-pulse-v4 pulse-c-v4" />
      <span className="bg-glow-v4 glow-a-v4" />
      <span className="bg-glow-v4 glow-b-v4" />
    </div>
  );
}
