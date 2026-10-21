import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LayoutStudioAdmin from '../../../src/admin/pages/LayoutStudioAdmin';
import LayoutRenderer from '../../../src/components/layout/LayoutRenderer';
import { createLayout, isSafeLayoutAction, saveLocalDraft } from '../../../src/lib/layout/model';
vi.mock('../../../src/admin/components/AdminPageHeader', () => ({ default: ({ title }) => <h1>{title}</h1> }));
describe('layout editor', () => {
  it('labels browser-only saves and preserves independent mobile styles', () => {
    render(<MemoryRouter><LayoutStudioAdmin /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Mobile', exact: true }));
    fireEvent.change(screen.getByLabelText('Heading size'), { target: { value: '28' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save local draft' }));
    expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser only');
    fireEvent.click(screen.getByRole('button', { name: 'Desktop', exact: true }));
    expect(screen.getByLabelText('Heading size')).toHaveValue(52);
    expect(screen.queryByRole('button', { name: /^Publish/ })).not.toBeInTheDocument();
  });
  it('supports remove and undo while keeping at least one section', () => {
    render(<LayoutStudioAdmin />);
    expect(screen.getByRole('button', { name: 'Remove section' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Add section'), { target: { value: 'cta' } });
    expect(screen.getByRole('button', { name: 'Remove section' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remove section' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('button', { name: 'Remove section' })).toBeEnabled();
  });
  it('renders text safely and hides sections per device', () => {
    const doc = createLayout(); doc.sections[0].content.title = '<script>alert(1)</script>'; doc.sections[0].mobile.visible = false;
    const { container, rerender } = render(<LayoutRenderer document={doc} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument(); expect(container.querySelector('script')).toBeNull();
    rerender(<LayoutRenderer document={doc} device="mobile" />); expect(container.querySelector('section')).toBeNull();
  });
  it('separates shared draft save from publish and refuses publish after further edits', async () => {
    const doc = createLayout('Shared page');
    const store = { loadDraft: vi.fn().mockResolvedValue({ document: doc, revision: 3 }), saveDraft: vi.fn().mockResolvedValue({ revision: 4 }), publish: vi.fn().mockResolvedValue({ revision: 4 }) };
    render(<LayoutStudioAdmin store={store} />);
    expect(screen.getByRole('button', { name: 'Save shared draft' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Loaded shared draft'));
    fireEvent.change(screen.getByLabelText('Heading size'), { target: { value: '44' } });
    expect(screen.getByRole('button', { name: 'Publish saved revision' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Save shared draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Saved shared draft (not published)'));
    expect(store.publish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish saved revision' }));
    await waitFor(() => expect(store.publish).toHaveBeenCalledWith('ridge', 4));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Published saved revision'));
    fireEvent.change(screen.getByLabelText('Heading size'), { target: { value: '45' } });
    expect(screen.getByRole('button', { name: 'Publish saved revision' })).toBeDisabled();
  });
  it('preserves the draft and reports failed server save honestly', async () => {
    const store = { loadDraft: vi.fn().mockResolvedValue(null), saveDraft: vi.fn().mockRejectedValue(new Error('Store unavailable')) };
    render(<LayoutStudioAdmin store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No shared draft yet'));
    fireEvent.change(screen.getByLabelText('Heading size'), { target: { value: '44' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save shared draft' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Store unavailable'));
    expect(screen.getByLabelText('Heading size')).toHaveValue(44);
    expect(screen.getByRole('button', { name: 'Publish saved revision' })).toBeDisabled();
  });

  it('rejects protocol-relative, backslash-normalized and control-character action URLs', () => {
    expect(isSafeLayoutAction('/community/delhi')).toBe(true);
    for (const href of ['//evil.example', '/\\evil.example', '/\nevil.example', 'javascript:alert(1)', 'https://evil.example']) expect(isSafeLayoutAction(href)).toBe(false);
  });

  it('loads a pristine starter immediately with visible progress and prevents duplicate requests', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    let resolve;
    const store = { loadDraft: vi.fn(() => new Promise(done => { resolve = done; })) };
    render(<LayoutStudioAdmin store={store} />);
    const load = screen.getByRole('button', { name: 'Load shared draft' });
    act(() => { load.click(); load.click(); });
    expect(store.loadDraft).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading shared draft');
    expect(screen.getByRole('status').closest('fieldset')).toBeNull();
    await act(async () => resolve(null));
    expect(screen.getByRole('status')).toHaveTextContent('Use Save shared draft to create the first draft');
    expect(screen.getByRole('button', { name: 'Save shared draft' })).toBeEnabled();
  });

  it('explicitly confirms replacement of edits and preserves them on cancellation', async () => {
    const doc = createLayout(); doc.name = 'Shared replacement';
    const store = { loadDraft: vi.fn().mockResolvedValue({ document: doc, revision: 1 }) };
    render(<LayoutStudioAdmin store={store} />);
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'My local edits' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    expect(store.loadDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep current draft' }));
    expect(screen.getByRole('status')).toHaveTextContent('cancelled');
    expect(screen.getByLabelText('Page name')).toHaveValue('My local edits');
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replace with shared draft' }));
    await waitFor(() => expect(screen.getByLabelText('Page name')).toHaveValue('Shared replacement'));
    expect(store.loadDraft).toHaveBeenCalledTimes(1);
  });

  it('protects a restored browser-local draft even without new edits', () => {
    const local = createLayout(); local.name = 'Restored work';
    saveLocalDraft(window.localStorage, 'ridge', local);
    const store = { loadDraft: vi.fn() };
    render(<LayoutStudioAdmin store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    expect(screen.getByRole('group', { name: 'Replace current draft' })).toBeInTheDocument();
    expect(store.loadDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Page name')).toHaveValue('Restored work');
  });

  it('ignores late page responses and keeps the new page request in flight', async () => {
    const resolves = [];
    const store = { loadDraft: vi.fn(() => new Promise(resolve => resolves.push(resolve))) };
    const { rerender } = render(<LayoutStudioAdmin pageKey="ridge" store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    rerender(<LayoutStudioAdmin pageKey="communities" store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    const stale = createLayout(); stale.name = 'Old page';
    await act(async () => resolves[0]({ document: stale, revision: 5 }));
    expect(screen.getByLabelText('Page name')).not.toHaveValue('Old page');
    expect(screen.getByRole('status')).toHaveTextContent('Loading shared draft');
    expect(screen.getByRole('button', { name: 'Load shared draft' })).toBeDisabled();
    await act(async () => resolves[1](null));
    expect(screen.getByRole('status')).toHaveTextContent('No shared draft yet');
  });

  it('reports load failures visibly and permits an explicit retry', async () => {
    const store = { loadDraft: vi.fn().mockRejectedValueOnce(new Error('Request timed out')).mockResolvedValueOnce(null) };
    render(<LayoutStudioAdmin store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Request timed out'));
    expect(screen.getByRole('status')).toHaveTextContent('current draft kept');
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No shared draft yet'));
    expect(store.loadDraft).toHaveBeenCalledTimes(2);
  });

  it('requires reload after an uncertain mutation while preserving edited content', async () => {
    const error = Object.assign(new Error('Outcome unknown; reload before retry'), { uncertain: true });
    const store = { loadDraft: vi.fn().mockResolvedValue(null), saveDraft: vi.fn().mockRejectedValue(error) };
    render(<LayoutStudioAdmin store={store} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load shared draft' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save shared draft' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Page name'), { target: { value: 'Keep my content' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save shared draft' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Outcome unknown'));
    expect(screen.getByLabelText('Page name')).toHaveValue('Keep my content');
    expect(screen.getByRole('button', { name: 'Save shared draft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publish saved revision' })).toBeDisabled();
  });

});
