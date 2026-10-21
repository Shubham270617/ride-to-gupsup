// Offline review generator. No network, privilege changes or admin promotion bypass.
import {buildPublicFeed} from '../../src/lib/ridge/engine.js';
import {prepareStagedImport} from './staged-import.mjs';
const literal=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
export function prepareReviewedPublication(staged,{actorId,requestId,snapshotId,expectedVersion,approved=false}) {
 if(approved!==true) throw new Error('Explicit publication approval required');
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion<1)throw new Error('Staged version required');
 prepareStagedImport(staged,{actorId,requestId,snapshotId});
 if(staged.sessions.some(s=>s.mode!=='testing'||!s.finished))throw new Error('Only reviewed locked staging may be published');
 const state=structuredClone(staged);state.sessions.forEach(s=>s.mode='live');
 const feed=buildPublicFeed(state);
 // Only known display fields from the native renderer cross the audience boundary.
 // No source workbook IDs, correction logs, timer UUIDs, contacts or photos.
 feed.results=feed.results.map(({id,session_slug,athlete_name,athlete_id,session_date,improvement,highlight_score,score_source,total_score,loop_times,lap_points,completed_laps,progress_points,spotlight_points,adjustment_points,published})=>({id,session_slug,athlete_name,athlete_id,session_date,improvement,highlight_score,score_source,total_score,loop_times,lap_points,completed_laps,progress_points,spotlight_points,adjustment_points,published,photo_url:''}));
 const audit={type:'publish_reviewed_history',command:{type:'publish_reviewed_history',snapshotId,expectedVersion,state,feed}};
 const sql=`-- REVIEW ONLY: TEST cxwfjrntfqlyaqppxggh, explicit historical publication.
begin;
lock table public.ridge_workspace in exclusive mode;
lock table public.ridge_publication in exclusive mode;
do $review$ begin
 if not exists(select 1 from public.ridge_audit where request_id='${requestId}'::uuid) and not exists(select 1 from public.ridge_workspace where singleton and version=${expectedVersion} and state=${literal(staged)}) then raise exception 'Reviewed staging changed; reconcile before publication'; end if;
end $review$;
select public.ridge_commit(${expectedVersion},'${requestId}'::uuid,'${actorId}'::uuid,${literal(state)},${literal(feed)},${literal(audit)});
commit;`;
 return {state,feed,sql};
}
