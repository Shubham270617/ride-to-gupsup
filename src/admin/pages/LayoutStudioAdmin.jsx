import { useEffect, useRef, useState } from 'react';
import AdminPageHeader from '../components/AdminPageHeader';
import LayoutRenderer from '../../components/layout/LayoutRenderer';
import { cloneLayout, createLayout, createSection, effectiveStyle, LAYOUT_FONTS, LAYOUT_TYPES, loadLocalDraft, moveSection, NUMBER_BOUNDS, saveLocalDraft, updateSectionStyle, validateLayout } from '../../lib/layout/model';

const labels = { size: 'Heading size', bodySize: 'Body size', padding: 'Padding', gap: 'Grid gap', columns: 'Columns', height: 'Section height', shade: 'Image overlay', focalX: 'Image horizontal focus', focalY: 'Image vertical focus' };
export default function LayoutStudioAdmin({ pageKey = 'ridge', initialDocument, sectionData = {}, store = null }) {
  const [document, setDocument] = useState(() => validateLayout(initialDocument || createLayout(pageKey)));
  const [selectedId, select] = useState(document.sections[0].id);
  const [device, setDevice] = useState('desktop');
  const [status, setStatus] = useState('Unsaved local draft');
  const [error, setError] = useState('');
  const [past, setPast] = useState([]);
  const [serverRevision, setServerRevision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [serverDirty, setServerDirty] = useState(true);
  const generation = useRef(0);
  const fileInput = useRef(null);
  useEffect(() => {
    generation.current += 1; setServerRevision(null); setServerDirty(true); setBusy(false);
    try {
      const saved = loadLocalDraft(window.localStorage, pageKey);
      const next = saved || validateLayout(initialDocument || createLayout(pageKey));
      setDocument(next); select(next.sections[0].id); setPast([]); setError('');
      setStatus(saved ? 'Loaded browser-local draft' : 'Unsaved local draft');
    } catch (err) { setError(`Could not load local draft: ${err.message}`); }
    return () => { generation.current += 1; };
  }, [pageKey, initialDocument]);
  useEffect(() => {
    const warn = event => { if (status === 'Unsaved local draft') { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [status]);
  const selected = document.sections.find(s => s.id === selectedId) || document.sections[0];
  const style = effectiveStyle(selected, device);
  const change = next => {
    try { const valid = validateLayout(next); setPast(items => [...items.slice(-24), cloneLayout(document)]); setDocument(valid); setServerDirty(true); setStatus('Unsaved local draft'); setError(''); }
    catch (err) { setError(err.message); }
  };
  const setStyle = (key, value) => { try { change(updateSectionStyle(document, selected.id, device, key, value)); } catch (err) { setError(err.message); } };
  const editContent = (key, value) => { const next = cloneLayout(document); next.sections.find(s => s.id === selected.id).content[key] = value; change(next); };
  const resetMobile = () => { const next = cloneLayout(document); next.sections.find(s => s.id === selected.id).mobile = {}; change(next); };
  const save = () => { try { saveLocalDraft(window.localStorage, pageKey, document); setStatus('Saved in this browser only'); setError(''); } catch (err) { setError(`Draft was not saved: ${err.message}`); } };
  const serverAction = async action => {
    if (!store || busy) return;
    if (action === 'load' && status === 'Unsaved local draft' && !window.confirm('Replace this unsaved draft with the shared draft?')) return;
    const current = generation.current;
    setBusy(true); setError('');
    try {
      const result = action === 'load' ? await store.loadDraft(pageKey) : action === 'save' ? await store.saveDraft(pageKey, document, serverRevision) : await store.publish(pageKey, serverRevision);
      if (current !== generation.current) return;
      if (action === 'load') {
        if (result) { const next = validateLayout(result.document); setDocument(next); select(next.sections[0].id); setPast([]); }
        setServerRevision(result?.revision || 0); setServerDirty(!result); setStatus(result ? 'Loaded shared draft (not published)' : 'No shared draft yet');
      } else { setServerRevision(result.revision); setServerDirty(false); setStatus(action === 'save' ? 'Saved shared draft (not published)' : 'Published saved revision'); }
    } catch (err) { if (current === generation.current) setError(err.message); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const exportJSON = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const a = window.document.createElement('a'); a.href = url; a.download = `${pageKey.replaceAll('/', '-')}-layout.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const importJSON = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    if (file.size > 10000000) { setError('Layout export is too large (maximum 10 MB).'); return; }
    const current = generation.current;
    try { const next = validateLayout(JSON.parse(await file.text())); if (current !== generation.current) return; change(next); select(next.sections[0].id); }
    catch (err) { if (current === generation.current) setError(`Import failed: ${err.message}`); }
  };
  return <div>
    <AdminPageHeader title="Layout Studio" description="Independent desktop and mobile page styling, based on your RTG prototype." />
    <p className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">{store ? 'Shared editing connection configured. Load the shared draft first; Save shared draft does not publish. Publish releases only the saved revision.' : 'Local draft workspace only. Saving here does not update the website. Shared storage, admin permissions and publishing must be connected and verified before release.'}</p>
    <fieldset disabled={busy}><div className="rtg-layout-toolbar">
      <button type="button" onClick={save}>Save local draft</button><button type="button" onClick={exportJSON}>Export JSON</button>
      <button type="button" onClick={() => fileInput.current?.click()}>Import JSON</button><input ref={fileInput} type="file" accept="application/json,.json" onChange={importJSON} hidden aria-label="Import layout file" />
      <button type="button" disabled={!past.length} onClick={() => { const next = past[past.length - 1]; setPast(past.slice(0, -1)); setDocument(next); select(next.sections[0].id); setServerDirty(true); setStatus('Unsaved local draft'); }}>Undo</button>
      <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button><button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button>
      {store && <><button type="button" onClick={() => serverAction('load')}>Load shared draft</button><button type="button" disabled={serverRevision === null} onClick={() => serverAction('save')}>Save shared draft</button><button type="button" disabled={serverRevision === null || serverRevision === 0 || serverDirty} onClick={() => serverAction('publish')}>Publish saved revision</button></>}
    </div>
    <p role="status" className="text-sm mb-4">{status} · {document.name}</p>{error && <p role="alert" className="text-red-700 mb-4">{error}</p>}
    <div className="rtg-layout-editor-grid">
      <div className="rtg-layout-controls glass rounded-xl p-4">
        <label>Page name<input maxLength={80} value={document.name} onChange={e => change({ ...document, name: e.target.value })} /></label>
        <label>Section<select value={selected.id} onChange={e => select(e.target.value)}>{document.sections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={document.sections[0].id === selected.id} onClick={() => change(moveSection(document, selected.id, -1))}>Move up</button><button type="button" disabled={document.sections.at(-1).id === selected.id} onClick={() => change(moveSection(document, selected.id, 1))}>Move down</button>
          <button type="button" disabled={document.sections.length >= 20} onClick={() => { const copy = cloneLayout(selected); copy.id = crypto.randomUUID(); copy.label += ' copy'; change({ ...document, sections: [...document.sections, copy] }); select(copy.id); }}>Duplicate</button>
          <button type="button" disabled={document.sections.length <= 1} onClick={() => { const sections = document.sections.filter(s => s.id !== selected.id); change({ ...document, sections }); select(sections[0].id); }}>Remove section</button></div>
        <label>Add section<select aria-label="Add section" value="" disabled={document.sections.length >= 20} onChange={e => { if (!e.target.value) return; const added = createSection(e.target.value); change({ ...document, sections: [...document.sections, added] }); select(added.id); }}><option value="">Choose type</option>{Object.keys(LAYOUT_TYPES).map(type => <option key={type}>{type}</option>)}</select></label>
        {['eyebrow', 'title', 'body'].map(key => <label key={key}>{key === 'title' ? 'Heading' : key === 'body' ? 'Description' : 'Eyebrow'} (shared)<textarea maxLength={key === 'body' ? 1000 : 160} value={selected.content[key]} onChange={e => editContent(key, e.target.value)} /></label>)}
        <h2 className="font-semibold mt-6">{device === 'mobile' ? 'Mobile overrides' : 'Desktop foundation'}</h2>
        {device === 'mobile' && <><p className="text-xs">Unchanged properties inherit desktop values.</p><button type="button" onClick={resetMobile}>Reset all mobile overrides</button></>}
        <label>Visible<select value={String(style.visible)} onChange={e => setStyle('visible', e.target.value === 'true')}><option value="true">Visible</option><option value="false">Hidden</option></select></label>
        {[['layout', LAYOUT_TYPES[selected.type]], ['font', Object.keys(LAYOUT_FONTS)], ['align', ['left', 'center', 'right']], ['position', ['top', 'middle', 'bottom']]].map(([key, options]) => <label key={key}>{key}<select value={style[key]} onChange={e => setStyle(key, e.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select>{device === 'mobile' && Object.hasOwn(selected.mobile, key) && <button type="button" onClick={() => setStyle(key, undefined)}>Inherit {key}</button>}</label>)}
        {Object.entries(NUMBER_BOUNDS).map(([key, [min, max]]) => <label key={key}>{labels[key]}<input type="number" min={min} max={max} value={style[key]} onChange={e => setStyle(key, Number(e.target.value))} />{device === 'mobile' && Object.hasOwn(selected.mobile, key) && <button type="button" onClick={() => setStyle(key, undefined)}>Inherit {labels[key]}</button>}</label>)}
        {['color', 'background', 'accent'].map(key => <label key={key}>{key}<input type="color" value={style[key]} onChange={e => setStyle(key, e.target.value)} />{device === 'mobile' && Object.hasOwn(selected.mobile, key) && <button type="button" onClick={() => setStyle(key, undefined)}>Inherit {key}</button>}</label>)}
        <label>Image URL (HTTPS)<input aria-label="Image URL (HTTPS)" key={`${selected.id}:${device}:${style.image}`} defaultValue={style.image.startsWith('data:') ? '' : style.image} placeholder="https://…" onBlur={e => { if (e.target.value !== e.target.defaultValue) setStyle('image', e.target.value); }} /></label>
        <p className="text-xs">Prototype JSON image uploads are preserved. New asset uploads need the website storage connection.</p>
        <button type="button" onClick={() => setStyle('image', '')}>Remove image</button>{device === 'mobile' && Object.hasOwn(selected.mobile, 'image') && <button type="button" onClick={() => setStyle('image', undefined)}>Inherit desktop image</button>}
      </div>
      <div><p className="text-xs mb-2">Preview only · {device === 'mobile' ? '390 px' : 'desktop, fits available space'} · Real data appears when the host page supplies it.</p><div className="rtg-layout-editor-preview"><div style={{ width: device === 'mobile' ? 390 : '100%' }}><LayoutRenderer document={document} device={device} selectedId={selected.id} onSelect={select} sectionData={sectionData} /></div></div></div>
    </div></fieldset>
  </div>;
}
