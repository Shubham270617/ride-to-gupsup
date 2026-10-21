import {it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import TimingCodesAdmin,{indiaInput,indiaInstant} from '../../../src/volunteer-timer/TimingCodesAdmin';
beforeEach(()=>sessionStorage.clear());
const empty=async action=>action==='identity'?'synthetic-owner':action==='list'?[]:{activationReady:true,assignments:[],sessions:[{id:'s',date:'2026-10-22',mode:'testing',finished:false}],riders:[{id:'r',name:'Synthetic rider'}]};
it('defaults to owner code with future IST expiry and no assignment jargon',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Review and create code'})).toBeEnabled());
 expect(screen.getByRole('button',{name:/My owner code/})).toHaveAttribute('aria-pressed','true');expect(screen.queryByText(/Existing volunteer assignment/)).not.toBeInTheDocument();
 expect(indiaInstant(screen.getByLabelText(/Code expiry/).value)).toBeGreaterThan(Date.now()+3*3600000);
 fireEvent.click(screen.getByRole('button',{name:'Review and create code'}));expect(screen.getByText('Create your owner code')).toBeInTheDocument();
});
it('rejects past, empty and over-24-hour expiry in IST',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Review and create code'})).toBeEnabled());
 for(const value of ['',indiaInput(Date.now()-3600000),indiaInput(Date.now()+25*3600000)]){fireEvent.change(screen.getByLabelText(/Code expiry/),{target:{value}});expect(screen.getByRole('button',{name:'Review and create code'})).toBeDisabled();}
 expect(indiaInstant('2026-10-22T01:30')).toBe(Date.parse('2026-10-21T20:00:00Z'));
});
it('supports one-screen verified volunteer/session review with no writes before confirmation',async()=>{
 const request=vi.fn(async(action,payload)=>action==='resolve'?{user:{id:'u',email:payload.email}}:action==='grant'?{revision:1}:action==='issue'?{code:'SYNTHETIC-ONLY'}:empty(action));
 render(<TimingCodesAdmin request={request}/>);await screen.findByText('No codes have been issued.');fireEvent.click(screen.getByRole('button',{name:/Volunteer timing code/}));
 fireEvent.change(screen.getByLabelText(/Volunteer’s website email/),{target:{value:'synthetic@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Find volunteer'}));await screen.findByText(/Verified volunteer: synthetic@example.test/);
 fireEvent.change(screen.getByLabelText('2. Session'),{target:{value:'s'}});fireEvent.click(screen.getByRole('button',{name:'Review and create code'}));expect(screen.getByText('Approve volunteer access and code')).toBeInTheDocument();expect(request.mock.calls.filter(([a])=>['grant','issue'].includes(a))).toHaveLength(0);
 fireEvent.click(screen.getByText('Approve access and create code'));await screen.findByText('SYNTHETIC-ONLY');expect(request.mock.calls.filter(([a])=>['grant','issue'].includes(a)).map(([a])=>a)).toEqual(['grant','issue']);
 expect(request.mock.calls.find(([a])=>a==='grant')[1]).toMatchObject({userId:'u',verifiedEmail:'synthetic@example.test',sessionId:'s',rosterIds:['r'],expectedRevision:0});
});
it('shows concise missing-account guidance and invalidates verification when email changes',async()=>{
 const request=async(action,payload)=>action==='resolve'?{user:{id:'u',email:payload.email}}:empty(action);render(<TimingCodesAdmin request={request}/>);await screen.findByText('No codes have been issued.');fireEvent.click(screen.getByRole('button',{name:/Volunteer timing code/}));fireEvent.change(screen.getByLabelText(/Volunteer’s website email/),{target:{value:'synthetic@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Find volunteer'}));await screen.findByText(/Verified volunteer/);fireEvent.change(screen.getByLabelText(/Volunteer’s website email/),{target:{value:'other@example.test'}});expect(screen.queryByText(/Verified volunteer/)).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Review and create code'})).toBeDisabled();
});
it('allows owner path even when session loading fails',async()=>{
 const request=async action=>{if(action==='overview')throw Error('Unavailable');return empty(action);};render(<TimingCodesAdmin request={request}/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Review and create code'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:/Volunteer timing code/}));expect(screen.getByText(/Sessions could not be loaded/)).toBeInTheDocument();expect(screen.getByRole('button',{name:'Review and create code'})).toBeDisabled();
});
