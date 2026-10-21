import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import TimingOwnerPanel from '../../../src/volunteer-timer/TimingOwnerPanel';
const overview={activationReady:false,assignments:[],sessions:[{id:'s',date:'2026-10-21',mode:'testing',finished:false}],riders:[{id:'a',name:'Synthetic A'}]};
it('prepares a reviewable named grant but cannot submit before activation',async()=>{
 const request=vi.fn(async action=>action==='overview'?overview:{user:{id:'operator',email:'synthetic@example.test'}});
 render(<TimingOwnerPanel request={request}/>);await screen.findByText('No assignments.');
 fireEvent.change(screen.getByLabelText('Existing account email'),{target:{value:'synthetic@example.test'}});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Verify existing account'})));
 fireEvent.change(screen.getByLabelText('Assigned session'),{target:{value:'s'}});fireEvent.change(screen.getByLabelText(/Expiry/),{target:{value:'2026-10-22T08:00'}});fireEvent.click(screen.getByLabelText('Synthetic A'));
 fireEvent.click(screen.getByRole('button',{name:'Review assignment'}));expect(screen.getByRole('button',{name:'Confirm grant'})).toBeDisabled();expect(screen.getByRole('region',{name:'Assignment review'})).toHaveTextContent('synthetic@example.test');
 expect(request.mock.calls.every(([action])=>!['grant','revoke'].includes(action))).toBe(true);
});
it('shows a missing receipt as uncertain and never offers a timing replay',async()=>{
 const request=vi.fn(async action=>action==='overview'?overview:{status:'not_found',message:'A request may still be in flight.'});render(<TimingOwnerPanel request={request}/>);await screen.findByText('No assignments.');
 fireEvent.change(screen.getByLabelText('Original timing request ID'),{target:{value:'request'}});await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Check receipt'})));
 expect(screen.getByRole('region',{name:'Reconciliation result'})).toHaveTextContent('in flight');expect(screen.queryByRole('button',{name:/repeat|replay/i})).not.toBeInTheDocument();
});
