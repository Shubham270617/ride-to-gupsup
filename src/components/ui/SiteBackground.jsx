// The brand's global white canvas — soft rings, orbit ellipses and faint
// sports line-art (bike, stopwatch, shoe, route, medal, runner) with a few
// coloured dots, all FIXED to the viewport so page content scrolls over it.
// Rendered once in Layout; it only shows through sections that don't paint
// their own background (Home's "Why RTG" and "Ways to Move" today).
// Purely decorative: aria-hidden, pointer-events none. Layout and sizes are
// in index.css under "SITE BACKGROUND" (they need a mobile media query and
// rotated/offset positions that don't read well as utility classes).
export default function SiteBackground() {
  return (
    <div className="rtg-site-bg" aria-hidden="true">
      <span className="rtg-bg-ring rtg-bg-ring-one" />
      <span className="rtg-bg-ring rtg-bg-ring-two" />
      <span className="rtg-bg-orbit rtg-bg-orbit-one" />
      <span className="rtg-bg-orbit rtg-bg-orbit-two" />

      <svg className="rtg-bg-art rtg-bg-bike" viewBox="0 0 360 230">
        <circle cx="78" cy="160" r="50" />
        <circle cx="276" cy="160" r="50" />
        <path d="M78 160 139 78h54l83 82M139 78l48 82M111 116h125M155 54h50" />
        <path d="M182 160 226 78h32M226 78l26-13" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-watch" viewBox="0 0 170 170">
        <circle cx="85" cy="95" r="48" />
        <path d="M69 26h32M85 26v18M113 49l13-13M85 95l21-18" />
        <path d="M85 58v8M122 95h-8M85 132v-8M48 95h8" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-shoe" viewBox="0 0 270 150">
        <path d="M22 100c19-2 29-19 43-43 8 2 13 8 17 17 9 21 24 31 53 33l39 3c19 1 37 8 52 19 7 5 10 11 9 18H17c-2-16 0-28 5-38z" />
        <path d="M143 82h27M165 87h25M188 93h23" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-route" viewBox="0 0 210 210">
        <path d="M46 170c0-33 21-53 48-53 24 0 37-14 37-35 0-24 20-42 45-42" />
        <circle cx="46" cy="170" r="11" />
        <circle cx="176" cy="40" r="9" />
        <path d="M176 49v39M176 49h22l-5 8 5 8h-22" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-bike-mini" viewBox="0 0 240 160">
        <circle cx="54" cy="111" r="31" />
        <circle cx="178" cy="111" r="31" />
        <path d="M54 111 91 58h32l55 53M91 58l28 53M81 82h76M103 42h34" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-medal" viewBox="0 0 170 210">
        <path d="M58 18h22l11 41H68z" />
        <path d="M90 18h22l-10 41H79z" />
        <circle cx="85" cy="106" r="44" />
        <path d="M85 80l8 16 18 2-13 13 4 18-17-9-17 9 4-18-13-13 18-2z" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-lines" viewBox="0 0 440 240">
        <path d="M18 195C123 119 210 86 416 69" />
        <path d="M42 214C151 139 237 108 427 95" />
        <path d="M84 233C187 170 265 142 432 128" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-runner" viewBox="0 0 180 180">
        <circle cx="116" cy="28" r="11" />
        <path d="M105 45 84 67l16 25 23-17 14 20" />
        <path d="M86 66 58 75l-21-11" />
        <path d="M100 92 76 121 47 145" />
        <path d="M103 94 126 120l31 12" />
        <path d="M126 120 151 153" />
        <path d="M76 121 66 157" />
        <path d="M121 49 145 65l23-2" />
      </svg>
      <svg className="rtg-bg-art rtg-bg-runner-mini" viewBox="0 0 150 150">
        <circle cx="91" cy="22" r="9" />
        <path d="M82 37 65 54l12 20 19-13 12 17" />
        <path d="M66 54 44 60 27 50" />
        <path d="M77 74 58 98 34 118" />
        <path d="M79 75 98 98l25 10" />
        <path d="M99 98 121 126" />
        <path d="M58 98 50 130" />
        <path d="M95 40 114 53l19-2" />
      </svg>

      <span className="rtg-bg-dot rtg-bg-dot-a" />
      <span className="rtg-bg-dot rtg-bg-dot-b" />
      <span className="rtg-bg-dot rtg-bg-dot-c" />
      <span className="rtg-bg-dot rtg-bg-dot-d" />
      <span className="rtg-bg-dot rtg-bg-dot-e" />
      <span className="rtg-bg-dot rtg-bg-dot-f" />
      <span className="rtg-bg-dot rtg-bg-dot-g" />
      <span className="rtg-bg-dot rtg-bg-dot-h" />
    </div>
  );
}
