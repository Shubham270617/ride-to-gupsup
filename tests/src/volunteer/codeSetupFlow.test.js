import {it,expect,vi} from 'vitest';
import {codeSetupFlow} from '../../../src/volunteer-timer/codeSetupFlow';
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const plan=()=>({label:'Synthetic volunteer',grant:{requestId:'same-request',userId:'u',sessionId:'s'},code:{scope:'timing',assignmentId:'u:s',expiresAt:new Date(Date.now()+3600000).toISOString()}});
it('does nothing on mount and reuses exact grant request after response loss and reload',async()=>{
 const storage=store();let first=true;const request=vi.fn(async(action)=>{if(action==='identity')return 'owner-a';if(action==='grant'&&first){first=false;throw Error('lost response');}if(action==='issue')return {code:'synthetic'};return {revision:1};});
 let flow=codeSetupFlow({request,storage});await flow.load();expect(request.mock.calls.map(([a])=>a)).toEqual(['identity']);const original=plan();await flow.begin(original);await expect(flow.run()).rejects.toThrow('lost response');
 flow=codeSetupFlow({request,storage});await flow.load();expect(request.mock.calls.filter(([a])=>a==='grant')).toHaveLength(1);await flow.run();const grants=request.mock.calls.filter(([a])=>a==='grant');expect(grants[0][1]).toEqual(grants[1][1]);expect(request.mock.calls.filter(([a])=>a==='issue')).toHaveLength(1);
});
it('never repeats issuance or grant after unknown code response, including reload',async()=>{
 const storage=store(),request=vi.fn(async a=>{if(a==='identity')return 'owner';if(a==='issue')throw Error('lost code response');return {};});let flow=codeSetupFlow({request,storage});await flow.load();await flow.begin(plan());await expect(flow.run()).rejects.toThrow();flow=codeSetupFlow({request,storage});await flow.load();await expect(flow.run()).rejects.toThrow('outcome unknown');expect(request.mock.calls.filter(([a])=>a==='grant')).toHaveLength(1);expect(request.mock.calls.filter(([a])=>a==='issue')).toHaveLength(1);await expect(flow.clearExpired()).rejects.toThrow('not expired');
});
it('binds recovery and every write to original owner login',async()=>{
 let identity='owner-a';const storage=store(),request=vi.fn(async a=>a==='identity'?identity:{}),flow=codeSetupFlow({request,storage});await flow.load();await flow.begin(plan());identity='owner-b';await expect(flow.run()).rejects.toThrow('Owner session changed');expect(request.mock.calls.some(([a])=>a==='grant')).toBe(false);const next=codeSetupFlow({request,storage});expect(await next.load()).toBeNull();
});
it('storage failure stops all mutations and secrets are never persisted',async()=>{
 const request=vi.fn(async a=>a==='identity'?'owner':{code:'private-test-code'}),storage=store(),flow=codeSetupFlow({request,storage});await flow.load();storage.setItem=()=>{throw Error('storage full');};await expect(flow.begin(plan())).rejects.toThrow('storage full');expect(request.mock.calls.some(([a])=>a==='grant')).toBe(false);
});
it('owner code never grants session access and persists no returned credential',async()=>{
 const storage=store(),request=vi.fn(async a=>a==='identity'?'owner':{code:'private-test-code'}),flow=codeSetupFlow({request,storage});await flow.load();await flow.begin({label:'Owner',code:{scope:'advanced',expiresAt:new Date(Date.now()+3600000).toISOString()}});expect(await flow.run()).toEqual({code:'private-test-code'});expect(request.mock.calls.some(([a])=>a==='grant')).toBe(false);expect(storage.getItem('rtg-code-setup:owner')).toBeNull();
});

it('a definitive refusal (no code was stored) does not leave the flow blocked', async () => {
  const data = new Map();
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const request = vi.fn(async a => {
    if (a === 'identity') return 'owner';
    throw Object.assign(new Error('Could not create the code: no session'), { definitive: true });
  });
  const flow = codeSetupFlow({ request, storage });
  await flow.load();
  await flow.begin({ label: 'Volunteer', code: { scope: 'session_timing', sessionId: 's', expiresAt: new Date(Date.now() + 3600000).toISOString() } });
  await expect(flow.run()).rejects.toThrow(/no session/);
  expect(flow.current).toBeNull();
  // A lost response (not definitive) still blocks a second code.
  request.mockImplementation(async a => { if (a === 'identity') return 'owner'; throw new Error('network'); });
  await flow.begin({ label: 'Volunteer', code: { scope: 'session_timing', sessionId: 's', expiresAt: new Date(Date.now() + 3600000).toISOString() } });
  await expect(flow.run()).rejects.toThrow('network');
  expect(flow.current?.phase).toBe('issuing');
});
