import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { createRidgeIntroLayout } from '../../../src/lib/layout/ridgeIntro';
import { validateLayout, updateSectionStyle, saveLocalDraft } from '../../../src/lib/layout/model';
import LayoutStudioAdmin from '../../../src/admin/pages/LayoutStudioAdmin';
import LayoutRenderer from '../../../src/components/layout/LayoutRenderer';
vi.mock('../../../src/admin/components/AdminPageHeader', () => ({ default: () => <h1>Layout Studio</h1> }));
afterEach(() => { cleanup(); localStorage.clear(); });
const settings = { 'text.ridge.title': 'From site settings', 'text.ridge.eyebrow': 'Existing eyebrow', 'text.ridge.introLine': 'Existing intro', 'text.ridge.formatLine': '{km} km · {loops} loops · {total} km', 'text.ridge.loopKm': '9.15', 'text.ridge.maxLoops': '5', 'text.ridge.artCaption': 'Existing loop caption' };
describe('Ridge intro editing', () => {
  it.each(['during', 'after'])('uses settings arriving %s an empty shared load without losing create access', async timing => {
    let finish;
    const store = { loadDraft: vi.fn(() => new Promise(resolve => { finish = resolve; })), saveDraft: vi.fn(), publish: vi.fn() };
    const { rerender } = render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    if (timing === 'during') rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout(settings)} store={store} />);
    await act(async () => finish(null));
    if (timing === 'after') rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout(settings)} store={store} />);
    expect(screen.getByLabelText('Heading (shared)')).toHaveValue('From site settings');
    expect(screen.getByRole('button', { name: 'Save shared draft' })).toBeEnabled();
    expect(store.saveDraft).not.toHaveBeenCalled();
  });
  it('seeds all native content and loop artwork from the page resolver and round trips it', () => {
    const doc = createRidgeIntroLayout(settings);
    expect(validateLayout(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    expect(doc.sections[0].content).toEqual({ eyebrow: 'Existing eyebrow', title: 'From site settings', body: 'Existing intro', formatLine: '9.15 km · 5 loops · 45.75 km', artCaption: 'Existing loop caption', loops: '5' });
    const { container } = render(<LayoutRenderer document={doc} device="desktop" />);
    expect(screen.getByRole('heading', { name: 'From site settings.' })).toBeInTheDocument();
    expect(container.querySelectorAll('.rr-format-art > span')).toHaveLength(5);
    expect(container.querySelector('.rr-intro')).toBeInTheDocument();
    expect(container.querySelector('.rr-results')).toBeNull();
  });
  it('keeps desktop and mobile typography independent', () => {
    const doc = updateSectionStyle(createRidgeIntroLayout(settings), 'ridge-intro', 'mobile', 'size', 29);
    const { container, rerender } = render(<LayoutRenderer document={doc} device="mobile" />);
    expect(container.querySelector('.rr-intro').style.getPropertyValue('--ridge-title-size')).toBe('29px');
    rerender(<LayoutRenderer document={doc} device="desktop" />);
    expect(container.querySelector('.rr-intro').style.getPropertyValue('--ridge-title-size')).toBe('');
  });
  it('hydrates pristine settings but never replaces edits with a late seed', () => {
    const { rerender } = render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} />);
    rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout(settings)} />);
    expect(screen.getByLabelText('Heading (shared)')).toHaveValue('From site settings');
    fireEvent.change(screen.getByLabelText('Heading (shared)'), { target: { value: 'My pending edit' } });
    rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({ ...settings, 'text.ridge.title': 'Late response' })} />);
    expect(screen.getByLabelText('Heading (shared)')).toHaveValue('My pending edit');
  });
  it('preserves saved browser-local drafts ahead of the site seed', () => {
    const doc = createRidgeIntroLayout({ ...settings, 'text.ridge.title': 'Local work' });
    saveLocalDraft(localStorage, 'ridge', doc);
    const { rerender } = render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout(settings)} />);
    rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} />);
    expect(screen.getByLabelText('Heading (shared)')).toHaveValue('Local work');
  });
  it('preserves loaded shared work on late settings and never writes automatically', async () => {
    const doc = createRidgeIntroLayout({ ...settings, 'text.ridge.title': 'Shared work' });
    const store = { loadDraft: vi.fn().mockResolvedValue({ document: doc, revision: 2 }), saveDraft: vi.fn(), publish: vi.fn() };
    const { rerender } = render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout(settings)} store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByLabelText('Heading (shared)')).toHaveValue('Shared work'));
    rerender(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} store={store} />);
    expect(screen.getByLabelText('Heading (shared)')).toHaveValue('Shared work');
    expect(store.saveDraft).not.toHaveBeenCalled();
    expect(store.publish).not.toHaveBeenCalled();
  });
});
