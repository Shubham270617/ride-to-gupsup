import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// IDs do not change when an admin edits a community's name.
export const communityPagePath = (id) => `/community/${encodeURIComponent(id)}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GROUP_COLUMNS = "id,name,monogram,location,sport,tagline,description,relation_label,connection_label,contact_person,reach,join_text";
const ACTIVITY_COLUMNS = "id,title,schedule_type,weekday,activity_date,when_text,time_text,location,format,summary,status_label,note,link_url,link_label";

export function safeCommunityLink(value) {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (/^\/(?!\/)/.test(link) && !link.includes("\\") && ![...link].some((char) => char.charCodeAt(0) <= 32)) return link;
  try {
    const url = new URL(link);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

// Fetch only explicitly public fields. Private coordinator data must never be
// added here. Database RLS remains the authority for public visibility.
export function useCommunityDetail(id) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ id: null });
  useEffect(() => {
    let cancelled = false;
    const update = (next) => { if (!cancelled) setState({ id, ...next }); };
    if (!UUID.test(id || "")) {
      update({ loading: false, group: null });
      return () => { cancelled = true; };
    }
    if (!isSupabaseConfigured) {
      update({ loading: false, error: "Community information is temporarily unavailable." });
      return () => { cancelled = true; };
    }
    update({ loading: true });
    async function load() {
      try {
        const { data: group, error } = await supabase.from("community_network_groups")
          .select(GROUP_COLUMNS).eq("published", true).eq("id", id).maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        if (!group) { update({ loading: false, group: null }); return; }
        update({ loading: false, group, activities: [], activitiesLoading: true });
        try {
          // Existing calendar records use the admin's "Hosted By" text field.
          // Match it exactly rather than guessing ownership from city or sport.
          const result = await supabase.from("calendar_activities").select(ACTIVITY_COLUMNS)
            .eq("published", true).eq("organiser", group.name).order("sort_order", { ascending: true });
          if (result.error) throw result.error;
          update({ loading: false, group, activities: result.data || [], activitiesLoading: false });
        } catch {
          update({ loading: false, group, activities: [], activitiesLoading: false,
            activitiesError: "Activities could not be loaded. Please try again." });
        }
      } catch {
        update({ loading: false, error: "Community information could not be loaded. Please try again." });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, attempt]);
  // Never render the previous community while a new route is loading.
  return { ...(state.id === id ? state : { loading: true }), retry: () => setAttempt((n) => n + 1) };
}


// Selector uses only actual published IDs and names; never static placeholders.
export function usePublishedCommunityChoices() {
 const [state,setState]=useState({items:[],loading:true,error:null});
 useEffect(()=>{let cancelled=false;
  if(!isSupabaseConfigured){setState({items:[],loading:false,error:'Community selection needs the existing configured client.'});return;}
  Promise.resolve(supabase.from('community_network_groups').select('id,name').eq('published',true).order('name',{ascending:true}))
   .then(({data,error})=>{if(!cancelled)setState({items:error?[]:(data||[]).filter(row=>UUID.test(row.id)),loading:false,error:error?'Published communities could not be loaded.':null});})
   .catch(()=>{if(!cancelled)setState({items:[],loading:false,error:'Published communities could not be loaded.'});});
  return()=>{cancelled=true;};
 },[]);return state;
}
