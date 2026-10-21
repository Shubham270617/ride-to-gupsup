import { validateLayout } from './model';
// Caller injects a session-token reader. No service keys enter the browser.
export function createLayoutStore({ getAccessToken, fetcher = fetch, endpoint = '/api/admin/page-layouts', requestTimeoutMs = 20000 }) {
  async function request(action, pageKey, payload) {
    const read = ['draft', 'published'].includes(action);
    const controller = new AbortController();
    let dispatched = false;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(!read && dispatched
          ? 'The save response timed out. Its outcome is unknown. Load the shared draft before trying again.'
          : 'Loading timed out. Your draft is unchanged. Try Load shared draft again; if it continues, sign in again.');
        error.code = 'layout_request_timeout';
        error.uncertain = !read && dispatched;
        reject(error);
        controller.abort();
      }, requestTimeoutMs);
    });
    const operation = async () => {
      const token = action === 'published' ? null : await getAccessToken();
      // A delayed session lookup must not dispatch a request after timeout.
      if (controller.signal.aborted) throw new Error('Layout request expired.');
      if (action !== 'published' && !token) throw new Error('Please sign in again.');
      dispatched = true;
      const response = await fetcher(read ? `${endpoint}?action=${action}&pageKey=${encodeURIComponent(pageKey)}` : endpoint, {
        method: read ? 'GET' : 'POST', signal: controller.signal,
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!read ? { 'Content-Type': 'application/json' } : {}) },
        ...(!read ? { body: JSON.stringify({ action, pageKey, ...payload }) } : {}),
      });
      const body = await response.json();
      if (!response.ok) { const error = new Error(body.error === 'revision_conflict' ? 'This page changed elsewhere. Reload before saving.' : body.error || 'Layout request failed.'); error.status = response.status; throw error; }
      if (body.layout?.document) body.layout.document = validateLayout(body.layout.document);
      return body.layout;
    };
    try { return await Promise.race([operation(), timeout]); }
    catch (error) {
      // A lost mutation response is not evidence that the server rejected it.
      if (!read && dispatched && (!error.status || error.status >= 500)) {
        error.uncertain = true;
        if (error.code !== 'layout_request_timeout') error.message = 'The save could not be confirmed. Load the shared draft before trying again.';
      }
      throw error;
    } finally { clearTimeout(timer); }
  }
  return { loadDraft: pageKey => request('draft', pageKey), loadPublished: pageKey => request('published', pageKey), saveDraft: (pageKey, document, expectedRevision) => request('save', pageKey, { document: validateLayout(document), expectedRevision }), publish: (pageKey, expectedRevision) => request('publish', pageKey, { expectedRevision }) };
}
