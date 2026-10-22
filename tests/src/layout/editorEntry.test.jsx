import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorEntry from '../../../src/admin/site-editor/EditorEntry';
const auth = vi.hoisted(()=>({allowed:false}));
vi.mock('../../../src/admin/ProtectedRoute',()=>({default:({children})=>auth.allowed?children:<p>Existing admin gate</p>}));
vi.mock('../../../src/admin/site-editor/SiteEditor',()=>({default:({canvasUrl})=><p>Editor uses {canvasUrl}</p>}));
vi.mock('../../../src/admin/site-editor/HomeCanvas',()=>({default:()=><p>Native canvas</p>}));
afterEach(()=>{cleanup();auth.allowed=false;});
describe('protected visual editor entry',()=>{
  it.each(['/admin/site-editor','/admin/site-canvas'])('keeps %s behind existing admin gate without mounting public App',async path=>{
    render(<MemoryRouter initialEntries={[path]}><EditorEntry><p>Public App side effects</p></EditorEntry></MemoryRouter>);
    expect(await screen.findByText('Existing admin gate')).toBeInTheDocument();
    expect(screen.queryByText('Public App side effects')).toBeNull();
  });
  it('connects the authorized editor to the same-origin protected canvas route',async()=>{
    auth.allowed=true;render(<MemoryRouter initialEntries={['/admin/site-editor']}><EditorEntry><p>Public App side effects</p></EditorEntry></MemoryRouter>);
    expect(await screen.findByText('Editor uses /admin/site-canvas')).toBeInTheDocument();
    expect(screen.queryByText('Public App side effects')).toBeNull();
  });
  it('preserves ordinary page and Ridge editor routing',()=>{
    render(<MemoryRouter initialEntries={['/admin/layout-studio']}><EditorEntry><p>Original App</p></EditorEntry></MemoryRouter>);
    expect(screen.getByText('Original App')).toBeInTheDocument();
  });
});
