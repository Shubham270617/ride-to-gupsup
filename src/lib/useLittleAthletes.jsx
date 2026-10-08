import { useCallback, useRef, useState } from "react";

// Site Photos that hold the figures (data/images.js) — add a key here and
// in images.js to put another athlete in the race.
const FIGURE_KEYS = ["playCyclist", "playRunner", "playSwimmer"];
const PER_CLICK = 3; // athletes sent out by one press of the button
const MAX_ON_SCREEN = 18; // the oldest leave early once there are more than this
const HOP_MS = 650;

const between = (min, max) => min + Math.random() * (max - min);

// One athlete: which figure, which lane (top %), how big, how long the
// crossing takes, and which edge it starts from.
function newAthlete(id, src) {
  return {
    id,
    src,
    top: between(6, 78),
    size: between(54, 92),
    crossing: between(5, 9),
    fromLeft: Math.random() < 0.5,
    bob: between(0.5, 0.95),
  };
}

// The "little athletes": a press of a button sends a few figures riding,
// running and swimming once across whatever band shows them, then they are
// gone. Poke one on its way and it hops. Purely for fun — nothing is saved.
//
// Returns `send` (what the button calls) and `field` (the layer the figures
// cross — place it inside a `position: relative` box). Used by the Join
// band on Home (components/sections/JoinCTA.jsx).
//
// Figures: Admin -> Site Photos (Play Cyclist / Runner / Swimmer).
// Motion is in index.css under "LITTLE ATHLETES" (.rtg-play-*).
export default function useLittleAthletes(images) {
  const [athletes, setAthletes] = useState([]);
  const [hopping, setHopping] = useState({}); // id -> true while it hops
  const nextId = useRef(1);

  const send = () => {
    const figures = FIGURE_KEYS.map((key) => images[key]).filter(Boolean);
    if (figures.length === 0) return;
    const fresh = Array.from({ length: PER_CLICK }, () => newAthlete(nextId.current++, figures[Math.floor(Math.random() * figures.length)]));
    setAthletes((current) => [...current, ...fresh].slice(-MAX_ON_SCREEN));
  };

  // An athlete that has reached the far edge has finished: take it away.
  const finish = useCallback((id) => setAthletes((current) => current.filter((a) => a.id !== id)), []);

  const hop = (id) => {
    setHopping((current) => ({ ...current, [id]: true }));
    setTimeout(() => setHopping(({ [id]: _done, ...rest }) => rest), HOP_MS);
  };

  const field = (
    <div className="rtg-play-field" aria-hidden="true">
      {athletes.map((a) => (
        <button
          key={a.id}
          type="button"
          tabIndex={-1}
          className={`rtg-play-athlete${a.fromLeft ? " is-from-left" : ""}`}
          style={{ top: `${a.top}%`, width: a.size, animationDuration: `${a.crossing}s` }}
          onClick={() => hop(a.id)}
          // Only the crossing ending counts — the image's own bob / hop
          // animations bubble up here too.
          onAnimationEnd={(e) => e.target === e.currentTarget && finish(a.id)}
        >
          {hopping[a.id] ? <img src={a.src} alt="" className="is-hopping" draggable={false} /> : <img src={a.src} alt="" style={{ animationDuration: `${a.bob}s` }} draggable={false} />}
        </button>
      ))}
    </div>
  );

  return { send, field };
}
