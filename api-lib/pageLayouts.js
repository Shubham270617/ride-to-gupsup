import { requireAdmin } from './requireAdmin.js';
import { getSupabaseAdmin } from './supabaseAdmin.js';
import { validateEnvelope, unwrapDraft, pageKeyFor } from '../src/lib/siteEditor/schema.js';
import { validateLayout } from '../src/lib/layout/model.js';

// Prepared integration. Deliberately disabled until test-project isolation,
// migrations and the existing bootstrap admin-seat policy are reviewed.
export default async function pageLayouts(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.RTG_LAYOUT_EDITOR_ENABLED !== 'true') return res.status(503).json({ error: 'layout_editor_not_enabled' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  const pageKey = req.method === 'GET' ? req.query?.pageKey : req.body?.pageKey;
  if (typeof pageKey !== 'string' || !/^[a-z0-9][a-z0-9/_-]{0,99}$/.test(pageKey)) return res.status(400).json({ error: 'invalid_page_key' });
  const sitewide = pageKey.startsWith('site/');
  const action = req.method === 'GET' ? req.query?.action : req.body?.action;
  try {
    // Public path is hardcoded to the published projection, never drafts/history.
    if (sitewide && ['published','publish'].includes(action)) return res.status(400).json({error:'site_draft_only'});
    if (req.method === 'GET' && action === 'published') {
      const db = getSupabaseAdmin();
      if (!db) return res.status(503).json({ error: 'layout_store_unavailable' });
      const { data, error } = await db.from('page_layout_published').select('page_key,document,revision,published_at').eq('page_key', pageKey).maybeSingle();
      if (error) return res.status(503).json({ error: 'layout_store_unavailable' });
      return data ? res.status(200).json({ layout: data }) : res.status(404).json({ error: 'layout_not_published' });
    }
    const auth = await requireAdmin(req);
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
    // Extra deployment allowlist prevents self-claimed bootstrap seats enabling
    // this new surface. Environment configuration is a separate approval step.
    const allowed = (process.env.RTG_LAYOUT_EDITOR_ADMIN_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!allowed.includes(auth.user.id)) return res.status(403).json({ error: 'layout_editor_not_authorized' });
    if (req.method === 'GET' && action === 'draft') {
      const { data, error } = await auth.supabaseAdmin.from('page_layout_drafts').select('page_key,document,revision,updated_at').eq('page_key', pageKey).maybeSingle();
      if (error) return res.status(503).json({ error: 'layout_store_unavailable' });
      return res.status(200).json({ layout: data || null });
    }
    if (req.method !== 'POST' || !['save', 'publish'].includes(action)) return res.status(400).json({ error: 'invalid_action' });
    const expected = req.body?.expectedRevision;
    if (!Number.isSafeInteger(expected) || expected < 0) return res.status(400).json({ error: 'invalid_revision' });
    let document = null;
    if (action === 'save') {
      if (JSON.stringify(req.body?.document || {}).length > 10000000) return res.status(413).json({ error: 'layout_too_large' });
      try { document = sitewide ? validateEnvelope(req.body?.document) : validateLayout(req.body?.document); if(sitewide&&pageKeyFor(unwrapDraft(document).page)!==pageKey)throw new Error('page mismatch'); } catch { return res.status(400).json({ error: 'invalid_layout' }); }
    }
    const { data, error } = await auth.supabaseAdmin.rpc(sitewide ? 'rtg_write_site_draft' : 'rtg_write_page_layout', { p_page_key: pageKey, p_expected_revision: expected, p_document: document, p_actor: auth.user.id, ...(!sitewide ? {p_publish: action === 'publish'} : {}) });
    if (error?.message?.includes('revision_conflict')) return res.status(409).json({ error: 'revision_conflict' });
    if (error) return res.status(503).json({ error: 'layout_store_unavailable' });
    return res.status(200).json({ layout: data });
  } catch { return res.status(503).json({ error: 'layout_store_unavailable' }); }
}

