import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LayoutStudioAdmin from '../../../src/admin/pages/LayoutStudioAdmin';
import { createRidgeIntroLayout } from '../../../src/lib/layout/ridgeIntro';
vi.mock('../../../src/admin/components/AdminPageHeader', () => ({ default: () => <h1>Layout Studio</h1> }));
afterEach(() => { cleanup(); localStorage.clear(); });
const heading = () => screen.getByRole('spinbutton', { name: /^Heading size/ });
describe('numeric editing', () => {
  it('allows select-all replacement without committing intermediate values, and saves on blur before a click', async () => {
    const user = userEvent.setup();
    render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} />);
    await user.click(heading());
    await user.keyboard('{Control>}a{/Control}28');
    expect(heading()).toHaveValue(28);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Save local draft' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(Object.values(localStorage).some(v => v.includes('"size":28'))).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(heading()).toHaveValue(58);
  });
  it.each(['', '2', '101', '-1', '1e999'])('restores prior value for invalid input %j only on blur', value => {
    render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} />);
    fireEvent.change(heading(), { target: { value } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.blur(heading());
    expect(heading()).toHaveValue(58);
    expect(screen.getByRole('alert')).toHaveTextContent('between 16 and 100. Previous value kept.');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
  it('commits mobile on Enter, keeps desktop separate and supports inheritance', async () => {
    const user = userEvent.setup();
    render(<LayoutStudioAdmin initialDocument={createRidgeIntroLayout({})} />);
    await user.click(screen.getByRole('button', { name: 'Mobile', exact: true }));
    await user.clear(heading()); await user.type(heading(), '28{Enter}');
    expect(heading()).toHaveValue(28);
    await user.click(screen.getByRole('button', { name: 'Desktop', exact: true }));
    expect(heading()).toHaveValue(58);
    await user.click(screen.getByRole('button', { name: 'Mobile', exact: true }));
    expect(heading()).toHaveValue(28);
    await user.click(screen.getByRole('button', { name: 'Inherit Heading size' }));
    expect(heading()).toHaveValue(40);
  });
  it.each([['Body size', '18'], ['Padding', '24'], ['Grid gap', '12'], ['Columns', '3'], ['Section height', '0'], ['Image overlay', '0'], ['Image horizontal focus', '0'], ['Image vertical focus', '0']])('uses the same deferred validation for %s', (name, value) => {
    render(<LayoutStudioAdmin />);
    const field = screen.getByLabelText(name);
    fireEvent.change(field, { target: { value: '' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.change(field, { target: { value } }); fireEvent.blur(field);
    expect(screen.getByLabelText(name)).toHaveValue(Number(value));
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('rejects fractional columns without discarding the prior value', () => {
    render(<LayoutStudioAdmin />);
    const field = screen.getByLabelText('Columns'); const previous = field.value;
    fireEvent.change(field, { target: { value: '2.5' } }); fireEvent.blur(field);
    expect(field.value).toBe(previous);
    expect(screen.getByRole('alert')).toHaveTextContent('whole number');
  });
});
