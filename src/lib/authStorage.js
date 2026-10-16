// Where the Supabase session is kept, and for how long.
//
// This used to be pinned to window.sessionStorage, which is why members
// complained about being "logged out constantly": sessionStorage is scoped
// to a single tab, so closing the tab — or simply opening the site in a
// second one — meant signing in again. It was a deliberate choice at the
// time (end the session when the browser closes), but it was applied to
// everyone with no way to opt out, which is the wrong default for a club
// site people use from their phone.
//
// Now it's the member's choice. "Remember me" (on by default) keeps the
// session in localStorage, so it survives closing the browser and is shared
// across tabs. Unticking it falls back to the old per-tab behaviour, which
// is what you want on a shared or public device.
//
// supabase-js reads `storage` once, when the client is constructed, so a
// per-login toggle can't swap the client out — it has to be one adapter
// that decides per call. That's what this is.
//
// Every access is wrapped: in Safari private mode, with site data blocked,
// or inside some embedded webviews, touching these APIs throws rather than
// returning null, and an auth library crashing on page load is a much worse
// failure than a session that doesn't persist.

const REMEMBER_KEY = "rtg_remember_me";

function safeStore(getStore) {
  try {
    const store = getStore();
    // Probe it — merely existing isn't enough; it can throw on write.
    const probe = "__rtg_probe__";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

const local = () => safeStore(() => window.localStorage);
const session = () => safeStore(() => window.sessionStorage);

// Defaults to true: most people on their own phone want to stay signed in,
// and that is the complaint this exists to fix.
export function isRemembered() {
  try {
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  } catch {
    return true;
  }
}

// Called from the login forms before the sign-in request goes out, so the
// session lands in the right place the moment it's issued. Also migrates an
// already-open session, so toggling this while signed in does what it says
// instead of taking effect "next time".
export function setRemembered(value) {
  const from = value ? session() : local();
  const to = value ? local() : session();

  try {
    window.localStorage.setItem(REMEMBER_KEY, value ? "1" : "0");
  } catch {
    /* can't record the preference — the adapter still honours the default */
  }

  if (!from || !to) return;
  try {
    for (let i = from.length - 1; i >= 0; i--) {
      const key = from.key(i);
      if (!key || !key.startsWith("sb-")) continue;
      const v = from.getItem(key);
      if (v !== null) to.setItem(key, v);
      from.removeItem(key);
    }
  } catch {
    /* migration failed — worst case they sign in again */
  }
}

// The adapter handed to createClient().
export const authStorage = {
  getItem(key) {
    // Read from both regardless of the current preference. A member who was
    // signed in before this shipped has their session in sessionStorage; a
    // member who just unticked "remember me" has it there too. Preferring
    // the configured store but falling back to the other means nobody is
    // signed out by the change itself.
    const preferred = isRemembered() ? local() : session();
    const other = isRemembered() ? session() : local();
    try {
      const hit = preferred?.getItem(key);
      if (hit !== null && hit !== undefined) return hit;
    } catch {
      /* fall through */
    }
    try {
      return other?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  setItem(key, value) {
    const target = isRemembered() ? local() : session();
    const other = isRemembered() ? session() : local();
    try {
      target?.setItem(key, value);
    } catch {
      /* storage full or blocked — the session stays in memory for this page */
    }
    // Never leave a stale copy in the store we're not using, or a sign-out
    // from one would appear to be undone by the other.
    try {
      other?.removeItem(key);
    } catch {
      /* nothing to clean up */
    }
  },

  removeItem(key) {
    for (const store of [local(), session()]) {
      try {
        store?.removeItem(key);
      } catch {
        /* already gone, or inaccessible */
      }
    }
  },
};
