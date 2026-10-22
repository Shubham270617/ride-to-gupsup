import About from '../../pages/About';
import Volunteer from '../../pages/ConnectedVolunteer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CommunityDetail from '../../pages/CommunityDetail';
import Community from '../../pages/Community';
import Lab from '../../pages/Lab';
import Footer from '../../components/Footer';
import Home from '../../pages/Home';
import Navbar from '../../components/Navbar';
import JoinCTA from '../../components/sections/JoinCTA';
import SiteBackground from '../../components/ui/SiteBackground';
import { CartPreviewProvider } from '../../lib/CartContext';
import { useSiteSettings, useSiteImages } from '../../lib/publicData';
import { sectionsFor, emptyDraft, isCommunityDetail, resolvedStyle, validateDraft } from './catalog';
import './canvas.css';
import { PublicDataStatusContext } from '../../lib/publicDataStatus';
import { applyAppearance } from '../../lib/appearance';

export default function HomeCanvas() {
  const [status, setStatus] = useState({});
  const report = useCallback((key,value)=>setStatus(previous=>previous[key]===value ? previous : {...previous,[key]:value}),[]);
  useEffect(()=>{window.parent.postMessage({channel:'rtg-local-canvas',type:'source-status',status},window.location.origin);},[status]);
  return <PublicDataStatusContext.Provider value={report}><HomeCanvasContent /></PublicDataStatusContext.Provider>;
}
function HomeCanvasContent() {
  const requestedPage = new URLSearchParams(window.location.search).get('page')||'/';
  const pagePath=(['/','/community','/lab','/about','/volunteer'].includes(requestedPage)||isCommunityDetail(requestedPage))?requestedPage:'/';
  const sections=useMemo(()=>sectionsFor(pagePath),[pagePath]);
  const [state,setState] = useState({ draft: emptyDraft(pagePath), selected: null, device: 'desktop', slide: 0 });
  const settings = useSiteSettings(); const images = useSiteImages();
  useEffect(()=>{if(Object.keys(settings).length) applyAppearance(settings);},[settings]);
  const send = data => window.parent.postMessage({ channel: 'rtg-local-canvas', ...data }, window.location.origin);
  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.channel !== 'rtg-local-editor') return;
      try {
        const { draft, selected, device, slide } = event.data;
        if(draft?.page!==pagePath)return;
        if (!['desktop','mobile'].includes(device) || !Number.isInteger(slide) || slide < 0 || slide > 3) return;
        setState({ draft: validateDraft(draft), selected: sections.some(s=>s.id===selected) ? selected : null, device, slide });
      } catch { /* Reject malformed messages without touching the current canvas. */ }
    };
    window.addEventListener('message',receive); send({ type: 'ready' });
    return () => window.removeEventListener('message',receive);
  }, [pagePath,sections]);
  const imageSnapshot = JSON.stringify(images);
  useEffect(() => { send({ type: 'sources', settings, images: JSON.parse(imageSnapshot) }); }, [settings, imageSnapshot]);
  function section(id,children) {
    const meta = sections.find(s=>s.id===id); const style=resolvedStyle(state.draft,id,state.device);
    const variables = { '--cms-heading': style.headingSize ? `${style.headingSize}px` : undefined, '--cms-body': style.bodySize ? `${style.bodySize}px` : undefined, '--cms-padding': style.padding !== undefined ? `${style.padding}px` : undefined, '--cms-font': style.font && style.font!=='native' ? style.font : undefined, '--cms-background': style.background, '--cms-x': style.textX !== undefined ? `${style.textX}px` : undefined, '--cms-y': style.textY !== undefined ? `${style.textY}px` : undefined, '--cms-spacing': style.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined, '--cms-line': style.lineHeight, '--cms-align': style.align, '--cms-button-size': style.buttonSize ? `${style.buttonSize}px` : undefined, '--cms-radius': style.buttonRadius !== undefined ? `${style.buttonRadius}px` : undefined, '--cms-image-x': style.imageX !== undefined ? `${style.imageX}%` : undefined, '--cms-image-y': style.imageY !== undefined ? `${style.imageY}%` : undefined };
    return <div key={id} data-cms-section={id} data-selected={state.selected===id} data-button-style={style.buttonStyle} className="cms-section" style={variables}
      onClickCapture={event=>{ event.preventDefault(); event.stopPropagation(); send({ type:'select', id }); }}>
      <button className="cms-select" onKeyDown={event=>{ if (['Enter',' '].includes(event.key)) {event.preventDefault();send({type:'select',id});} }}>Select {meta.label}{meta.readOnly?' (read-only)':''}</button>
      <div className="cms-native" inert>{children}</div>
    </div>;
  }
  // No public Layout: its tracking, chat, cart and sign-up actions are intentionally absent.
  return <CartPreviewProvider><div className="min-h-screen flex flex-col bg-rtg-ink bg-grain" onSubmitCapture={e=>e.preventDefault()}>
    <SiteBackground />
    {section('navigation',<Navbar />)}
    <main className="relative flex-1">{pagePath!=='/' ? (pagePath==='/about'?<About editor={{settings:{...settings,...state.draft.text},images:{...images,...state.draft.images},section}}/>:pagePath==='/volunteer'?<Volunteer editor={{settings:state.draft.text,section}}/>:isCommunityDetail(pagePath)?<CommunityDetail editor={{communityId:pagePath.split('/')[2],section}}/>:pagePath==='/community'?<Community editor={{settings:{...settings,...state.draft.text},images:{...images,...state.draft.images},section}}/>:<Lab editor={{settings:{...settings,...state.draft.text},section}}/>) : <Home editor={{ settings:{...settings,...state.draft.text}, images:{...images,...state.draft.images}, slide:state.slide, heroMotion:resolvedStyle(state.draft,'hero',state.device), section }} />}</main>
    {section('join',(!['/','/community'].includes(pagePath))?<Footer />:<JoinCTA community={pagePath==='/community'} play={pagePath==='/'} />)}
  </div></CartPreviewProvider>;
}
