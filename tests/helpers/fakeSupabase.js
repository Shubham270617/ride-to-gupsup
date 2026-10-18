import { vi } from "vitest";

// A small stand-in for the supabase-js client, enough for the server code
// under test. It never touches the network.
//
//   const db = createFakeSupabase();
//   db.on("profiles", { data: [{ id: "u1" }] }, { action: "select" });
//   db.on("profiles", (q) => ({ data: q.payload }), { action: "update", times: 1 });
//
// Every `.from(table)` call builds a query object that records what the code
// asked for (action, payload, filters, modifiers). When the query is awaited
// the first matching responder answers it; with no responder it resolves to
// { data: null, error: null }. All queries are kept in `db.queries` so a test
// can assert on exactly what was written and in what order.

const FILTERS = ["eq", "neq", "gt", "gte", "lt", "lte", "is", "not", "in", "like", "ilike", "match", "filter", "or", "contains"];

function makeQuery(table) {
  return {
    table,
    action: null, // select | insert | update | upsert | delete
    payload: undefined,
    options: undefined,
    columns: undefined, // what select() asked for
    selectOptions: undefined, // e.g. { count: "exact", head: true }
    returning: false, // .select() after a write
    filters: [],
    order: [],
    limit: undefined,
    range: undefined,
    single: false,
    maybeSingle: false,
    // `q.filter("eq", "email")` -> the value the code filtered on.
    filterValue(op, column) {
      return this.filters.find((f) => f.op === op && f.column === column)?.value;
    },
    hasFilter(op, column, value) {
      return this.filters.some(
        (f) => f.op === op && f.column === column && (arguments.length < 3 || Object.is(f.value, value) || f.value === value)
      );
    },
  };
}

export function createFakeSupabase() {
  const queries = [];
  const responders = [];

  function respond(q) {
    const idx = responders.findIndex(
      (r) => r.table === q.table && (!r.action || r.action === q.action) && (!r.match || r.match(q))
    );
    if (idx === -1) return { data: null, error: null };
    const r = responders[idx];
    r.times -= 1;
    if (r.times <= 0) responders.splice(idx, 1);
    const result = typeof r.result === "function" ? r.result(q) : r.result;
    return { data: null, error: null, ...result };
  }

  function builder(table) {
    const q = makeQuery(table);
    queries.push(q);
    let settled;
    const b = {
      select(columns, opts) {
        if (q.action) q.returning = true;
        else q.action = "select";
        q.columns = columns;
        q.selectOptions = opts;
        return b;
      },
      insert(payload, opts) {
        q.action = "insert";
        q.payload = payload;
        q.options = opts;
        return b;
      },
      update(payload, opts) {
        q.action = "update";
        q.payload = payload;
        q.options = opts;
        return b;
      },
      upsert(payload, opts) {
        q.action = "upsert";
        q.payload = payload;
        q.options = opts;
        return b;
      },
      delete(opts) {
        q.action = "delete";
        q.options = opts;
        return b;
      },
      order(column, opts) {
        q.order.push({ column, ...opts });
        return b;
      },
      limit(n) {
        q.limit = n;
        return b;
      },
      range(from, to) {
        q.range = [from, to];
        return b;
      },
      single() {
        q.single = true;
        return b;
      },
      maybeSingle() {
        q.maybeSingle = true;
        return b;
      },
      then(onFulfilled, onRejected) {
        if (!settled) settled = Promise.resolve().then(() => respond(q));
        return settled.then(onFulfilled, onRejected);
      },
    };
    for (const op of FILTERS) {
      b[op] = (column, ...rest) => {
        q.filters.push({ op, column, value: rest.length > 1 ? rest : rest[0] });
        return b;
      };
    }
    return b;
  }

  const storageRemove = vi.fn(async () => ({ data: [], error: null }));

  const db = {
    queries,
    from: vi.fn((table) => builder(table)),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: { message: "no user" } })),
      signInWithPassword: vi.fn(),
      admin: {
        updateUserById: vi.fn(),
        generateLink: vi.fn(),
        deleteUser: vi.fn(async () => ({ data: {}, error: null })),
      },
    },
    storage: {
      from: vi.fn(() => ({ remove: storageRemove })),
      remove: storageRemove,
    },
    // Register a responder. `result` is { data, error, count } or a function
    // of the query returning one. Options: action, match(q), times.
    on(table, result, { action, match, times = Infinity } = {}) {
      responders.push({ table, result, action, match, times });
      return db;
    },
    // Convenience: the queries for one table (and optionally one action).
    queriesFor(table, action) {
      return queries.filter((q) => q.table === table && (!action || q.action === action));
    },
    // Signs the given user in for auth.getUser(token).
    signIn(user, token = "good-token") {
      db.auth.getUser.mockImplementation(async (t) =>
        t === token ? { data: { user }, error: null } : { data: { user: null }, error: { message: "bad token" } }
      );
      return db;
    },
  };
  return db;
}
