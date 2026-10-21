import { useEffect, useState } from 'react';
import { createLayoutStore } from './store';
import { approvedPublishedRidgeLayout, PUBLISHED_LAYOUTS_ENABLED } from './connection';

// No session/token is read for this path. The store's published action only
// accesses the backend's hardcoded published projection.
const publicStore = createLayoutStore({ getAccessToken: async () => null });
export default function usePublishedRidgeLayout({ enabled = PUBLISHED_LAYOUTS_ENABLED, store = publicStore } = {}) {
  const [state, setState] = useState({ document: null, loading: false });
  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setState({ document: null, loading: false }); return; }
    setState({ document: null, loading: true });
    Promise.resolve().then(() => cancelled ? null : store.loadPublished('ridge')).then(record => {
      if (!cancelled) setState({ document: approvedPublishedRidgeLayout(record), loading: false });
    }).catch(() => {
      // Unpublished, disabled, forbidden, bad schema and network errors all
      // preserve the existing page. Never fall back to local/editor drafts.
      if (!cancelled) setState({ document: null, loading: false });
    });
    return () => { cancelled = true; };
  }, [enabled, store]);
  // No one-render flash of a previously enabled document after access closes.
  return enabled ? state : { document: null, loading: false };
}
