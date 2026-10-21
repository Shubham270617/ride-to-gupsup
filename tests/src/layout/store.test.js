import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLayoutStore } from '../../../src/lib/layout/store';
import { createLayout } from '../../../src/lib/layout/model';
afterEach(() => vi.useRealTimers());
describe('bounded shared layout requests', () => {
  it('times out hung session lookup and never dispatches after late resolution', async () => {
    vi.useFakeTimers(); let resolve; const fetcher = vi.fn();
    const store = createLayoutStore({ getAccessToken: () => new Promise(r => { resolve = r; }), fetcher, requestTimeoutMs: 20 });
    const result = store.loadDraft('ridge').catch(e => e);
    await vi.advanceTimersByTimeAsync(20);
    expect((await result).message).toMatch(/Loading timed out/);
    resolve('late-token'); await Promise.resolve();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('aborts hung read and permits an explicit fresh retry', async () => {
    vi.useFakeTimers(); let signal;
    const fetcher = vi.fn().mockImplementationOnce((_, options) => { signal = options.signal; return new Promise(() => {}); }).mockResolvedValue({ ok: true, json: async () => ({ layout: null }) });
    const store = createLayoutStore({ getAccessToken: async () => 'token', fetcher, requestTimeoutMs: 20 });
    const result = store.loadDraft('ridge').catch(e => e); await vi.advanceTimersByTimeAsync(20);
    expect((await result).uncertain).toBe(false); expect(signal.aborted).toBe(true);
    expect(await store.loadDraft('ridge')).toBeNull(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('bounds a hung response body and marks timed-out mutation outcome unknown', async () => {
    vi.useFakeTimers(); const fetcher = vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    const store = createLayoutStore({ getAccessToken: async () => 'token', fetcher, requestTimeoutMs: 20 });
    const result = store.saveDraft('ridge', createLayout(), 0).catch(e => e); await vi.advanceTimersByTimeAsync(20);
    const error = await result; expect(error.uncertain).toBe(true); expect(error.message).toMatch(/outcome is unknown/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('marks network loss after publish as uncertain, without retrying', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network lost'));
    const store = createLayoutStore({ getAccessToken: async () => 'token', fetcher });
    await expect(store.publish('ridge', 1)).rejects.toMatchObject({ uncertain: true });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
