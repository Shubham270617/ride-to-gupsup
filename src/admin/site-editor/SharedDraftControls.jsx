import { useState } from 'react';
export default function SharedDraftControls({store,page,draft,onReplace}){
 const [revision,setRevision]=useState(null);const [candidate,setCandidate]=useState(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('Read shared revision before saving.');const [uncertain,setUncertain]=useState(false);
 if(!store)return <p>Shared drafts unavailable in this local review: existing authenticated client configuration is required.</p>;
 async function read(){setBusy(true);try{const row=await store.loadDraft(page);setRevision(row?.revision||0);setCandidate(row);setUncertain(false);setMessage(row?'Shared revision '+row.revision+' loaded for review. Local edits are kept until you choose Replace.':'No shared draft exists. Your local draft is unchanged.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function save(){const snapshot=structuredClone(draft);setBusy(true);try{const row=await store.saveDraft(page,snapshot,revision);setRevision(row.revision);setMessage('Saved shared revision '+row.revision+' (not published). Later local edits are preserved.');}catch(e){setMessage(e.message);if(e.uncertain)setUncertain(true);if(e.status===409)setRevision(null);}finally{setBusy(false);}}
 return <fieldset><legend>Owner-only shared draft · no publishing</legend><p role="status">{message}</p><button disabled={busy} onClick={read}>Check shared draft</button><button disabled={busy||revision===null||uncertain||Boolean(candidate)} onClick={save}>Save shared draft</button>
 {candidate&&<div role="group" aria-label="Review shared draft"><p>Revision {candidate.revision} is available. Replace local edits, or keep them as the basis for an explicit save?</p><button onClick={()=>{onReplace(candidate.document);setCandidate(null);}}>Replace with shared draft</button><button onClick={()=>setCandidate(null)}>Keep local edits</button></div>}
 </fieldset>;
}
