import {useMemo,useState} from 'react';
import {personalActivities,totals} from './model';
import './personal.css';
const format=(n,unit,divisor=1)=>n==null?'—':`${(n/divisor).toLocaleString('en-IN',{maximumFractionDigits:1})} ${unit}`;
// No live adapter is installed yet. Real data must come from a separately
// approved, own-athlete-only server flow, never the old multi-athlete board.
export default function PersonalDashboard({snapshot=null,preview=false,now=Date.now()}) {
 const [days,setDays]=useState(30),[sport,setSport]=useState('all');
 const rows=useMemo(()=>personalActivities(snapshot?.activities||[],snapshot?.athleteId,days,sport,now),[snapshot,days,sport,now]);
 const summary=totals(rows);
 return <main className="personal-strava"><header><p className="ps-eyebrow">RTG LAB · PERSONAL PROGRESS</p><h1>Your effort.<br/><em>Your perspective.</em></h1><p>A private view of your own activity, with room to notice how your routine is changing.</p></header>
 <aside role="status" className="ps-status">{preview?'Synthetic preview — these activities are fictional. No Strava connection is active.':'Personal Strava connection is not activated. Your separate TEST app must be configured and authorized before activities can load.'}</aside>
 <section aria-label="Activity filters" className="ps-filters"><label>Period<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label><label>Sport<select value={sport} onChange={e=>setSport(e.target.value)}><option value="all">All sports</option><option value="Ride">Cycling</option><option value="Run">Running</option><option value="Walk">Walking</option><option value="Swim">Swimming</option></select></label></section>
 <section className="ps-metrics" aria-label="Your totals">{[['Activities',snapshot?summary.count:'—'],['Distance',format(summary.distance,'km',1000)],['Moving time',format(summary.movingSeconds,'hours',3600)],['Elevation',format(summary.elevation,'m')]].map(([label,value])=><article key={label}><span>{label}</span><strong>{value}</strong></article>)}</section>
 <section className="ps-history"><div><p className="ps-eyebrow">YOUR ACTIVITY JOURNAL</p><h2>One session at a time.</h2></div>{rows.length?<ul>{rows.map(row=><li key={row.id}><div><span>{row.sport} · {new Date(row.startedAt).toLocaleDateString('en-IN',{timeZone:'UTC'})} UTC</span><h3>{row.name}</h3></div><p>{format(row.distance,'km',1000)}<small>{format(row.movingSeconds,'min',60)} moving</small></p></li>)}</ul>:<p className="ps-empty">{snapshot?'No activities match this period and sport.':'Your activity journal will appear here after you connect. No sample results are presented as your records.'}</p>}</section>
 <footer>Only your own activity belongs here. No rankings, other athletes’ records, maps or private location details are shown.</footer></main>;
}
