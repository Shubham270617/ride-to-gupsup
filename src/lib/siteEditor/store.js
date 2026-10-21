import { createLayoutStore } from '../layout/store.js';
import { pageKeyFor, wrapDraft, unwrapDraft, validateEnvelope } from './schema.js';
export function createSiteDraftStore(options){
 const transport=createLayoutStore({...options,validateDocument:validateEnvelope});
 const decode=(record,page)=>{if(!record)return null;if(!Number.isSafeInteger(record.revision)||record.revision<1)throw new Error('Invalid shared revision.');const document=unwrapDraft(record.document);if(document.page!==page)throw new Error('Response belongs to another page.');return {...record,document};};
 return {loadDraft:async page=>decode(await transport.loadDraft(pageKeyFor(page)),page),saveDraft:async(page,document,revision)=>{if(document.page!==page)throw new Error('Draft belongs to another page.');const record=await transport.saveDraft(pageKeyFor(page),wrapDraft(document),revision);try{if(!record)throw new Error('Missing save receipt.');return decode(record,page);}catch(error){error.uncertain=true;error.message='The save could not be confirmed. Check the shared draft before trying again.';throw error;}}};
}
