import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import SiteEditor from '../../../src/admin/site-editor/SiteEditor';
import { EMPTY_DRAFT, validateDraft, resolvedStyle, HOME_SECTIONS } from '../../../src/admin/site-editor/catalog';
afterEach(()=>{cleanup();localStorage.clear();});
function select(id, source) {
  const iframe=screen.getByTitle('Actual page canvas');
  act(()=>window.dispatchEvent(new MessageEvent('message',{origin:window.location.origin,source:source||iframe.contentWindow,data:{channel:'rtg-local-canvas',type:'select',id}})));
}
describe('Home visual editor foundation',()=>{
  it('opens a contextual inspector only for section selection from its own canvas',()=>{
    render(<SiteEditor />);select('why',window);
    expect(screen.queryByRole('heading',{name:'Why RTG'})).toBeNull();
    select('why');expect(screen.getByRole('heading',{name:'Why RTG'})).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Headline — line 1'})).toHaveValue('More Than Miles.');
  });
  it('preserves local edits when switching to an unsupported page and back',()=>{
    render(<SiteEditor />);select('why');
    fireEvent.change(screen.getByRole('textbox',{name:'Headline — line 1'}),{target:{value:'My work'}});
    fireEvent.change(screen.getByLabelText('Website page'),{target:{value:'/about'}});
    expect(screen.getByRole('note')).toHaveTextContent('not connected yet');
    fireEvent.change(screen.getByLabelText('Website page'),{target:{value:'/'}});
    expect(screen.getByRole('textbox',{name:'Headline — line 1'})).toHaveValue('My work');
  });
  it('saves only explicit local drafts and protects dirty work from reload',()=>{
    render(<SiteEditor />);select('why');
    fireEvent.change(screen.getByRole('textbox',{name:'Headline — line 1'}),{target:{value:'Saved work'}});
    expect(localStorage.length).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'Save Home locally'}));
    fireEvent.change(screen.getByRole('textbox',{name:'Headline — line 1'}),{target:{value:'Pending work'}});
    fireEvent.click(screen.getByRole('button',{name:'Load Home local draft'}));
    expect(screen.getByRole('group',{name:'Replace local edits'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Keep editing'}));
    expect(screen.getByRole('textbox',{name:'Headline — line 1'})).toHaveValue('Pending work');
    fireEvent.click(screen.getByRole('button',{name:'Load Home local draft'}));
    fireEvent.click(screen.getByRole('button',{name:'Replace edits'}));
    expect(screen.getByRole('textbox',{name:'Headline — line 1'})).toHaveValue('Saved work');
  });
  it('keeps shared chrome read-only and does not invent resource editors',()=>{
    render(<SiteEditor />);select('navigation');
    expect(screen.getByText(/Shared site element/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    select('training');expect(screen.getByText(/cards are read-only/)).toBeInTheDocument();
  });
  it('round trips independent mobile style overrides with no default background mutation',()=>{
    const draft=validateDraft({...EMPTY_DRAFT,sections:{why:{desktop:{headingSize:64},mobile:{headingSize:42}}}});
    expect(resolvedStyle(draft,'why','desktop')).toEqual({headingSize:64});
    expect(resolvedStyle(draft,'why','mobile')).toEqual({headingSize:42});
    expect(validateDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });
  it.each([
    {text:{'rider.result':'999'}}, {images:{heroCycling:'javascript:alert(1)'}},
    {sections:{navigation:{desktop:{headingSize:22}}}}, {sections:{why:{desktop:{headingSize:999}}}},
    {sections:{why:{desktop:{background:'url(evil)'}}}},
  ])('rejects unsupported or unsafe draft changes %j',change=>expect(()=>validateDraft({...EMPTY_DRAFT,...change})).toThrow());
  it('has stable section ids and preserves legacy Ridge drafts by rejecting them',()=>{
    expect(new Set(HOME_SECTIONS.map(s=>s.id)).size).toBe(HOME_SECTIONS.length);
    expect(()=>validateDraft({schema:1,name:'ridge',sections:[]})).toThrow();
  });
});

describe('Expanded native section controls',()=>{
  it('pairs sliders and numeric controls, preserves invalid edits, and separates mobile',()=>{
    render(<SiteEditor />);select('why');
    fireEvent.change(screen.getByRole('slider',{name:'textX slider'}),{target:{value:'36'}});
    expect(screen.getByRole('spinbutton',{name:'textX'})).toHaveValue(36);
    fireEvent.change(screen.getByRole('spinbutton',{name:'textX'}),{target:{value:'999'}});
    fireEvent.blur(screen.getByRole('spinbutton',{name:'textX'}));
    expect(screen.getByRole('spinbutton',{name:'textX'})).toHaveValue(36);
    fireEvent.click(screen.getByRole('button',{name:'Mobile'}));
    fireEvent.change(screen.getByRole('slider',{name:'textX slider'}),{target:{value:'12'}});
    fireEvent.click(screen.getByRole('button',{name:'Desktop'}));
    expect(screen.getByRole('spinbutton',{name:'textX'})).toHaveValue(36);
    fireEvent.click(screen.getByRole('button',{name:'Save Home locally'}));
    const saved=JSON.parse(localStorage.getItem('rtg:site-editor:home:local:v1'));
    expect(saved.sections.why).toEqual({desktop:{textX:36},mobile:{textX:12}});
    expect(saved.sections.why.desktop.background).toBeUndefined();
  });
  it('commits links on blur, rejecting unsafe protocols without losing valid prior value',()=>{
    render(<SiteEditor />);select('why');
    const field=screen.getByRole('textbox',{name:/Button link/});
    fireEvent.change(field,{target:{value:'/about'}});fireEvent.blur(field);
    const updated=screen.getByRole('textbox',{name:/Button link/});
    fireEvent.change(updated,{target:{value:'javascript:alert(1)'}});fireEvent.blur(updated);
    expect(updated).toHaveValue('/about');expect(screen.getByRole('alert')).toHaveTextContent('HTTPS');
  });
  it('offers real hero-only motion and image controls, including native shared CTA wording',()=>{
    render(<SiteEditor />);select('hero');
    expect(screen.getByRole('slider',{name:'motionDuration slider'})).toBeInTheDocument();
    expect(screen.getByRole('slider',{name:'imageX slider'})).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:/Button label.*Join Community/})).toBeInTheDocument();
    select('why');expect(screen.queryByRole('slider',{name:'motionDuration slider'})).toBeNull();
  });
  it('validates new enums and motion bounds while accepting old saved drafts',()=>{
    expect(validateDraft(EMPTY_DRAFT)).toEqual(EMPTY_DRAFT);
    for(const style of [{align:'stretch'},{buttonStyle:'url(evil)'},{motionDuration:10},{textX:Infinity}]) expect(()=>validateDraft({...EMPTY_DRAFT,sections:{hero:{desktop:style}}})).toThrow();
  });
});
