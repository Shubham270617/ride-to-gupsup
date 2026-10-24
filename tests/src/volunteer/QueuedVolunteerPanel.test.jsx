import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import QueuedVolunteerPanel from '../../../src/volunteer-timer/QueuedVolunteerPanel';
import {applyRidgeCommand} from '../../../src/lib/ridge/engine';
const make=()=>({version:0,assignments:[{sessionId:'s',expiresAt:Date.now()+3600000}],state:{riders:['a','b'].map(id=>({id,name:'Synthetic '+id})),sessions:[{id:'s',date:'2026-10-22',mode:'testing',finished:false,entries:['a','b'].map(riderId=>({riderId,laps:[],adjustment:0}))}]}});
for(const identity of ['assigned-login','synthetic-code'])it(`${identity} keeps both rider controls usable while first save is delayed`,async()=>{
 let data=make(),release,calls=[];const write=async body=>{calls.push(body);if(calls.length===1)await new Promise(r=>release=r);data={...data,version:data.version+1,state:applyRidgeCommand(data.state,body.command).state};};render(<QueuedVolunteerPanel initial={data} identity={identity} read={async()=>data} write={write} checkIdentity={async()=>identity}/>);
 fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));fireEvent.click(screen.getAllByRole('button',{name:'START · L1'})[0]);await waitFor(()=>expect(calls).toHaveLength(1));expect(screen.getByRole('button',{name:'START · L1'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'START · L1'}));expect(screen.getAllByText('Running L1')).toHaveLength(2);expect(screen.getAllByText('Pending save')).toHaveLength(2);release();await waitFor(()=>expect(screen.queryAllByText('Pending save')).toHaveLength(0));expect(calls.map(c=>c.version)).toEqual([0,1]);expect(screen.getAllByText('Running L1')).toHaveLength(2);
});
it('revoked assignment leaves roster mounted and preserves queued action for reconciliation',async()=>{
 const data=make(),write=vi.fn().mockRejectedValue(Error('Assignment revoked'));render(<QueuedVolunteerPanel initial={data} identity="revoked-fixture" read={async()=>data} write={write} checkIdentity={async()=>'revoked-fixture'}/>);fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));fireEvent.click(screen.getAllByRole('button',{name:'START · L1'})[0]);await screen.findByRole('button',{name:'Reconcile queued taps'});expect(screen.getByRole('heading',{name:'Synthetic a'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Synthetic b'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'START · L1'})).toBeDisabled();expect(write).toHaveBeenCalledOnce();
});
it('a volunteer code adds a missing rider, who is ticked and saved with attendance in order',async()=>{
 let data=make(),calls=[];const write=async body=>{calls.push(body.command);data={...data,version:data.version+1,state:applyRidgeCommand(data.state,body.command).state};};
 render(<QueuedVolunteerPanel canAddRiders initial={data} identity="add-rider" read={async()=>data} write={write} checkIdentity={async()=>'add-rider'} storage={sessionStorage}/>);
 fireEvent.change(screen.getByLabelText('New rider name'),{target:{value:'  Cara '}});fireEvent.click(screen.getByRole('button',{name:'Add rider'}));
 expect(screen.getByRole('checkbox',{name:/Cara/})).toBeChecked();
 await waitFor(()=>expect(screen.getByRole('button',{name:'Save attendance'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));
 await waitFor(()=>expect(calls.map(c=>c.type)).toEqual(['create_rider','attendance']));
 const id=calls[0].riderId;expect(calls[0]).toEqual({type:'create_rider',sessionId:'s',name:'Cara',riderId:id});
 expect(calls[1].riderIds).toEqual(['a','b',id]);expect(data.state.riders.at(-1)).toEqual({id,name:'Cara',photo:''});
});
it('without canAddRiders a volunteer sees no Add rider box',()=>{
 render(<QueuedVolunteerPanel initial={make()} identity="no-add" read={async()=>make()} write={vi.fn()} checkIdentity={async()=>'no-add'} storage={sessionStorage}/>);
 expect(screen.queryByLabelText('New rider name')).toBeNull();
});
