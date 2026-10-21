import { afterEach, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import MultiPageEditor from '../../../src/admin/site-editor/MultiPageEditor';
import { emptyDraft, sectionsFor, validateDraft } from '../../../src/admin/site-editor/catalog';
afterEach(()=>{cleanup();localStorage.clear();});
function select(id,frame){act(()=>window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:frame.contentWindow,data:{channel:'rtg-local-canvas',type:'select',id}})));}
it('keeps unsaved Home and Community drafts isolated while switching pages',()=>{
 const {container}=render(<MultiPageEditor/>);
 let editor=container.querySelector('.cms-editor');select('why',editor.querySelector('iframe'));
 fireEvent.change(within(editor).getByRole('textbox',{name:'Headline — line 1'}),{target:{value:'Home pending'}});
 fireEvent.change(within(editor).getByLabelText('Website page'),{target:{value:'/community'}});
 editor=container.querySelectorAll('.cms-editor')[1];select('community-hero',editor.querySelector('iframe'));
 fireEvent.change(within(editor).getByRole('textbox',{name:'Headline — line 1'}),{target:{value:'Community pending'}});
 fireEvent.click(within(editor).getByRole('button',{name:'Save Community locally'}));
 expect(localStorage.getItem('rtg:site-editor:home:local:v1')).toBeNull();
 expect(JSON.parse(localStorage.getItem('rtg:site-editor:home:local:v1/community')).text['text.community.heroTitle']).toBe('Community pending');
 fireEvent.change(within(editor).getByLabelText('Website page'),{target:{value:'/'}});
 expect(screen.getByRole('textbox',{name:'Headline — line 1'})).toHaveValue('Home pending');
});
it('rejects cross-page fields and sections, preserves schema-compatible Home drafts',()=>{
 expect(validateDraft(emptyDraft('/'))).toEqual(emptyDraft('/'));
 expect(()=>validateDraft({...emptyDraft('/lab'),text:{'text.community.heroTitle':'wrong page'}})).toThrow();
 expect(()=>validateDraft({...emptyDraft('/community'),sections:{hero:{desktop:{headingSize:50}}}})).toThrow();
 expect(sectionsFor('/community').filter(s=>!s.readOnly)).toHaveLength(6);
 expect(sectionsFor('/lab').filter(s=>!s.readOnly)).toHaveLength(3);
 expect(sectionsFor('/lab').flatMap(s=>s.fields).some(f=>f.field==='heroText')).toBe(false);
});
it('honestly leaves Community detail unconnected without fabricating a group',()=>{
 render(<MultiPageEditor/>);fireEvent.change(screen.getByLabelText('Website page'),{target:{value:'/community/:communityId'}});
 expect(screen.getByRole('status')).toHaveTextContent('existing configured client');expect(screen.getByLabelText('Published community').options).toHaveLength(1);
});
