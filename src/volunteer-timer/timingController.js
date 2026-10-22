// Local protocol foundation only. No API endpoint or credentials are connected.
const allowed = new Set(['attendance', 'group_start', 'start', 'pass', 'end']);
export function assertTimingAssignment({ userId, assignment, command, now = Date.now() }) {
  if (!userId || !assignment || assignment.userId !== userId || assignment.revoked ||
      !Number.isFinite(assignment.expiresAt) || assignment.expiresAt <= now ||
      !assignment.sessionId || assignment.sessionId !== command?.sessionId ||
      !allowed.has(command?.type)) throw new Error('This timing action is not assigned to you.');
}

export function createTimingController({ transport, getAuthorization, initial, timeoutMs = 20000,
  now = Date.now, newId = () => crypto.randomUUID() }) {
  let value = { data: initial, busy: false, pending: null, message: '' };
  const listeners = new Set();
  const update = patch => { value = { ...value, ...patch }; listeners.forEach(fn => fn()); };
  const run = async (command, retry = false) => {
    if (value.busy) return false;
    if (value.pending && !retry) { update({message:'An earlier action is unconfirmed. Retry that action first.'}); return false; }
    const auth = getAuthorization((retry ? value.pending?.command : command)?.sessionId);
    const pending = retry ? value.pending : {
      userId: auth?.userId, binding:auth?.binding, createdAt:now(), requestId: newId(), version: value.data.version, command,
    };
    if (!pending) return false;
    try {
      if (pending.userId !== auth?.userId) throw new Error('The unconfirmed action belongs to another login.');
      if (pending.binding !== auth?.binding) throw new Error('The unconfirmed action belongs to another login session.');
      if (now()-pending.createdAt>1800000) throw new Error('Recovery expired. Ask the owner to reconcile this request before further timing.');
      assertTimingAssignment({ ...auth, command: pending.command, now: now() });
    } catch (error) { update({message:error.message}); return false; }
    update({busy:true, pending, message:'Saving…'});
    let timer;
    try {
      // Only the raced result is applied: a late completion cannot replace a
      // newer retry result. Same request ID/version/instant is retained.
      const result = await Promise.race([
        Promise.resolve().then(() => transport(pending)),
        new Promise((_, reject) => { timer=setTimeout(() => reject(new Error('Request timed out. Outcome is unconfirmed.')), timeoutMs); }),
      ]);
      if (getAuthorization(pending.command.sessionId)?.userId !== pending.userId || getAuthorization(pending.command.sessionId)?.binding !== pending.binding) {
        update({message:'Login changed. The outcome must be reconciled by the original operator.'}); return false;
      }
      update({data:result, pending:null, message:'Saved.'}); return true;
    } catch (error) {
      // Only an explicit non-commit rejection is safe to discard. Offline and
      // transport failures may follow a successful server commit.
      update({pending:error.definitive === true ? null : pending,
        message:error.definitive === true ? error.message : `${error.message} Retry the same action; do not start it again.`});
      return false;
    } finally { clearTimeout(timer); update({busy:false}); }
  };
  return {
    getSnapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    send: command => run(command), retry: () => run(null, true),
  };
}
