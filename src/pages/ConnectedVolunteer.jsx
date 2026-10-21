import {useEffect,useMemo,useState} from 'react';
import Volunteer from './Volunteer';
import {supabase} from '../lib/supabaseClient';
import {createVolunteerRepository} from '../lib/volunteerRepository';
import {crewOpportunities as volunteerRoles} from '../data/crewOpportunities';

// Public snapshots only; private drafts never reach this page or its canvas.
export default function ConnectedVolunteer({editor,client=supabase}) {
 const repository=useMemo(()=>createVolunteerRepository(client),[client]);
 const [attempt,setAttempt]=useState(0),[state,setState]=useState({loading:!!client,roles:volunteerRoles,reference:true});
 useEffect(()=>{
  if(!client){setState({loading:false,roles:volunteerRoles,reference:true});return;}
  let active=true;
  const timer=setTimeout(()=>{if(active){active=false;setState({loading:false,error:'Role information took too long to load. Please try again.'});}},20000);
  setState({loading:true});
  repository.listPublished().then(rows=>{if(active)setState({loading:false,roles:rows.length?rows:volunteerRoles,reference:rows.length===0});})
   .catch(()=>{if(active)setState({loading:false,error:'Approved role information could not be loaded. Please try again.'});})
   .finally(()=>clearTimeout(timer));
  return()=>{active=false;clearTimeout(timer);};
 },[repository,client,attempt]);
 if(state.loading)return <main className="rtg-crew rtg-crew-wrap rtg-crew-section"><h1>RTG Crew</h1><p role="status">Loading role information…</p></main>;
 if(state.error)return <main className="rtg-crew rtg-crew-wrap rtg-crew-section"><h1>RTG Crew</h1><p role="alert">{state.error}</p><button type="button" onClick={()=>setAttempt(n=>n+1)}>Try again</button><p>Applications remain closed.</p></main>;
 return <Volunteer roles={state.roles} editor={editor} reference={state.reference}/>;
}
