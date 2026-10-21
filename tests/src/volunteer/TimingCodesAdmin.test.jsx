import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import TimingCodesAdmin,{indiaInput,indiaInstant} from '../../../src/volunteer-timer/TimingCodesAdmin';
const empty=async action=>action==='list'?[]:{assignments:[],sessions:[]};
it('renders a future IST expiry and explains empty assignments while owner scope remains usable',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await screen.findByText(/No active volunteer assignments/);
 const input=screen.getByLabelText(/Code expiry/);expect(indiaInstant(input.value)).toBeGreaterThan(Date.now()+3*3600000);
 expect(screen.getByRole('button',{name:'Review code issuance'})).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Access scope'),{target:{value:'advanced'}});
 expect(screen.getByRole('button',{name:'Review code issuance'})).toBeEnabled();
 fireEvent.click(screen.getByRole('button',{name:'Review code issuance'}));expect(screen.getByText('Review access before generating')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Open code entry →'})).toHaveAttribute('href','/volunteer/ridge/code');
});
it('rejects past, empty and over-24-hour expiry in IST independent of browser timezone',async()=>{
 render(<TimingCodesAdmin request={empty}/>);await screen.findByText(/No active volunteer assignments/);fireEvent.change(screen.getByLabelText('Access scope'),{target:{value:'advanced'}});
 for(const value of ['',indiaInput(Date.now()-3600000),indiaInput(Date.now()+25*3600000)]){fireEvent.change(screen.getByLabelText(/Code expiry/),{target:{value}});expect(screen.getByRole('button',{name:'Review code issuance'})).toBeDisabled();}
 expect(indiaInstant('2026-10-22T01:30')).toBe(Date.parse('2026-10-21T20:00:00Z'));
});
it('shows assignment fetch failures without blocking owner scope',async()=>{
 const request=async action=>{if(action==='overview')throw Error('Permission unavailable');return [];};render(<TimingCodesAdmin request={request}/>);await screen.findByText(/Assignments could not be loaded/);
 fireEvent.change(screen.getByLabelText('Access scope'),{target:{value:'advanced'}});expect(screen.getByRole('button',{name:'Review code issuance'})).toBeEnabled();
});
it('shows meaningful session label and bounds volunteer expiry by assignment',async()=>{
 const end=Date.now()+2*3600000,request=async action=>action==='list'?[]:{assignments:[{user_id:'synthetic-account',session_id:'s',expires_at:new Date(end).toISOString()}],sessions:[{id:'s',date:'2026-10-22',mode:'testing'}]};render(<TimingCodesAdmin request={request}/>);
 await screen.findByRole('option',{name:/2026-10-22 · testing/});fireEvent.change(screen.getByLabelText('Existing volunteer assignment'),{target:{value:'synthetic-account:s'}});expect(screen.getByText('Code expiry cannot be later than the assignment expiry.')).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText(/Code expiry/),{target:{value:indiaInput(Date.now()+3600000)}});expect(screen.getByRole('button',{name:'Review code issuance'})).toBeEnabled();
});
it('never issues until explicit confirmation and preserves uncertainty on failed issuance',async()=>{
 const request=vi.fn(async action=>{if(action==='issue')throw Error('Network unavailable');return empty(action);});render(<TimingCodesAdmin request={request}/>);await screen.findByText(/No active volunteer assignments/);fireEvent.change(screen.getByLabelText('Access scope'),{target:{value:'advanced'}});fireEvent.click(screen.getByRole('button',{name:'Review code issuance'}));expect(request.mock.calls.some(([a])=>a==='issue')).toBe(false);
 fireEvent.click(screen.getByText('Confirm and generate code'));await screen.findByText(/Issuance was not confirmed/);expect(screen.getByRole('button',{name:'Review code issuance'})).toBeDisabled();expect(request.mock.calls.filter(([a])=>a==='issue')).toHaveLength(1);
});
