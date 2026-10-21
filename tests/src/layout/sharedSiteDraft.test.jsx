import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SharedDraftControls from '../../../src/admin/site-editor/SharedDraftControls';
import { emptyDraft, wrapDraft } from '../../../src/lib/siteEditor/schema';
import { createSiteDraftStore } from '../../../src/lib/siteEditor/store';
afterEach(cleanup);
it('reads before saving, protects local edits and marks unknown saves without retry',async()=>{
 const draft=emptyDraft('/');const onReplace=vi.fn();const store={loadDraft:vi.fn().mockResolvedValue({revision:3,document:draft}),saveDraft:vi.fn().mockRejectedValue(Object.assign(new Error('Unknown outcome. Check shared draft.'),{uncertain:true}))};
 render(<SharedDraftControls store={store} page="/" draft={draft} onReplace={onReplace}/>);
 expect(screen.getByRole('button',{name:'Save shared draft'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Check shared draft'}));
 await screen.findByRole('group',{name:'Review shared draft'});expect(onReplace).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Keep local edits'}));fireEvent.click(screen.getByRole('button',{name:'Save shared draft'}));
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Unknown outcome'));expect(store.saveDraft).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Save shared draft'})).toBeDisabled();expect(onReplace).not.toHaveBeenCalled();
});
it('round trips a namespaced shared envelope and exposes no publish operation',async()=>{
 const draft=emptyDraft('/community');const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({layout:{page_key:'site/community',revision:2,document:wrapDraft(draft)}})});const store=createSiteDraftStore({getAccessToken:async()=>'test',fetcher});
 expect((await store.saveDraft('/community',draft,1)).document).toEqual(draft);expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({pageKey:'site/community',expectedRevision:1,document:{schema:1}});expect(store.publish).toBeUndefined();
});
it('rejects cross-page response instead of replacing user work',async()=>{
 const store=createSiteDraftStore({getAccessToken:async()=>'test',fetcher:async()=>({ok:true,json:async()=>({layout:{page_key:'site/lab',document:wrapDraft(emptyDraft('/lab')),revision:1}})})});await expect(store.loadDraft('/community')).rejects.toThrow('another page');
});
it.each([null,{page_key:'site/home',document:wrapDraft(emptyDraft('/')),revision:'invalid'}])('marks malformed successful save receipts uncertain: %j',async record=>{
 const store=createSiteDraftStore({getAccessToken:async()=>'test',fetcher:async()=>({ok:true,json:async()=>({layout:record})})});await expect(store.saveDraft('/',emptyDraft('/'),0)).rejects.toMatchObject({uncertain:true});
});
it('keeps edits made during an in-flight save and requires a read after conflict',async()=>{
 let finish;const original=emptyDraft('/about');const later={...original,text:{'text.about.hero.title':'Later local work'}};const onReplace=vi.fn();const store={loadDraft:vi.fn().mockResolvedValue(null),saveDraft:vi.fn().mockImplementation(()=>new Promise(r=>{finish=r;}))};
 const {rerender}=render(<SharedDraftControls store={store} page="/about" draft={original} onReplace={onReplace}/>);fireEvent.click(screen.getByRole('button',{name:'Check shared draft'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Save shared draft'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'Save shared draft'}));
 rerender(<SharedDraftControls store={store} page="/about" draft={later} onReplace={onReplace}/>);finish({revision:1,document:original});await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('revision 1'));expect(onReplace).not.toHaveBeenCalled();expect(store.saveDraft).toHaveBeenCalledWith('/about',original,0);
 store.saveDraft.mockRejectedValue(Object.assign(new Error('Changed elsewhere'),{status:409}));fireEvent.click(screen.getByRole('button',{name:'Save shared draft'}));await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Changed elsewhere'));expect(screen.getByRole('button',{name:'Save shared draft'})).toBeDisabled();expect(onReplace).not.toHaveBeenCalled();
});
