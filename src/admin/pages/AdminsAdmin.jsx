import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Search, Users, Plus, Trash2, ShieldAlert, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";
import { useConfirm } from "../components/ConfirmDialog";
import Pagination from "../components/Pagination";

const PAGE_SIZE = 20;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const MAX_ADMIN_SEATS = 3;

// Every member who has ever signed up, in one place — how many there are,
// their contact info, when they last logged in, and whether they currently
// have admin access.
//
// Admin access is an EMAIL ALLOWLIST (admin_allowed_emails), capped at 3
// simultaneous seats. Being on the list doesn't make someone an admin by
// itself — they still have to sign in once at /admin/login, at which point
// the seat is granted. Anyone NOT on the list is refused by the server
// (api/auth/claim-bootstrap-admin.js returns 403) and by the database
// (is_admin() re-checks the list on every single query), so removing an
// address here revokes access everywhere, immediately, no matter what the
// interface happens to be showing.
export default function AdminsAdmin() {
  const { user } = useAdminSession();
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [adminIds, setAdminIds] = useState(new Set());
  const [allowed, setAllowed] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [resyncNote, setResyncNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: profileRows }, { data: adminRows }, { data: allowRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, last_login_at, created_at").order("created_at", { ascending: false }),
      supabase.from("admin_profiles").select("id"),
      supabase.from("admin_allowed_emails").select("email, note, created_at").order("created_at", { ascending: true }),
    ]);
    setMembers(profileRows || []);
    setAdminIds(new Set((adminRows || []).map((r) => r.id)));
    setAllowed(allowRows || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const revokeAdmin = async (member) => {
    const ok = await confirm({
      title: "Remove admin access?",
      message: `${member.email || member.full_name} will lose access to the admin dashboard.`,
      confirmLabel: "Remove access",
    });
    if (!ok) return;
    setBusyId(member.id);
    setError("");
    try {
      const { error: err } = await supabase.from("admin_profiles").delete().eq("id", member.id);
      if (err) throw err;
      setAdminIds((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Clears every connected member's sync watermark and starts walking their
  // Strava history again from today back to their first ever activity. The
  // request finishes as much as it can and the daily cron picks up the
  // rest, so this returning is not the same as the walk being complete.
  const resyncStrava = async () => {
    const ok = await confirm({
      title: "Resync Strava histories?",
      message:
        "Every connected member's full history will be pulled from Strava again. Safe to run any time — it corrects and fills in missing rides rather than duplicating them. Large histories finish in the background over the next few hours.",
      confirmLabel: "Start resync",
    });
    if (!ok) return;
    setResyncing(true);
    setError("");
    setResyncNote("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/strava-resync", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData?.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
      const fetched = (body?.results || []).reduce((n, r) => n + (r.fetched || 0), 0);
      setResyncNote(
        `Queued ${body?.queued ?? 0} member(s); ${fetched} activities pulled so far. The rest continues in the background.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setResyncing(false);
    }
  };

  const addAllowedEmail = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAddBusy(true);
    setError("");
    try {
      const { error: err } = await supabase.from("admin_allowed_emails").insert({ email, note: `added by ${user?.email || "an admin"}` });
      if (err) throw err;
      setNewEmail("");
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddBusy(false);
    }
  };

  // Removing an address also drops any admin seat it currently holds —
  // otherwise the row would linger as a grant that is_admin() ignores,
  // which reads as "still an admin" on this screen while actually having
  // no access. Better that the two always agree.
  const removeAllowedEmail = async (row) => {
    const holder = members.find((m) => m.email?.toLowerCase() === row.email.toLowerCase());
    const ok = await confirm({
      title: "Remove from the admin allowlist?",
      message: `${row.email} will lose admin access immediately and won't be able to sign in to the dashboard again until re-added.`,
      confirmLabel: "Remove access",
    });
    if (!ok) return;
    setBusyId(row.email);
    setError("");
    try {
      if (holder && adminIds.has(holder.id)) {
        const { error: seatErr } = await supabase.from("admin_profiles").delete().eq("id", holder.id);
        if (seatErr) throw seatErr;
      }
      const { error: err } = await supabase.from("admin_allowed_emails").delete().eq("email", row.email);
      if (err) throw err;
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const allowedSet = new Set(allowed.map((a) => a.email.toLowerCase()));
  const seatsUsed = adminIds.size;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter((m) => [m.full_name, m.email, m.phone].some((v) => v?.toLowerCase().includes(q)))
    : members;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageMembers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Members</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-rtg-mist">
            <Users size={15} /> {members.length} signed up
          </span>
          <button
            onClick={resyncStrava}
            disabled={resyncing}
            title="Pull every connected member's full Strava history again"
            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/5 text-rtg-mist px-3.5 py-1.5 hover:text-rtg-orange-400 hover:bg-white/10 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={13} className={resyncing ? "animate-spin" : ""} />
            {resyncing ? "Resyncing…" : "Resync Strava"}
          </button>
        </div>
      </div>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Everyone who has ever signed up, when they last logged in, and whether they have admin access. Admin is
        limited to the {MAX_ADMIN_SEATS} email addresses on the allowlist below — anyone else is refused by the
        server, even if they open the admin address directly.
      </p>

      {/* ---------------------------------------------------------------
          The allowlist. This is the actual control over who can administer
          the site; the table underneath is just the member directory.
          --------------------------------------------------------------- */}
      <div className="glass rounded-2xl p-5 mb-8 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="font-display text-xl flex items-center gap-2">
            <ShieldCheck size={17} className="text-rtg-orange-400" /> Admin allowlist
          </h2>
          <span className="text-xs text-rtg-mist">
            {seatsUsed} of {MAX_ADMIN_SEATS} seats in use
          </span>
        </div>
        <p className="text-rtg-mist text-xs mb-4">
          Adding an address lets that person sign in at /admin/login — their seat is granted the first time they
          do. Removing one revokes their access straight away.
        </p>

        <ul className="flex flex-col gap-2 mb-4">
          {allowed.map((row) => {
            const holder = members.find((m) => m.email?.toLowerCase() === row.email.toLowerCase());
            const active = holder && adminIds.has(holder.id);
            return (
              <li
                key={row.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-2.5"
              >
                <span className="min-w-0 flex items-center gap-2 text-sm text-rtg-white break-all">
                  {active ? (
                    <ShieldCheck size={14} className="shrink-0 text-rtg-orange-300" />
                  ) : (
                    <ShieldAlert size={14} className="shrink-0 text-rtg-mist" />
                  )}
                  {row.email}
                  <span className="text-xs text-rtg-mist">{active ? "(signed in as admin)" : "(not signed in yet)"}</span>
                </span>
                <button
                  onClick={() => removeAllowedEmail(row)}
                  disabled={busyId === row.email}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/5 text-rtg-mist px-3.5 py-1.5 hover:text-rtg-orange-400 hover:bg-white/10 transition-colors disabled:opacity-60"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </li>
            );
          })}
          {allowed.length === 0 && !loading && (
            <li className="text-sm text-rtg-mist">
              Nobody is allowlisted — nobody can administer the site. Add an address to restore access.
            </li>
          )}
        </ul>

        <form onSubmit={addAllowedEmail} className="flex flex-wrap gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="name@example.com"
            className="min-w-0 flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
          />
          <button
            type="submit"
            disabled={addBusy || !newEmail.trim() || allowed.length >= MAX_ADMIN_SEATS}
            className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-full bg-rtg-orange-500/90 text-white px-5 py-2.5 hover:bg-rtg-orange-500 transition-colors disabled:opacity-50"
          >
            <Plus size={15} /> Add
          </button>
        </form>
        {allowed.length >= MAX_ADMIN_SEATS && (
          <p className="text-xs text-rtg-mist mt-2">
            The allowlist is full. Remove an address before adding another.
          </p>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, email, or phone…"
          className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
        />
      </div>

      {error && <p className="text-rtg-orange-400 text-sm mb-3">{error}</p>}
      {resyncNote && <p className="text-rtg-mist text-sm mb-3">{resyncNote}</p>}

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-rtg-mist border-b border-rtg-border">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Last Login</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="sticky right-0 bg-[var(--glass-bg)] px-5 py-3 font-semibold text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {pageMembers.map((m) => {
                const isAdmin = adminIds.has(m.id);
                return (
                  <tr key={m.id} className="border-b border-rtg-border last:border-0">
                    <td className="px-5 py-3 text-rtg-white">
                      {m.full_name || "—"} {m.id === user?.id && <span className="text-rtg-mist">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-rtg-mist">{m.email || "—"}</td>
                    <td className="px-5 py-3 text-rtg-mist">{m.phone || "—"}</td>
                    <td className="px-5 py-3 text-rtg-mist">{formatDate(m.last_login_at)}</td>
                    <td className="px-5 py-3 text-rtg-mist">{formatDate(m.created_at)}</td>
                    <td className="sticky right-0 bg-[var(--glass-bg)] shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.6)] px-5 py-3 text-right">
                      {isAdmin ? (
                        m.id === user?.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-orange-300">
                            <ShieldCheck size={13} /> Admin
                          </span>
                        ) : (
                          <button
                            onClick={() => revokeAdmin(m)}
                            disabled={busyId === m.id}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/5 text-rtg-mist px-3.5 py-1.5 hover:text-rtg-orange-400 hover:bg-white/10 transition-colors disabled:opacity-60"
                          >
                            <ShieldOff size={13} /> Revoke
                          </button>
                        )
                      ) : allowedSet.has((m.email || "").toLowerCase()) ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-mist">
                          <ShieldAlert size={13} /> Allowlisted
                        </span>
                      ) : (
                        <span className="text-xs text-rtg-mist">Member</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-rtg-mist">
                    No members match "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
