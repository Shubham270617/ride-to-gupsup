import { useEffect, useState, useSyncExternalStore } from 'react';
import { applyRidgeCommand } from '../lib/ridge/engine';
import { createTimingController } from './timingController';
import VolunteerTimerPanel from './VolunteerTimerPanel';

// Explicit synthetic-only harness, not imported by App or any deployed route.
export default function SyntheticTimerPreview() {
  const [controller] = useState(() => {
    const now = Date.now();
    let data = {version:0,state:{schemaVersion:1,
      riders:[{id:'synthetic-a',name:'Example rider A'},{id:'synthetic-b',name:'Example rider B'}],
      sessions:[{id:'synthetic-session',date:new Date(now+19800000).toISOString().slice(0,10),mode:'testing',finished:false,awardOverrides:[],entries:[]}]}};
    const receipts = new Map();
    return createTimingController({initial:data,
      getAuthorization:() => ({userId:'synthetic-operator',assignment:{userId:'synthetic-operator',sessionId:'synthetic-session',expiresAt:now+3600000}}),
      transport:async request => {
        if (receipts.has(request.requestId)) return receipts.get(request.requestId);
        if (request.version !== data.version) throw Object.assign(new Error('Refresh required.'),{definitive:true});
        try { data={version:data.version+1,state:applyRidgeCommand(data.state,request.command).state}; }
        catch(error) { error.definitive=true; throw error; }
        receipts.set(request.requestId,data); return data;
      },
    });
  });
  const snapshot=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  const [now,setNow]=useState(Date.now());
  useEffect(() => { const timer=setInterval(() => setNow(Date.now()),250); return () => clearInterval(timer); },[]);
  return <VolunteerTimerPanel sessions={snapshot.data.state.sessions} riders={snapshot.data.state.riders}
    previewActions={controller} busy={snapshot.busy} pending={!!snapshot.pending} message={snapshot.message} now={now}/>;
}
