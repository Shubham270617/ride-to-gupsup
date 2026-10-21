import { useEffect, useRef, useState } from 'react';
import { EMPTY_DRAFT, HOME_SECTIONS, HERO_SLIDES, PAGE_REGISTRY, STYLE_BOUNDS, resolvedStyle, sectionFields, sectionValues, validateDraft } from './catalog';
import './editor.css';
const STORAGE = 'rtg:site-editor:home:local:v1';
export default function SiteEditor({ canvasUrl = '/site-canvas-local.html' }) {
  const [draft,setDraft]=useState(()=>structuredClone(EMPTY_DRAFT));
  const [past,setPast]=useState([]); const [selected,setSelected]=useState(null); const [page,setPage]=useState('/');
  const [device,setDevice]=useState('desktop'); const [slide,setSlide]=useState(0); const [ready,setReady]=useState(0);
  const [sources,setSources]=useState({settings:{},images:{}}); const [sourceStatus,setSourceStatus]=useState({}); const [status,setStatus]=useState('No draft changes.'); const [error,setError]=useState('');
  const [dirty,setDirty]=useState(false); const [confirmLoad,setConfirmLoad]=useState(false); const frame=useRef(null);
  useEffect(()=>{
    const receive=e=>{
      if(e.origin!==window.location.origin || e.source!==frame.current?.contentWindow || e.data?.channel!=='rtg-local-canvas') return;
      if(e.data.type==='ready') setReady(n=>n+1);
      if(e.data.type==='source-status') setSourceStatus(e.data.status || {});
      if(e.data.type==='select' && HOME_SECTIONS.some(s=>s.id===e.data.id)) setSelected(e.data.id);
      if(e.data.type==='sources') setSources({settings:e.data.settings||{},images:e.data.images||{}});
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[]);
  useEffect(()=>{if(ready)frame.current?.contentWindow.postMessage({channel:'rtg-local-editor',draft,selected,device,slide},window.location.origin);},[draft,selected,device,slide,ready]);
  useEffect(()=>{const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  const change=next=>{try{const valid=validateDraft(next);setPast(p=>[...p.slice(-29),draft]);setDraft(valid);setDirty(true);setStatus('Unsaved local changes');setError('');}catch(e){setError(e.message);}};
  const edit=(kind,key,value)=>change({...draft,[kind]:{...draft[kind],[key]:value}});
  const styleEdit=(key,value)=>{const next=structuredClone(draft);next.sections[selected]||={};next.sections[selected][device]||={};if(value===undefined)delete next.sections[selected][device][key];else next.sections[selected][device][key]=value;change(next);};
  const load=()=>{try{const raw=localStorage.getItem(STORAGE);if(!raw){setStatus('No Home local draft saved.');return;}const valid=validateDraft(JSON.parse(raw));setDraft(valid);setPast([]);setDirty(false);setConfirmLoad(false);setStatus('Loaded local Home draft.');setError('');}catch(e){setError(`Draft kept: ${e.message}`);}};
  const section=HOME_SECTIONS.find(s=>s.id===selected); const values=section?sectionValues(section,{...sources.settings,...draft.text},slide):{};
  const style=selected?resolvedStyle(draft,selected,device):{};
  return <div className="cms-editor">
    <header><h1>Site visual editor · local drafts</h1><p>Actual Home components. Existing site configuration supplies published content; source status below identifies any fallbacks. Cards, metrics and shared chrome are read-only. No shared save or publishing.</p>
      <details><summary>Content source status</summary>{Object.keys(sourceStatus).length ? <ul>{Object.entries(sourceStatus).map(([key,value])=><li key={key}>{key}: {value}</li>)}</ul> : <p>Waiting for the protected canvas. If it shows sign-in, use your existing admin session; no content is verified yet.</p>}</details><div className="cms-toolbar"><label>Website page<select value={page} onChange={e=>setPage(e.target.value)}>{PAGE_REGISTRY.map(p=><option key={p.path} value={p.path}>{p.label} — {p.coverage}</option>)}</select></label>
        <button aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}>Desktop</button><button aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}>Mobile</button>
        <button disabled={!past.length} onClick={()=>{setDraft(past.at(-1));setPast(past.slice(0,-1));setDirty(true);setStatus('Unsaved local changes');}}>Undo</button>
        <button onClick={()=>{try{localStorage.setItem(STORAGE,JSON.stringify(validateDraft(draft)));setDirty(false);setStatus('Saved locally in this browser only.');}catch(e){setError(e.message);}}}>Save Home locally</button>
        <button onClick={()=>dirty?setConfirmLoad(true):load()}>Load Home local draft</button>
      </div><p role="status">{status}</p>{error&&<p role="alert">{error}</p>}
      {confirmLoad&&<div role="group" aria-label="Replace local edits"><p>Replace unsaved Home edits with the saved local draft?</p><button onClick={load}>Replace edits</button><button onClick={()=>setConfirmLoad(false)}>Keep editing</button></div>}
    </header>
    <div className="cms-workspace" hidden={page!=='/'}>
      <div className="cms-canvas-scroll" role="region" aria-label="Home page canvas" tabIndex={0}>
        <iframe ref={frame} title="Actual Home page canvas" src={canvasUrl} style={{width:device==='mobile'?390:'100%'}} />
      </div>
      <aside aria-label="Section inspector" className="cms-inspector" tabIndex={0}>
        {!section?<p>Click a section anywhere on the page to open its controls. The canvas scrolls independently.</p>:<><h2>{section.label}</h2>
          {section.readOnly?<p>Shared site element: preview only in this slice. No global changes are made.</p>:<>
            <p>Editing {device} styles. Copy and photos are shared across viewports. Resource records and computed numbers are not editable here.</p>
            {selected==='hero'&&<label>Hero slide<select value={slide} onChange={e=>setSlide(Number(e.target.value))}>{HERO_SLIDES.map((s,i)=><option key={s.key} value={i}>{s.key}</option>)}</select></label>}
            {sectionFields(section,slide).map(f=><label key={f.key}>{f.label}{/Link$/.test(f.field)?<input key={f.key+":"+(draft.text[f.key]??values[f.field])} aria-label={f.label} defaultValue={draft.text[f.key]??values[f.field]??''} onBlur={e=>{try{validateDraft({...draft,text:{...draft.text,[f.key]:e.target.value}});if(e.target.value!==e.target.defaultValue)edit('text',f.key,e.target.value);}catch(err){setError(err.message);e.target.value=e.target.defaultValue;}}}/>:<textarea value={draft.text[f.key]??values[f.field]??''} maxLength={2000} onChange={e=>edit('text',f.key,e.target.value)} />}</label>)}
            {selected==='hero'&&<label>Hero photo URL (HTTPS)<input key={`${slide}:${draft.images[HERO_SLIDES[slide].imageKey]||''}`} defaultValue={draft.images[HERO_SLIDES[slide].imageKey]??sources.images[HERO_SLIDES[slide].imageKey]??''} onBlur={e=>{if(e.target.value!==e.target.defaultValue)edit('images',HERO_SLIDES[slide].imageKey,e.target.value);}} /></label>}
            {!section.fields.length&&selected!=='hero'&&<p>This section’s cards are read-only; section styling is supported.</p>}
            <h3>{device==='mobile'?'Mobile overrides':'Desktop foundation'}</h3>
            {Object.entries(STYLE_BOUNDS).filter(([key])=>(selected==='hero'||! /^(motion|image)/.test(key))&&(!['ways','voices'].includes(selected)||!key.startsWith('button'))).map(([key,[min,max]])=><label key={key}>{key}<input aria-label={`${key} slider`} type="range" min={min} max={max} step={key==='lineHeight'||key==='motionDuration'?0.05:1} value={style[key]??Math.max(min,Math.min(max,({headingSize:48,bodySize:16,padding:0,lineHeight:1.1,buttonSize:14,buttonRadius:24,imageX:50,imageY:50,motionDuration:0.65,motionDistance:28}[key]??0)))} onChange={e=>styleEdit(key,Number(e.target.value))} /><input aria-label={key} key={`${selected}:${device}:${style[key]}`} type="number" step={key==='lineHeight'||key==='motionDuration'?0.05:1} min={min} max={max} placeholder="Native design" defaultValue={style[key]??''} onBlur={e=>{const raw=e.target.value;if(raw===''){styleEdit(key,undefined);return;}const value=Number(raw);if(!Number.isFinite(value)||value<min||value>max){setError(`${key}: enter ${min}–${max}. Previous value kept.`);e.target.value=style[key]??'';return;}if(value!==style[key])styleEdit(key,value);}} />{Object.hasOwn(draft.sections[selected]?.[device]||{},key)&&<button onClick={()=>styleEdit(key,undefined)}>Reset {key}</button>}</label>)}
            <p>Position moves headings and paragraphs in pixels. Sliders create an override only when moved; Reset restores native styling or mobile inheritance.</p>
            <label>Text alignment<select value={style.align||'native'} onChange={e=>styleEdit('align',e.target.value==='native'?undefined:e.target.value)}>{['native','left','center','right'].map(v=><option key={v}>{v}</option>)}</select></label>
            {!['ways','voices'].includes(selected)&&<label>Primary CTA appearance<select value={style.buttonStyle||'native'} onChange={e=>styleEdit('buttonStyle',e.target.value==='native'?undefined:e.target.value)}>{['native','solid','outline','plain'].map(v=><option key={v}>{v}</option>)}</select></label>}
            {selected==='hero'&&<p>motionDuration (seconds) and motionDistance (pixels) replay the native hero text entrance. Image controls set photo focal position. The Join button keeps its native action.</p>}
            <label>Font<select value={style.font||'native'} onChange={e=>styleEdit('font',e.target.value==='native'?undefined:e.target.value)}>{['native','sans-serif','serif','monospace'].map(f=><option key={f}>{f}</option>)}</select></label>
            <details><summary>Explicit section background override</summary><p>Untouched by default. Does not replace the shared site artwork or a section’s existing photo/overlay.</p><label>Background colour<input type="color" value={style.background||'#ffffff'} onChange={e=>styleEdit('background',e.target.value)} /></label><button onClick={()=>styleEdit('background',undefined)}>Use original background</button></details>
          </>}
        </>}
      </aside>
    </div>
    {page!=='/'&&<p role="note">{PAGE_REGISTRY.find(p=>p.path===page)?.label}: native canvas and inspector are not connected yet. Your Home edits remain in memory. No substitute template is shown.</p>}
  </div>;
}
