import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../api-lib/pageLayouts.js';
import { requireAdmin } from '../../api-lib/requireAdmin.js';
import { getSupabaseAdmin } from '../../api-lib/supabaseAdmin.js';
import { mockReq, mockRes } from '../helpers/http.js';
import { createLayout } from '../../src/lib/layout/model.js';
vi.mock('../../api-lib/requireAdmin.js', () => ({ requireAdmin: vi.fn() }));
vi.mock('../../api-lib/supabaseAdmin.js', () => ({ getSupabaseAdmin: vi.fn() }));
const db = { from: vi.fn(), rpc: vi.fn() };
async function call(options) { const res = mockRes(); await handler(mockReq(options), res); return res; }
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('RTG_LAYOUT_EDITOR_ENABLED', 'true'); vi.stubEnv('RTG_LAYOUT_EDITOR_ADMIN_IDS', 'approved-admin'); requireAdmin.mockResolvedValue({ ok: true, user: { id: 'approved-admin' }, supabaseAdmin: db }); getSupabaseAdmin.mockReturnValue(db); });
describe('page layout security and revision boundary', () => {
 it('is fail-closed when not explicitly enabled', async () => { vi.stubEnv('RTG_LAYOUT_EDITOR_ENABLED', ''); const res = await call({ body: { pageKey: 'ridge', action: 'save' } }); expect(res.statusCode).toBe(503); expect(requireAdmin).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled(); });
 it.each([[401,'missing_token'],[403,'not_admin']])('rejects unauthorized caller %s before reading drafts', async (status,error) => { requireAdmin.mockResolvedValue({ ok:false,status,error }); const res = await call({ method:'GET',query:{pageKey:'ridge',action:'draft'} }); expect(res.statusCode).toBe(status); expect(db.from).not.toHaveBeenCalled(); });
 it('rejects bootstrap admin not on reviewed deployment allowlist', async () => { requireAdmin.mockResolvedValue({ok:true,user:{id:'self-claimed'},supabaseAdmin:db}); expect((await call({body:{pageKey:'ridge',action:'save'}})).statusCode).toBe(403); expect(db.rpc).not.toHaveBeenCalled(); });
 it('public requests only query the published table and safe projection', async () => { const chain = { select:vi.fn().mockReturnThis(), eq:vi.fn().mockReturnThis(), maybeSingle:vi.fn().mockResolvedValue({data:null}) }; db.from.mockReturnValue(chain); const res=await call({method:'GET',query:{pageKey:'ridge',action:'published',table:'page_layout_drafts'}}); expect(res.statusCode).toBe(404); expect(db.from).toHaveBeenCalledWith('page_layout_published'); expect(chain.select).toHaveBeenCalledWith('page_key,document,revision,published_at'); expect(requireAdmin).not.toHaveBeenCalled(); expect(res.headers['cache-control']).toBe('no-store'); });
 it('rejects malformed documents before RPC', async () => { expect((await call({body:{pageKey:'ridge',action:'save',expectedRevision:0,document:{schema:3}}})).statusCode).toBe(400); expect(db.rpc).not.toHaveBeenCalled(); });
 it('saves with verified actor, sanitized document and expected revision', async () => { db.rpc.mockResolvedValue({data:{revision:1}}); const document=createLayout('Ridge'); const res=await call({body:{pageKey:'ridge',action:'save',expectedRevision:0,document,actor:'attacker'}}); expect(res.statusCode).toBe(200); expect(db.rpc).toHaveBeenCalledWith('rtg_write_page_layout',expect.objectContaining({p_actor:'approved-admin',p_expected_revision:0,p_document:document,p_publish:false})); });
 it('publishes the stored revision, never caller-supplied document', async () => { db.rpc.mockResolvedValue({data:{revision:2}}); await call({body:{pageKey:'ridge',action:'publish',expectedRevision:2,document:{malicious:true}}}); expect(db.rpc).toHaveBeenCalledWith('rtg_write_page_layout',expect.objectContaining({p_document:null,p_publish:true,p_expected_revision:2})); });
 it('returns a conflict for stale revision, no fabricated success', async () => { db.rpc.mockResolvedValue({error:{message:'revision_conflict'}}); expect((await call({body:{pageKey:'ridge',action:'publish',expectedRevision:1}})).statusCode).toBe(409); });
 it('returns failure without leaking database errors', async () => { db.rpc.mockResolvedValue({error:{message:'secret schema details'}}); const res=await call({body:{pageKey:'ridge',action:'publish',expectedRevision:1}}); expect(res.statusCode).toBe(503); expect(JSON.stringify(res.body)).not.toContain('secret'); });
});


it('sitewide drafts reject publication and public reads without querying data',async()=>{
 for(const options of [{body:{pageKey:'site/home',action:'publish',expectedRevision:1}},{method:'GET',query:{pageKey:'site/home',action:'published'}}])expect((await call(options)).statusCode).toBe(400);
 expect(db.from).not.toHaveBeenCalled();expect(db.rpc).not.toHaveBeenCalled();
});
it('sitewide envelopes bind to page keys and reuse verified owner authorization',async()=>{
 const {wrapDraft,emptyDraft}=await import('../../src/lib/siteEditor/schema.js');const document=wrapDraft(emptyDraft('/community'));db.rpc.mockResolvedValue({data:{revision:1}});
 expect((await call({body:{pageKey:'site/home',action:'save',expectedRevision:0,document}})).statusCode).toBe(400);
 expect((await call({body:{pageKey:'site/community',action:'save',expectedRevision:0,document}})).statusCode).toBe(200);
 expect(db.rpc).toHaveBeenCalledWith('rtg_write_site_draft',{p_page_key:'site/community',p_expected_revision:0,p_document:document,p_actor:'approved-admin'});
});
it.each([
 ['site/volunteer','/volunteer',{text:{'text.volunteer.applications.open':'true'}}],
 ['site/volunteer','/volunteer',{text:{'text.volunteer.roles.payment':'Guaranteed stipend'}}],
 ['site/volunteer','/volunteer',{text:{'role.record.title':'changed'}}],
 ['site/about','/about',{text:{'text.about.motion.members':'9000'}}],
 ['site/home','/',{sections:{navigation:{desktop:{headingSize:70}}}}],
 ['site/home','/',{sections:{join:{desktop:{headingSize:70}}}}],
 ['site/home','/',{text:{'rider.result':'999'}}],
 ['site/community/11111111-1111-4111-8111-111111111111','/community/11111111-1111-4111-8111-111111111111',{text:{'group.contact_person':'changed'}}],
])('rejects forbidden record/chrome fields server-side for %s',async(pageKey,page,overrides)=>{
 const {wrapDraft,emptyDraft}=await import('../../src/lib/siteEditor/schema.js');const document=wrapDraft(emptyDraft(page));Object.assign(document.sections[0].content,overrides);
 expect((await call({body:{pageKey,action:'save',expectedRevision:0,document}})).statusCode).toBe(400);expect(db.rpc).not.toHaveBeenCalled();
});
it.each(['/about','/volunteer'])('saves approved per-page copy through the same RPC for %s',async page=>{
 const {wrapDraft,emptyDraft}=await import('../../src/lib/siteEditor/schema.js');const document=wrapDraft({...emptyDraft(page),text:{[page==='/about'?'text.about.hero.title':'text.volunteer.hero.titleAccent']:'Review'}});db.rpc.mockResolvedValue({data:{revision:1}});
 expect((await call({body:{pageKey:'site'+page,action:'save',expectedRevision:0,document}})).statusCode).toBe(200);expect(db.rpc).toHaveBeenCalledWith('rtg_write_site_draft',expect.objectContaining({p_actor:'approved-admin',p_document:document}));
});
it.each(['/about','/volunteer'])('preserves owner allowlist for %s',async page=>{
 requireAdmin.mockResolvedValue({ok:true,user:{id:'unapproved-admin'},supabaseAdmin:db});expect((await call({body:{pageKey:'site'+page,action:'save',expectedRevision:0}})).statusCode).toBe(403);expect(db.rpc).not.toHaveBeenCalled();
});
