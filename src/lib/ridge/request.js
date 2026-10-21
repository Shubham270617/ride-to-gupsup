// A timeout/abort after dispatch cannot establish whether a timing write committed.
// Callers retain the original command and request ID for an explicit safe retry.
import {recoveryIdentity,ridgeRecovery} from './recovery';
export function createRidgeRequest({ getSession, fetcher = fetch, timeoutMs = 20000, recovery=ridgeRecovery }) {
  let lastReadOwner=null;
  async function request(body, signal, {retry=false}={}) {
    const controller = new AbortController();
    let dispatched = false, timer, abort, owner;
    const stopped = new Promise((_, reject) => {
      const stop = cancelled => {
        const error = new Error(body && dispatched
          ? 'This action is not confirmed. Retry the unconfirmed action to check/save it safely; do not enter it again.'
          : cancelled ? 'Ridge request cancelled. No new action was sent.'
            : 'Loading Ridge timed out. Your records are unchanged. Retry loading Ridge.');
        error.code = cancelled ? 'ridge_cancelled' : 'ridge_timeout';
        error.uncertain = Boolean(body && dispatched);
        error.dispatched = dispatched;
        controller.abort(); reject(error);
      };
      abort = () => stop(true);
      if (signal?.aborted) abort();
      else signal?.addEventListener('abort', abort, { once: true });
      timer = setTimeout(() => stop(false), timeoutMs);
    });
    const operation = async () => {
      const { data, error } = await getSession();
      if (controller.signal.aborted) throw new Error('Ridge request expired.');
      if (error || !data?.session) throw new Error('Please sign in to the website admin panel.');
      owner=recoveryIdentity(data.session);
      if(body){
        if(owner!==lastReadOwner)throw new Error('The login changed. Refresh Ridge records before any action.');
        recovery.begin(owner,body,retry);
      }
      dispatched = true;
      const response = await fetcher('/api/admin/ridge', {
        method: body ? 'POST' : 'GET', signal: controller.signal,
        headers: { Authorization: `Bearer ${data.session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json();
      if (!response.ok) { const failure = new Error(result.error || 'Could not load Ridge.'); failure.status = response.status || 500; throw failure; }
      return result;
    };
    try {
      const result=await Promise.race([stopped, operation()]);
      if(body)recovery.finish(owner,body.requestId);
      else {lastReadOwner=owner;return {...result,recovery:recovery.reviewed(owner)};}
      return result;
    }
    catch (error) {
      error.dispatched = dispatched;
      error.uncertain = Boolean(body && dispatched && (!error.status || error.status >= 500));
      if(body&&dispatched&&!error.uncertain)recovery.finish(owner,body.requestId);
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  request.identity=async()=>{const {data,error}=await getSession();if(error||!data?.session)throw new Error('Sign in before recording timing.');return recoveryIdentity(data.session);};
  request.restorePending=async body=>{const owner=await request.identity();if(owner!==lastReadOwner)throw new Error('Login changed. Refresh before recovery.');const existing=recovery.read(owner);if(!existing)recovery.begin(owner,body);else if(JSON.stringify(existing.body)!==JSON.stringify(body))throw new Error('Another unresolved action requires reconciliation.');};
  request.clearRecovery=()=>{if(!lastReadOwner)throw new Error('Refresh Ridge records first.');recovery.clear(lastReadOwner);};
  return request;
}
