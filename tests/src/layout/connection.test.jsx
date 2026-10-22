import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createAuthenticatedLayoutStore, approvedPublishedRidgeLayout, ridgeLayoutSectionData } from '../../../src/lib/layout/connection';
import usePublishedRidgeLayout from '../../../src/lib/layout/usePublishedRidgeLayout';
import { createLayout, createSection } from '../../../src/lib/layout/model';
const snapshot = () => ({ page_key: 'ridge', document: createLayout('Ridge'), revision: 1, published_at: '2026-10-21T09:00:00Z' });
describe('real layout connection boundaries', () => {
  it('uses current session access token for protected draft reads, never a supplied user ID', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ layout: null }) });
    const client = { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'session-token' } } }) } };
    await createAuthenticatedLayoutStore(client, fetcher).loadDraft('ridge');
    expect(fetcher).toHaveBeenCalledWith('/api/admin/page-layouts?action=draft&pageKey=ridge', expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } }));
    expect(client.auth.getSession).toHaveBeenCalledOnce();
  });
  it('fails closed with missing client/session and does not make a request', async () => {
    expect(createAuthenticatedLayoutStore(null)).toBeNull();
    const fetcher = vi.fn(); const client = { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } };
    await expect(createAuthenticatedLayoutStore(client, fetcher).saveDraft('ridge', createLayout(), 0)).rejects.toThrow('sign in');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects draft-like, wrong-page, malformed and invalid-revision responses', () => {
    for (const record of [{ ...snapshot(), published_at: null }, { ...snapshot(), page_key: 'home' }, { ...snapshot(), revision: 0 }, { ...snapshot(), document: { schema: 9 } }]) expect(approvedPublishedRidgeLayout(record)).toBeNull();
    expect(approvedPublishedRidgeLayout(snapshot()).name).toBe('Ridge');
  });
  it('does not request layouts while disabled', async () => {
    const store = { loadPublished: vi.fn() }; const { result } = renderHook(() => usePublishedRidgeLayout({ enabled: false, store }));
    expect(result.current.document).toBeNull(); expect(store.loadPublished).not.toHaveBeenCalled();
  });
  it.each([404, 503, 403])('retains existing page when published layout returns %s', async status => {
    const store = { loadPublished: vi.fn().mockRejectedValue(Object.assign(new Error('unavailable'), { status })) };
    const { result } = renderHook(() => usePublishedRidgeLayout({ enabled: true, store }));
    await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.document).toBeNull(); expect(store.loadPublished).toHaveBeenCalledWith('ridge');
  });
  it('only returns validated published snapshots', async () => {
    const record = snapshot(); const store = { loadPublished: vi.fn().mockResolvedValue(record) };
    const { result } = renderHook(() => usePublishedRidgeLayout({ enabled: true, store }));
    await waitFor(() => expect(result.current.document).toEqual(record.document));
  });
  it('ignores an in-flight result after access is disabled', async () => {
    let resolve; const store = { loadPublished: vi.fn(() => new Promise(r => { resolve = r; })) };
    const { result, rerender } = renderHook(({ enabled }) => usePublishedRidgeLayout({ enabled, store }), { initialProps: { enabled: true } });
    await waitFor(() => expect(store.loadPublished).toHaveBeenCalledOnce());
    rerender({ enabled: false }); await act(async () => resolve(snapshot())); expect(result.current.document).toBeNull();
  });
  it('ignores late responses after unmount', async () => {
    let resolve; const store = { loadPublished: vi.fn(() => new Promise(r => { resolve = r; })) };
    const { unmount } = renderHook(() => usePublishedRidgeLayout({ enabled: true, store }));
    await waitFor(() => expect(store.loadPublished).toHaveBeenCalledOnce()); unmount(); await act(async () => resolve(snapshot()));
  });
  it('maps actual feed totals and persisted awards, and stays empty before data access', () => {
    const doc = createLayout(); doc.sections.push(createSection('stats', 'counts'), createSection('spotlight', 'winners'));
    const input = { feed: { sessions: [{ slug: 'today', riders: [{ athleteId: 'a', laps: 3 }, { athleteId: 'b', laps: 2 }] }] }, officialAwards: [{ slug: 'progress', name: 'Progress', winners: ['Actual rider'] }] };
    expect(ridgeLayoutSectionData(doc, input)).toEqual({});
    const mapped = ridgeLayoutSectionData(doc, { ...input, dataReady: true });
    expect(mapped.counts.items.map(i => i.value)).toEqual(['1', '2', '5']); expect(mapped.winners.items[0].name).toBe('Actual rider');
    expect(ridgeLayoutSectionData(doc, { ...input, officialAwards: [], dataReady: true }).winners.items).toEqual([]);
  });
});
