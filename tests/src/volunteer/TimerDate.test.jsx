import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import VolunteerTimerPanel from '../../../src/volunteer-timer/VolunteerTimerPanel';
import {applyRidgeCommand} from '../../../src/lib/ridge/engine';
const now=Date.parse('2026-10-21T16:31:00Z');
const state={schemaVersion:1,riders:Array.from({length:4},(_,i)=>({id:`synthetic-${i}`,name:`Synthetic rider ${i}`})),sessions:[{id:'test',date:'2026-10-22',mode:'testing',finished:false,entries:Array.from({length:4},(_,i)=>({riderId:`synthetic-${i}`,laps:[],adjustment:0})),awardOverrides:[]}]};
it('allows future-date testing start from the connected UI with actual now',()=>{
 const send=vi.fn();const clock=vi.spyOn(Date,'now').mockReturnValue(now);try{render(<VolunteerTimerPanel connected sessions={state.sessions} riders={state.riders} previewActions={{send}} now={now}/>);
 fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));expect(screen.queryByRole('alert')).toBeNull();expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Start all · Lap 1'}));expect(send).toHaveBeenCalledWith({type:'group_start',sessionId:'test',at:now});}finally{clock.mockRestore();}
});
it('keeps wrong-date LIVE disabled and explanatory',()=>{
 const send=vi.fn();render(<VolunteerTimerPanel connected sessions={[{...state.sessions[0],mode:'live'}]} riders={state.riders} previewActions={{send}} now={now}/>);fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));expect(screen.getByRole('alert')).toHaveTextContent('2026-10-22, but today in India is 2026-10-21');expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeDisabled();expect(send).not.toHaveBeenCalled();
});
it('records real timestamps for four TEST riders, pass and finish, preserving selected date and input',()=>{
 const before=JSON.stringify(state);let result=applyRidgeCommand(state,{type:'group_start',sessionId:'test',at:now},{now});expect(result.state.sessions[0].entries.every(e=>e.laps[0].start===now)).toBe(true);
 result=applyRidgeCommand(result.state,{type:'pass',sessionId:'test',riderId:'synthetic-0',lap:1,at:now+60000},{now:now+60000});result=applyRidgeCommand(result.state,{type:'end',sessionId:'test',riderId:'synthetic-0',lap:2,at:now+120000},{now:now+120000});expect(result.state.sessions[0].entries[0].laps[1]).toMatchObject({start:now+60000,end:now+120000});expect(result.state.sessions[0].date).toBe('2026-10-22');expect(JSON.stringify(state)).toBe(before);
});
it('server retains LIVE date restriction and TEST device-clock protection',()=>{
 expect(()=>applyRidgeCommand({...state,sessions:[{...state.sessions[0],mode:'live'}]},{type:'group_start',sessionId:'test',at:now},{now})).toThrow('today in India is 2026-10-21');expect(()=>applyRidgeCommand(state,{type:'group_start',sessionId:'test',at:now-700000},{now})).toThrow('device clock');
});
