import { beforeAll, afterAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import { emptyDraft, wrapDraft } from '../../src/lib/siteEditor/schema.js';
let db;const actor='11111111-1111-4111-8111-111111111111';
beforeAll(async()=>{db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role;');await db.exec(fs.readFileSync('docs/proposals/page-layouts.sql','utf8'));await db.exec(fs.readFileSync('docs/proposals/site-visual-drafts.sql','utf8'));});
afterAll(async()=>{await db?.close();});
const save=(rev,doc,who=actor)=>db.query('select public.rtg_write_site_draft($1,$2,$3::jsonb,$4::uuid) as saved',['site/home',rev,JSON.stringify(wrapDraft(doc)),who]);
it('atomically saves, idempotently returns identical retry and rejects stale different data',async()=>{
 const draft=emptyDraft('/');const first=await save(0,draft);expect(first.rows[0].saved.revision).toBe(1);
 expect((await save(0,draft)).rows[0].saved.revision).toBe(1);
 await expect(save(0,{...draft,sections:{hero:{desktop:{headingSize:55}}}})).rejects.toThrow();
 expect((await db.query('select count(*)::int as n from page_layout_revisions')).rows[0].n).toBe(1);
 expect((await db.query('select count(*)::int as n from page_layout_published')).rows[0].n).toBe(0);
});
it('does not grant browser roles execution and preserves Ridge RPC',async()=>{
 const {rows}=await db.query("select has_function_privilege('anon','public.rtg_write_site_draft(text,bigint,jsonb,uuid)','execute') as anon,has_function_privilege('authenticated','public.rtg_write_site_draft(text,bigint,jsonb,uuid)','execute') as authenticated,to_regprocedure('public.rtg_write_page_layout(text,bigint,jsonb,uuid,boolean)') is not null as ridge");expect(rows[0]).toEqual({anon:false,authenticated:false,ridge:true});
});
it('rejects other actors and intervening revisions when retrying an old save',async()=>{
 const original=emptyDraft('/');await expect(save(0,original,'22222222-2222-4222-8222-222222222222')).rejects.toThrow('revision_conflict');
 const newer={...original,sections:{hero:{desktop:{headingSize:60}}}};expect((await save(1,newer)).rows[0].saved.revision).toBe(2);
 await expect(save(0,original)).rejects.toThrow('revision_conflict');expect((await db.query('select count(*)::int as n from page_layout_revisions')).rows[0].n).toBe(2);
});
it.each(['/about','/volunteer'])('uses the same idempotent RPC without publication for %s',async page=>{
 const document=wrapDraft(emptyDraft(page));const args=['site'+page,0,JSON.stringify(document),actor];const sql='select public.rtg_write_site_draft($1,$2,$3::jsonb,$4::uuid) as saved';
 expect((await db.query(sql,args)).rows[0].saved.revision).toBe(1);expect((await db.query(sql,args)).rows[0].saved.revision).toBe(1);
 expect((await db.query('select count(*)::int as n from page_layout_revisions where page_key=$1',['site'+page])).rows[0].n).toBe(1);
 expect((await db.query('select count(*)::int as n from page_layout_published')).rows[0].n).toBe(0);
});
