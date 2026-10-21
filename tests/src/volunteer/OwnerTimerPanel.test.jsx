import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import OwnerTimerPanel from '../../../src/volunteer-timer/OwnerTimerPanel';
const state={schemaVersion:1,riders:Array.from({length:19},(_,i)=>({id:`synthetic-${i}`,name:`Synthetic ${i}`})),sessions:[{id:'old',date:'2026-09-19',mode:'live',entries:[]},{id:'recent',date:'2026-10-17',mode:'live',entries:[]}]};
it('loads the existing admin workspace without requiring self-assignment',async()=>{
 const request=vi.fn().mockResolvedValue({state,version:2});render(<OwnerTimerPanel requestTransport={request}/>);
 await screen.findByRole('checkbox',{name:'Synthetic 18'});expect(screen.getAllByRole('checkbox')).toHaveLength(19);expect(screen.getByRole('combobox',{name:'Session'})).toHaveDisplayValue('RR 2026-10-17');expect(screen.getByRole('status')).toHaveTextContent('Owner');expect(request).toHaveBeenCalledWith(undefined,expect.any(AbortSignal));expect(request.mock.calls.every(c=>c[0]===undefined)).toBe(true);
});
it('keeps uncertain writes blocked and retries the exact original body',async()=>{
 const request=vi.fn().mockImplementation(async body=>{if(body)throw Object.assign(new Error('Unconfirmed'),{uncertain:true});return{state,version:2};});
 render(<OwnerTimerPanel requestTransport={request}/>);await screen.findByRole('checkbox',{name:'Synthetic 0'});fireEvent.click(screen.getByRole('checkbox',{name:'Synthetic 0'}));fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));await screen.findByRole('button',{name:'Retry same action'});await waitFor(()=>expect(screen.getByRole('button',{name:'Retry same action'})).toBeEnabled());expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();const body=request.mock.calls.find(c=>c[0])?.[0];fireEvent.click(screen.getByRole('button',{name:'Retry same action'}));await waitFor(()=>expect(request.mock.calls.filter(c=>c[0])).toHaveLength(2));expect(request.mock.calls.filter(c=>c[0])[1][0]).toBe(body);
});
