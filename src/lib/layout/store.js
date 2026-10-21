import { validateLayout } from './model';
// Caller injects a session-token reader. No service keys enter the browser.
export function createLayoutStore({ getAccessToken, fetcher = fetch, endpoint = '/api/admin/page-layouts' }) {
  async function request(action, pageKey, payload) {
    const token = action === 'published' ? null : await getAccessToken();
    if (action !== 'published' && !token) throw new Error('Please sign in again.');
    const read = ['draft', 'published'].includes(action);
    const response = await fetcher(read ? `${endpoint}?action=${action}&pageKey=${encodeURIComponent(pageKey)}` : endpoint, {
      method: read ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!read ? { 'Content-Type': 'application/json' } : {}) },
      ...(!read ? { body: JSON.stringify({ action, pageKey, ...payload }) } : {}),
    });
    const body = await response.json();
    if (!response.ok) { const error = new Error(body.error === 'revision_conflict' ? 'This page changed elsewhere. Reload before saving.' : body.error || 'Layout request failed.'); error.status = response.status; throw error; }
    if (body.layout?.document) body.layout.document = validateLayout(body.layout.document);
    return body.layout;
  }
  return { loadDraft: pageKey => request('draft', pageKey), loadPublished: pageKey => request('published', pageKey), saveDraft: (pageKey, document, expectedRevision) => request('save', pageKey, { document: validateLayout(document), expectedRevision }), publish: (pageKey, expectedRevision) => request('publish', pageKey, { expectedRevision }) };
}
