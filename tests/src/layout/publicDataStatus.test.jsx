import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { PublicDataStatusContext } from '../../../src/lib/publicDataStatus';
const fake=vi.hoisted(()=>({response:{data:[],error:null},select:vi.fn()}));
vi.mock('../../../src/lib/supabaseClient',()=>({isSupabaseConfigured:true,supabase:{from:()=>({select:(columns)=>{fake.select(columns);return Promise.resolve(fake.response);}})}}));
import { useSiteSettings, useSiteImages } from '../../../src/lib/publicData';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('uses existing settings reads and reports a successful current-source response',async()=>{
  fake.response={data:[{key:'text.home.why.titleLine1',value:'Current test title'}],error:null};
  const report=vi.fn(); const {result}=renderHook(()=>useSiteSettings(),{wrapper:({children})=><PublicDataStatusContext.Provider value={report}>{children}</PublicDataStatusContext.Provider>});
  await waitFor(()=>expect(result.current['text.home.why.titleLine1']).toBe('Current test title'));
  expect(fake.select).toHaveBeenCalledWith('key,value');expect(report).toHaveBeenCalledWith('site_settings','current overrides loaded');
});
it('merges current image overrides into native defaults',async()=>{
  fake.response={data:[{key:'heroCycling',url:'https://example.com/current.jpg'}],error:null};
  const report=vi.fn();const {result}=renderHook(()=>useSiteImages(),{wrapper:({children})=><PublicDataStatusContext.Provider value={report}>{children}</PublicDataStatusContext.Provider>});
  await waitFor(()=>expect(result.current.heroCycling).toBe('https://example.com/current.jpg'));
  expect(report).toHaveBeenCalledWith('site_images','current overrides loaded');
});
it('labels a failed read as fallback rather than current content',async()=>{
  fake.response={data:null,error:{message:'denied'}};const report=vi.fn();
  renderHook(()=>useSiteSettings(),{wrapper:({children})=><PublicDataStatusContext.Provider value={report}>{children}</PublicDataStatusContext.Provider>});
  await waitFor(()=>expect(report).toHaveBeenCalledWith('site_settings','fallback: read failed'));
});
