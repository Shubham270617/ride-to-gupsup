import * as content from '../../lib/publicData';
import { heroSlides } from '../../data/content';

const group = (id, label, fields, key, resolve) => ({ id, label, fields: fields.map(f => ({ ...f, key: key(f.field) })), resolve });
export const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero slideshow', fields: [], resolve: content.buildHeroCopy },
  group('why', 'Why RTG', content.HOME_WHY_FIELDS, content.homeWhyKey, content.buildHomeWhyCopy),
  group('ways', 'Ways to Move', content.HOME_WAYS_FIELDS, content.homeWaysKey, content.buildHomeWaysCopy),
  { id: 'training', label: 'Training Formats', fields: [], resolve: () => ({}) },
  group('events', 'Upcoming Events', content.HOME_EVENTS_FIELDS, content.homeEventsKey, content.buildHomeEventsCopy),
  group('merch', 'Merchandise', content.HOME_MERCH_FIELDS, content.homeMerchKey, content.buildHomeMerchCopy),
  group('gallery', 'Community Gallery', content.HOME_GALLERY_FIELDS, content.homeGalleryKey, content.buildHomeGalleryCopy),
  group('voices', 'Community Voices', content.HOME_VOICES_FIELDS, content.homeVoicesKey, content.buildHomeVoicesCopy),
  { id: 'join', label: 'Join band and shared footer', fields: [], readOnly: true, resolve: () => ({}) },
  { id: 'navigation', label: 'Shared navigation', fields: [], readOnly: true, resolve: () => ({}) },
];
export const HERO_SLIDES = heroSlides;
export function sectionFields(section, slide = 0) {
  if (section.id !== 'hero') return section.fields;
  return [...content.HERO_SLIDE_FIELDS.filter(f => f.field !== 'cardMetrics').map(f => ({ ...f, key: content.heroSlideKey(heroSlides[slide], f.field) })), ...content.HERO_COPY_FIELDS.map(f=>({...f,key:content.heroCopyKey(f.field)}))];
}
export function sectionValues(section, settings, slide = 0) {
  if (section.id !== 'hero') return section.resolve(settings);
  const current = content.buildHeroSlides(settings)[slide];
  return {...content.heroSlideDefaults(current),...content.buildHeroCopy(settings)};
}
// All current public page patterns; unsupported entries explain coverage, never show a substitute template.
export const PAGE_REGISTRY = [
  ['/', 'Home'], ['/about','About'], ['/community','Community'], ['/community/:communityId','Community detail'],
  ['/volunteer','Volunteer'], ['/weekly-rides','Weekly rides'], ['/weekly-rides/:slug','Weekly session'], ['/events','Events'], ['/events/:slug','Event detail'],
  ['/merchandise','Merchandise'], ['/merchandise/:id','Product detail'], ['/checkout','Checkout'], ['/order-confirmation/:orderId','Order confirmation'],
  ['/challenges','Challenges'], ['/calendar','Calendar'], ['/race-results','Race results'], ['/lab','Lab'], ['/lab/ridge','Ridge'],
  ['/membership','Membership'], ['/membership/checkout','Membership checkout'], ['/safety','Safety'], ['/dashboard','Dashboard'], ['/blog','Blog'],
  ['/sponsors','Sponsors'], ['/gallery','Gallery'], ['/contact','Contact'], ['/chat','Chat'], ['/faq','FAQ'], ['/privacy','Privacy'], ['/terms','Terms'], ['/community-guidelines','Community guidelines'],
].map(([path,label]) => ({ path, label, coverage: path === '/' ? 'Local section editing' : 'Not connected in this slice' }));
export const STYLE_BOUNDS = { headingSize: [16,160], bodySize: [10,32], padding: [0,160], textX: [-120,120], textY: [-120,120], letterSpacing: [-2,12], lineHeight: [0.8,2.5], buttonSize: [10,32], buttonRadius: [0,60], imageX: [0,100], imageY: [0,100], motionDuration: [0.1,3], motionDistance: [0,100] };
const allowedText = new Set(HOME_SECTIONS.flatMap(s => s.id === 'hero' ? heroSlides.flatMap((_,i) => sectionFields(s,i).map(f=>f.key)) : s.fields.map(f=>f.key)));
export const EMPTY_DRAFT = { schema: 'home-visual-v1', page: '/', text: {}, images: {}, sections: {} };
export function validateDraft(value) {
  if (!value || value.schema !== EMPTY_DRAFT.schema || value.page !== '/' || JSON.stringify(value).length > 100000) throw new Error('Unsupported Home draft.');
  const next = structuredClone(EMPTY_DRAFT);
  for (const [key,text] of Object.entries(value.text || {})) {
    if (!allowedText.has(key) || typeof text !== 'string' || text.length > 2000) throw new Error('Invalid text override.');
    if (/Link$/.test(key) && !(/^(\/(?!\/)|#[a-zA-Z0-9_-]|https:\/\/)/.test(text))) throw new Error('Use a site path, section anchor or HTTPS button link.');
    next.text[key] = text;
  }
  for (const [key,url] of Object.entries(value.images || {})) {
    if (!heroSlides.some(s=>s.imageKey===key) || typeof url !== 'string' || !/^https:\/\//.test(url) || url.length > 2000) throw new Error('Use an HTTPS image URL.');
    next.images[key] = url;
  }
  for (const [id,devices] of Object.entries(value.sections || {})) {
    if (!HOME_SECTIONS.some(s=>s.id===id && !s.readOnly)) throw new Error('This section is read-only.');
    next.sections[id] = {};
    for (const [device,style] of Object.entries(devices)) {
      if (!['desktop','mobile'].includes(device)) throw new Error('Invalid viewport.');
      next.sections[id][device] = {};
      for (const [key,val] of Object.entries(style)) {
        if (STYLE_BOUNDS[key]) { const [min,max]=STYLE_BOUNDS[key]; if (typeof val !== 'number' || !Number.isFinite(val) || val<min || val>max) throw new Error(`${key} must be between ${min} and ${max}.`); }
        else if (key === 'font') { if (!['native','sans-serif','serif','monospace'].includes(val)) throw new Error('Invalid font.'); }
        else if (key === 'align') { if (!['left','center','right'].includes(val)) throw new Error('Invalid alignment.'); }
        else if (key === 'buttonStyle') { if (!['solid','outline','plain'].includes(val)) throw new Error('Invalid button style.'); }
        else if (key === 'background') { if (!/^#[0-9a-f]{6}$/i.test(val)) throw new Error('Invalid background.'); }
        else throw new Error('Unsupported style.');
        next.sections[id][device][key] = val;
      }
    }
  }
  return next;
}
export function resolvedStyle(draft,id,device) { return { ...draft.sections[id]?.desktop, ...(device==='mobile' ? draft.sections[id]?.mobile : {}) }; }
