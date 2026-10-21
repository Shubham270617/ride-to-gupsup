import {it,expect,vi} from 'vitest';
import {render,screen,waitFor,fireEvent} from '@testing-library/react';
import {RelationField} from '../../src/admin/components/ResourceForm';
const mocks=vi.hoisted(()=>({order:vi.fn()}));
vi.mock('../../src/lib/supabaseClient',()=>({supabase:{from:()=>({select:()=>({order:mocks.order})})}}));
it('suggests exact community names without rewriting existing or custom organisers',async()=>{
 mocks.order.mockResolvedValue({data:[{name:'Exact Community'}]});const change=vi.fn();
 render(<RelationField field={{name:'organiser',label:'Hosted By',table:'community_network_groups',valueColumn:'name',labelColumn:'name',allowCustom:true}} value="Existing organiser" onChange={change}/>);
 await waitFor(()=>expect(document.querySelector('datalist option')?.value).toBe('Exact Community'));
 expect(screen.getByLabelText('Hosted By')).toHaveValue('Existing organiser');expect(change).not.toHaveBeenCalled();
 fireEvent.change(screen.getByLabelText('Hosted By'),{target:{value:'Exact Community'}});expect(change).toHaveBeenCalledWith('Exact Community');
 fireEvent.change(screen.getByLabelText('Hosted By'),{target:{value:'Another organiser'}});expect(change).toHaveBeenCalledWith('Another organiser');
});
