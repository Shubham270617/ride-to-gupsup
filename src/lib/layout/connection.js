import { createLayoutStore } from './store';
import { validateLayout } from './model';

// Server authorization remains authoritative. This switch only suppresses
// public layout reads until release configuration has been reviewed.
export const PUBLISHED_LAYOUTS_ENABLED = import.meta.env.VITE_RTG_LAYOUT_PUBLISHED_ENABLED === 'true';
export function createAuthenticatedLayoutStore(client, fetcher = fetch) {
  if (!client?.auth?.getSession) return null;
  return createLayoutStore({
    fetcher,
    getAccessToken: async () => {
      const { data, error } = await client.auth.getSession();
      if (error || !data?.session?.access_token) throw new Error('Please sign in again.');
      return data.session.access_token;
    },
  });
}
// Treat API payloads as untrusted. Only an explicitly published snapshot for
// the intended page may replace an intro, never a local or draft document.
export function approvedPublishedRidgeLayout(record) {
  if (record?.page_key !== 'ridge' || !Number.isSafeInteger(record.revision) || record.revision < 1 || typeof record.published_at !== 'string' || !Number.isFinite(Date.parse(record.published_at))) return null;
  try { return validateLayout(record.document); } catch { return null; }
}

// Feed must be the already-loaded authorized/publication feed, not admin rows.
// Official award winners are supplied from persisted sessionAwards(), never
// inferred from points or assigned to the highest scorer by this mapper.
export function ridgeLayoutSectionData(document, { feed, sessionSlug, officialAwards = [], dataReady = false } = {}) {
  if (!dataReady || !feed?.sessions || !document?.sections) return {};
  const sessions = sessionSlug ? feed.sessions.filter(s => s.slug === sessionSlug) : feed.sessions;
  if (!sessions.length) return {};
  const records = sessions.flatMap(s => Array.isArray(s.riders) ? s.riders : []);
  const riderIds = new Set(records.map(r => r.athleteId || r.key).filter(Boolean));
  const loops = records.reduce((total, r) => total + (Number.isInteger(r.laps) && r.laps >= 0 && r.laps <= 5 ? r.laps : 0), 0);
  const stats = [
    { id: 'sessions', value: String(sessions.length), label: sessionSlug ? 'Session selected' : 'Published sessions' },
    { id: 'riders', value: String(riderIds.size), label: 'Riders recorded' },
    { id: 'loops', value: String(loops), label: 'Completed loops' },
  ];
  const spotlight = officialAwards.flatMap((award, index) => (Array.isArray(award.winners) ? award.winners : []).filter(name => typeof name === 'string' && name.trim()).map((name, winner) => ({ id: `${award.slug || index}:${winner}`, name, detail: String(award.name || 'Session recognition') })));
  return Object.fromEntries(document.sections.map(section => [section.id, section.type === 'stats' ? { items: stats } : section.type === 'spotlight' ? { items: spotlight } : {}]));
}
