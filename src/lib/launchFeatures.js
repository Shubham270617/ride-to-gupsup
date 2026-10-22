// Public UI launch gate. Keep disabled until Strava permission is confirmed.
// Re-enable in code only after approval; this does not stop server-side sync,
// revoke existing connections, or replace API authorization checks.
export const STRAVA_ENABLED = false;

export const publicAuthProviders = (providers) => ({
  ...providers,
  strava: STRAVA_ENABLED && Boolean(providers?.strava),
});

export function visibleLabProgrammes(labs) {
  if (STRAVA_ENABLED) return labs;
  return labs.filter((lab) => lab.slug !== "strava-challenge" &&
    ![lab.link, lab.secondaryLink].some((link) => /(?:^|\/)lab\/strava(?:[/?#]|$)/i.test(link || "")));
}

// Preserve editable full-launch copy in the database. While paused, override
// promises tied to the Strava board (including previously saved admin copy).
export function launchLabCopy(copy) {
  if (STRAVA_ENABLED) return copy;
  return {
    ...copy,
    heroText: "Your home for challenges, progress and recognition. Explore Ridge Repeats and celebrate your progress with the RTG community.",
    heroNotes: "RIDGE REPEATS, COMMUNITY, PERSONAL PROGRESS",
    coreBottom: "EFFORT · PROGRESS · COMMUNITY",
    labsTitle: "Your next challenge.",
    labsTitleAccent: "More possibilities.",
    labsText: "Explore Ridge Repeats today.\nMore challenges will join the hub in time.",
    aboutBody: "RTG Lab brings challenges, performance and recognition together. Explore Ridge Repeats to see its format, session results and progress.\n\n## Find your benchmark\nOpen Ridge Repeats to learn how its sessions and rankings work.\n\n## Celebrate the journey\nFollow your progress with the RTG community. Future challenges and event results will join the same hub.",
  };
}

// The seeded principles also advertise the paused board's sport/category
// filters and weekly-to-yearly rewards. Keep those promises out of launch.
export function launchLabPrinciples(principles) {
  return STRAVA_ENABLED ? principles : [
    { id: "launch-format", title: "Know your challenge", text: "Explore Ridge Repeats to learn its session format and how results are measured." },
    { id: "launch-progress", title: "Your journey, visible", text: "Follow your session results and personal progress over time." },
    { id: "launch-community", title: "Better together", text: "Share the effort and celebrate progress with the RTG community." },
  ];
}
