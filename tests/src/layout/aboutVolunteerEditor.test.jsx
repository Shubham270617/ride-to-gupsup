import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import About from '../../../src/pages/About';
import Volunteer from '../../../src/pages/Volunteer';
import {sectionsFor} from '../../../src/admin/site-editor/catalog';
import {emptyDraft,validateDraft} from '../../../src/lib/siteEditor/schema';
vi.mock('../../../src/components/ui/Reveal',()=>({default:({children})=><div>{children}</div>,StaggerGroup:({children})=><div>{children}</div>,StaggerItem:({children})=><div>{children}</div>}));
afterEach(cleanup);
const section=(id,child)=><div key={id} data-testid={id}>{child}</div>;
it('reuses native About sections and propagates existing setting keys into nested Section headings',()=>{
 render(<MemoryRouter><About editor={{section,settings:{'text.about.howItStarted.title':'Origin review','text.about.mission':'Mission review','text.about.hero.title':'About review'}}}/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Origin review'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'About review'})).toBeInTheDocument();expect(screen.getByText('Mission review')).toBeInTheDocument();
 expect(sectionsFor('/about').filter(s=>!s.readOnly)).toHaveLength(9);
});
it('edits Volunteer presentation while preserving closed applications and no-payment commitment wording',()=>{
 render(<MemoryRouter><Volunteer roles={[]} editor={{section,settings:{'text.volunteer.hero.titleAccent':'community','text.volunteer.journey.buttonLabel':'Community review'}}}/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Make the community happen.'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Community review'})).toHaveAttribute('href','/community');
 expect(screen.getByText('Role preview · applications are not open yet.')).toBeInTheDocument();expect(screen.getByText(/No place or paid assignment is offered here/)).toBeInTheDocument();
 expect(sectionsFor('/volunteer').filter(s=>!s.readOnly)).toHaveLength(3);
});
it('rejects role, payment, recruitment-status and statistical overrides',()=>{
 for(const key of ['text.volunteer.roles.payment','text.volunteer.applications.open','text.about.motion.members'])expect(()=>validateDraft({...emptyDraft(key.includes('about')?'/about':'/volunteer'),text:{[key]:'changed'}})).toThrow();
});
