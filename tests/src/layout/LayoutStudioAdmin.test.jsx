import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LayoutStudioAdmin from '../../../src/admin/pages/LayoutStudioAdmin';
import LayoutRenderer from '../../../src/components/layout/LayoutRenderer';
import { createLayout, isSafeLayoutAction } from '../../../src/lib/layout/model';
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
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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
    vi.spyOn(window, 'confirm').mockReturnValue(true);
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

});
