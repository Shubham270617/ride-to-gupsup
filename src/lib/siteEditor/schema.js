import { PAGE_FIELDS, STYLE_BOUNDS } from './manifest.js';
export { STYLE_BOUNDS } from './manifest.js';
export const isCommunityDetail = page => /^\/community\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(page);
export const EMPTY_DRAFT = {schema:'home-visual-v1',page:'/',text:{},images:{},sections:{}};
export const emptyDraft = (page='/')=>({...structuredClone(EMPTY_DRAFT),page});
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeLink=v=>typeof v==='string'&&!/[\s\\]/.test(v)&&(/^\/(?!\/)/.test(v)||/^#[a-zA-Z0-9_-]+$/.test(v)||(()=>{try{return new URL(v).protocol==='https:';}catch{return false;}})());
export function pageKeyFor(page){if(!['/','/community','/lab','/about','/volunteer'].includes(page)&&!isCommunityDetail(page))throw new Error('Unsupported page.');return 'site/'+(page==='/'?'home':page.slice(1));}
export function validateDraft(value){
 if(!record(value)||value.schema!==EMPTY_DRAFT.schema||JSON.stringify(value).length>100000)throw new Error('Unsupported visual draft.');
 pageKeyFor(value.page);const fields=PAGE_FIELDS[isCommunityDetail(value.page)?'detail':value.page];const next=emptyDraft(value.page);
 for(const type of ['text','images','sections'])if(!record(value[type]))throw new Error('Invalid draft structure.');
 for(const [key,text] of Object.entries(value.text)){
  if(!fields.text.includes(key)||typeof text!=='string'||text.length>2000)throw new Error('Invalid text override.');
  if(/Link$/.test(key)&&!safeLink(text))throw new Error('Use a site path, section anchor or HTTPS button link.');next.text[key]=text;
 }
 for(const [key,url] of Object.entries(value.images)){if(!fields.images.includes(key)||typeof url!=='string'||url.length>2000||!url.startsWith('https://')||!safeLink(url))throw new Error('Use an HTTPS image URL.');next.images[key]=url;}
 for(const [id,devices] of Object.entries(value.sections)){
  if(!fields.sections.includes(id)||!record(devices))throw new Error('This section is read-only.');next.sections[id]={};
  for(const [device,style] of Object.entries(devices)){
   if(!['desktop','mobile'].includes(device)||!record(style))throw new Error('Invalid viewport.');next.sections[id][device]={};
   for(const [key,val] of Object.entries(style)){
    if(Object.hasOwn(STYLE_BOUNDS,key)){const [min,max]=STYLE_BOUNDS[key];if(typeof val!=='number'||!Number.isFinite(val)||val<min||val>max)throw new Error(`${key} must be between ${min} and ${max}.`);}
    else if(key==='font'){if(!['native','sans-serif','serif','monospace'].includes(val))throw new Error('Invalid font.');}
    else if(key==='align'){if(!['left','center','right'].includes(val))throw new Error('Invalid alignment.');}
    else if(key==='buttonStyle'){if(!['solid','outline','plain'].includes(val))throw new Error('Invalid button style.');}
    else if(key==='background'){if(typeof val!=='string'||!/^#[0-9a-f]{6}$/i.test(val))throw new Error('Invalid background.');}
    else throw new Error('Unsupported style.');next.sections[id][device][key]=val;
   }
  }
 }return next;
}
export function wrapDraft(document){return {schema:1,name:'Site visual draft',sections:[{id:'native-page',type:'native-page',content:validateDraft(document)}]};}
export function unwrapDraft(envelope){if(!record(envelope)||envelope.schema!==1||envelope.name!=='Site visual draft'||!Array.isArray(envelope.sections)||envelope.sections.length!==1||envelope.sections[0]?.id!=='native-page'||envelope.sections[0]?.type!=='native-page')throw new Error('Invalid site draft envelope.');return validateDraft(envelope.sections[0].content);}
export function validateEnvelope(envelope){return wrapDraft(unwrapDraft(envelope));}
