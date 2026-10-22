import {expect,it} from 'vitest';
import {sectionsFor,sectionFields,HERO_SLIDES} from '../../../src/admin/site-editor/catalog';
import {PAGE_FIELDS} from '../../../src/lib/siteEditor/manifest';
import {validateDraft,emptyDraft} from '../../../src/lib/siteEditor/schema';
it('keeps server allowlist exactly aligned with visible page mappings',()=>{
 for(const page of ['/','/community','/lab','/about','/volunteer','/community/00000000-0000-0000-0000-000000000000']){
 const sections=sectionsFor(page);const fields=PAGE_FIELDS[page.startsWith('/community/')?'detail':page];
 expect(sections.filter(s=>!s.readOnly).map(s=>s.id)).toEqual(fields.sections);
 expect([...new Set(sections.flatMap(s=>s.id==='hero'?HERO_SLIDES.flatMap((_,i)=>sectionFields(s,i).map(f=>f.key)):s.fields.map(f=>f.key)))]).toEqual(fields.text);
 }
});
it.each(['javascript:alert(1)','//external.test','/\\external.test','https://example.test bad'])('rejects unsafe link %s',link=>expect(()=>validateDraft({...emptyDraft('/community'),text:{'text.community.heroCtaLink':link}})).toThrow());
