import { useMemo, useState } from 'react';
import {supabase,isSupabaseConfigured} from '../../lib/supabaseClient';
import {createSiteDraftStore} from '../../lib/siteEditor/store';
import SiteEditor from './SiteEditor';
import { usePublishedCommunityChoices } from '../../lib/communityDetails';
import { PAGE_REGISTRY, isCommunityDetail } from './catalog';
const connected = new Set(['/','/community','/lab','/about','/volunteer']);
// Retain each mounted editor and its unsaved draft when moving between pages.
export default function MultiPageEditor(props) {
  const groups=usePublishedCommunityChoices();
  const sharedStore=useMemo(()=>isSupabaseConfigured?createSiteDraftStore({getAccessToken:async()=>{const {data,error}=await supabase.auth.getSession();if(error)throw error;return data?.session?.access_token;}}):null,[]);
  const [page,setPage]=useState('/');
  const [visited,setVisited]=useState(['/']);
  const select=path=>{setPage(path);if((connected.has(path)||isCommunityDetail(path)))setVisited(previous=>previous.includes(path)?previous:[...previous,path]);};
  return <>{visited.map(path=><div key={path} hidden={path!==page}><SiteEditor {...props} sharedStore={sharedStore} pagePath={path} onPageChange={select}/></div>)}
    {!(connected.has(page)||isCommunityDetail(page))&&<div className="cms-editor"><label>Website page<select value={page} onChange={e=>select(e.target.value)}>{PAGE_REGISTRY.map(p=><option value={p.path} key={p.path}>{p.label} — {p.coverage}</option>)}</select></label>{page==='/community/:communityId'?<><label>Published community<select defaultValue="" onChange={e=>{if(e.target.value)select('/community/'+e.target.value);}}><option value="">Choose a published community</option>{groups.items.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><p role="status">{groups.loading?'Loading published communities…':groups.error||(!groups.items.length?'No published communities available.':'Select a real published community ID. Underlying records remain read-only.')}</p></>:<p role="note">This native page is not connected. Your other page drafts remain in memory.</p>}</div>}
  </>;
}
