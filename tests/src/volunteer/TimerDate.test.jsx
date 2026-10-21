import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import VolunteerTimerPanel from '../../../src/volunteer-timer/VolunteerTimerPanel';
import {applyRidgeCommand} from '../../../src/lib/ridge/engine';
const now=Date.parse('2026-10-21T16:31:00Z');
const state={schemaVersion:1,riders:[{id:'synthetic',name:'Synthetic rider'}],sessions:[{id:'test',date:'2026-10-22',mode:'testing',finished:false,entries:[{riderId:'synthetic',laps:[],adjustment:0}],awardOverrides:[]}]};
it('explains future session beside timing controls without sending a start or losing attendance',()=>{
 const send=vi.fn();render(<VolunteerTimerPanel connected sessions={state.sessions} riders={state.riders} previewActions={{send}} now={now}/>);
 fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
 expect(screen.getByRole('alert')).toHaveTextContent('2026-10-22, but today in India is 2026-10-21');
 expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'START · L1'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Start all · Lap 1'}));expect(send).not.toHaveBeenCalled();
 expect(screen.getByRole('heading',{name:'Synthetic rider'})).toBeInTheDocument();
});
it('native engine rejects wrong-date start clearly, then starts all on correct IST day',()=>{
 const before=JSON.stringify(state);expect(()=>applyRidgeCommand(state,{type:'group_start',sessionId:'test',at:now},{now})).toThrow('today in India is 2026-10-21');expect(JSON.stringify(state)).toBe(before);
 const nextDay=Date.parse('2026-10-22T00:30:00Z');const result=applyRidgeCommand(state,{type:'group_start',sessionId:'test',at:nextDay},{now:nextDay});expect(result.state.sessions[0].entries[0].laps[0].start).toBe(nextDay);
});
