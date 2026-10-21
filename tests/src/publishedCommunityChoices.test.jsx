import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,renderHook,waitFor} from '@testing-library/react';
import {usePublishedCommunityChoices} from '../../src/lib/communityDetails';
const mocks=vi.hoisted(()=>({from:vi.fn()}));
vi.mock('../../src/lib/supabaseClient',()=>({supabase:{from:mocks.from},isSupabaseConfigured:true}));
afterEach(cleanup);
it('lists only returned published UUIDs and does not invent fallback choices',async()=>{
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockResolvedValue({data:[{id:'11111111-1111-4111-8111-111111111111',name:'Published test fixture'},{id:'placeholder',name:'Invalid'}]})};mocks.from.mockReturnValue(q);
 const {result}=renderHook(()=>usePublishedCommunityChoices());await waitFor(()=>expect(result.current.loading).toBe(false));
 expect(result.current.items).toHaveLength(1);expect(q.select).toHaveBeenCalledWith('id,name');expect(q.eq).toHaveBeenCalledWith('published',true);
});
it('shows empty/error state when the existing read fails',async()=>{
 const q={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),order:vi.fn().mockResolvedValue({error:{message:'offline'}})};mocks.from.mockReturnValue(q);
 const {result}=renderHook(()=>usePublishedCommunityChoices());await waitFor(()=>expect(result.current.loading).toBe(false));expect(result.current.items).toEqual([]);expect(result.current.error).toMatch(/could not/);
});
