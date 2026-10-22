import {useState} from 'react';
// Mount only in a dedicated first-party callback entry with no analytics/assets.
// complete is an authenticated, same-login POST; never put these values in storage.
export default function PersonalCallback({complete,location=window.location,history=window.history}){
 const [payload]=useState(()=>{const q=new URLSearchParams(location.search);const value={code:q.get('code'),state:q.get('state'),scope:q.get('scope'),error:q.get('error')};history.replaceState(null,'',location.pathname);return value;});
 const [status,setStatus]=useState('ready');
 async function finish(){if(status!=='ready')return;setStatus('working');try{await complete(payload);setStatus('done');}catch{setStatus('failed');}}
 return <main><h1>Connect your personal Strava account</h1><p>This connection is limited to your own athlete on the TEST website.</p>{status==='ready'&&<button onClick={finish}>Complete connection</button>}{status==='working'&&<p role="status">Completing connection…</p>}{status==='done'&&<p role="status">Connected. You can return to your dashboard.</p>}{status==='failed'&&<p role="alert">Connection was not completed. Start a new connection from the dashboard; do not replay this callback.</p>}</main>;
}
