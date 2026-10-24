import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import TimingCodesAdmin,{indiaInstant,sessionLabel} from '../../../src/volunteer-timer/TimingCodesAdmin';
beforeEach(()=>sessionStorage.clear());
const session={id:'s',date:'2026-10-22',name:'Race',startTime:'06:30',endTime:'11:30',mode:'live',finished:false};
const empty=async action=>action==='identity'?'synthetic-owner':action==='capabilities'?{sessionCodesEnabled:true}:action==='list'?[]:{assignments:[],sessions:[session,{id:'old',date:'2026-10-21',name:'Done',mode:'testing',finished:true}],riders:[{id:'r',name:'Synthetic rider'}]};
const ready=async()=>{await screen.findByText('No codes have been issued.');fireEvent.change(screen.getByLabelText('Session'),{target:{value:'s'}});await waitFor(()=>expect(screen.getByRole('button',{name:'Create code'})).toBeEnabled());};

it('is laid out in three steps and only offers volunteer codes',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await ready();
 for(const name of ['Create a session',"Create the volunteer's code",'Issued codes'])expect(screen.getByRole('heading',{name})).toBeInTheDocument();
 expect(screen.queryByText(/owner code/i)).toBeNull();
 // Only open sessions, with name, time window and type.
 const options=within(screen.getByLabelText('Session')).getAllByRole('option').map(o=>o.textContent);
 expect(options).toContain('22 Oct 2026 · Race · 06:30–11:30 · Live');
 expect(options.some(t=>t.includes('Done'))).toBe(false);
 expect(sessionLabel({date:'2026-10-22',name:'Session 1',mode:'testing'})).toBe('22 Oct 2026 · Session 1 · Practice');
});
it('hours buttons set how long the code works (default 6)',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await ready();
 for(const h of [1,2,4,6,12,24])expect(screen.getByRole('button',{name:`${h} ${h===1?'hour':'hours'}`})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'6 hours'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'2 hours'}));
 expect(screen.getByRole('button',{name:'2 hours'})).toHaveAttribute('aria-pressed','true');
});
it('one click creates the code with the volunteer name and hours — no review dialog — and lists it at once',async()=>{
 const request=vi.fn(async(action,payload)=>action==='issue'?{id:'c1',code:'SYNTHETIC-ONLY',expiresAt:Date.parse(payload.expiresAt),volunteerName:payload.volunteerName}:empty(action));
 render(<TimingCodesAdmin request={request}/>);await ready();
 fireEvent.change(screen.getByLabelText("Volunteer's name"),{target:{value:'Rohit Kumar'}});
 fireEvent.click(screen.getByRole('button',{name:'4 hours'}));
 const before=Date.now();
 fireEvent.click(screen.getByRole('button',{name:'Create code'}));
 expect(await screen.findByRole('heading',{name:'✓ Code ready for Rohit Kumar'})).toBeInTheDocument();
 const [,payload]=request.mock.calls.find(([a])=>a==='issue');
 expect(payload).toMatchObject({scope:'session_timing',sessionId:'s',volunteerName:'Rohit Kumar'});
 expect(Math.abs(Date.parse(payload.expiresAt)-(before+4*3600000))).toBeLessThan(60000);
 expect(screen.queryByRole('dialog')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Show code'}));expect(screen.getByText('SYNTHETIC-ONLY')).toBeInTheDocument();
 // Listed straight away, without reloading the whole page.
 expect(screen.getAllByText('Rohit Kumar').length).toBeGreaterThan(0);
 expect(request.mock.calls.filter(([a])=>a==='list')).toHaveLength(1);
 expect(request.mock.calls.filter(([a])=>['grant','resolve'].includes(a))).toHaveLength(0);
});
it('copies a ready-to-send message with link, code and expiry',async()=>{
 const writeText=vi.fn().mockResolvedValue();Object.defineProperty(navigator,'clipboard',{value:{writeText},configurable:true});
 const request=async(action,payload)=>action==='issue'?{id:'c1',code:'ABC-123',expiresAt:Date.parse(payload.expiresAt)}:empty(action);
 render(<TimingCodesAdmin request={request}/>);await ready();
 fireEvent.click(screen.getByRole('button',{name:'Create code'}));
 fireEvent.click(await screen.findByRole('button',{name:'Copy message for the volunteer'}));
 await waitFor(()=>expect(writeText).toHaveBeenCalled());
 expect(writeText.mock.calls[0][0]).toMatch(/volunteer\/ridge\/code[\s\S]*Code: ABC-123[\s\S]*Session: 22 Oct 2026 · Race/);
});
it('keeps creation disabled until volunteer codes are activated',async()=>{
 const request=async action=>action==='capabilities'?{sessionCodesEnabled:false}:empty(action);render(<TimingCodesAdmin request={request}/>);await screen.findByText('No codes have been issued.');
 fireEvent.change(screen.getByLabelText('Session'),{target:{value:'s'}});expect(screen.getByText(/awaiting activation/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Create code'})).toBeDisabled();
});
it('keeps creation disabled when sessions cannot be loaded',async()=>{
 const request=async action=>{if(action==='overview')throw Error('Unavailable');return empty(action);};render(<TimingCodesAdmin request={request}/>);
 expect(await screen.findByText(/Sessions could not be loaded/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Create code'})).toBeDisabled();
});
it('lists issued codes with the volunteer name and status',async()=>{
 const list=[{id:'c2abcdefgh',scope:'session_timing',sessionId:'s',volunteerName:'Simran',expiresAt:new Date(Date.now()+3600000).toISOString()},{id:'c1abcdefgh',scope:'session_timing',sessionId:'s',volunteerName:null,expiresAt:new Date(Date.now()-60000).toISOString()}];
 render(<TimingCodesAdmin request={async a=>a==='list'?list:empty(a)}/>);
 expect(await screen.findByText('Simran')).toBeInTheDocument();expect(screen.getByText('Active')).toBeInTheDocument();expect(screen.getByText('Expired')).toBeInTheDocument();
 expect(indiaInstant('2026-10-22T01:30')).toBe(Date.parse('2026-10-21T20:00:00Z'));
});
