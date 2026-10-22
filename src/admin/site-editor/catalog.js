import {ABOUT_SECTIONS,VOLUNTEER_SECTIONS} from '../../lib/siteEditor/pageContent.js';
import { isCommunityDetail } from '../../lib/siteEditor/schema.js';
export { EMPTY_DRAFT, emptyDraft, isCommunityDetail, STYLE_BOUNDS, validateDraft } from '../../lib/siteEditor/schema.js';
import * as content from '../../lib/publicData';
import { LAB_PAGE_TEXT } from '../../data/labContent';
import { buildLabCopy, labPageKey } from '../../lib/labData';
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
export const COMMUNITY_SECTIONS = ['hero','place','way','motion','network','cities'].map(id=>({...group('community-'+id,({hero:'Community hero',place:'Find Your Place',way:'The RTG Way',motion:'RTG in Motion',network:'Community network',cities:'Community cities'})[id],content.COMMUNITY_PAGE_FIELDS.filter(f=>f.group===id),content.communityPageKey,content.buildCommunityPageCopy),imageKey:({hero:'communityHero',way:'communityWay',network:'communityIndiaMap'})[id]}));
export const LAB_SECTIONS = ['hero','labs','principles'].map(id=>group('lab-'+id,({hero:'Lab introduction',labs:'Lab programmes',principles:'Lab principles'})[id],LAB_PAGE_TEXT.filter(f=>f.group===id),labPageKey,s=>buildLabCopy(s)));
export const DETAIL_SECTIONS = ['intro','about','join','activities'].map(id=>({id:'detail-'+id,label:({intro:'Community identity',about:'About this community',join:'Joining information',activities:'Published activities'})[id],fields:[],resolve:()=>({})}));
export function sectionsFor(page='/') { return [...(page==='/about'?ABOUT_SECTIONS:page==='/volunteer'?VOLUNTEER_SECTIONS:isCommunityDetail(page)?DETAIL_SECTIONS:page==='/community'?COMMUNITY_SECTIONS:page==='/lab'?LAB_SECTIONS:HOME_SECTIONS.filter(s=>!s.readOnly)),...HOME_SECTIONS.filter(s=>s.readOnly)]; }
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
].map(([path,label]) => ({ path, label, coverage: path==='/community/:communityId'?'Published group selection · styles only':['/', '/community','/lab','/about','/volunteer'].includes(path) ? 'Local section editing' : 'Not connected in this slice' }));
export function resolvedStyle(draft,id,device) { return { ...draft.sections[id]?.desktop, ...(device==='mobile' ? draft.sections[id]?.mobile : {}) }; }
