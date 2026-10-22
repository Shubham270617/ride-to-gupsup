import { useEffect, useState } from "react";
import { ShieldCheck, Search, ShieldAlert, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";
import Pagination from "../components/Pagination";
import AdminPageHeader from "../components/AdminPageHeader";
import { ADMIN_EMAILS, normalizeEmail } from "../../../api-lib/adminEmails.js";

const PAGE_SIZE = 20;

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Every member who has ever signed up, in one place — how many there are,
// their contact info, when they last logged in, and whether they currently
// have admin access.
//
// Admin access is fixed to 3 email addresses (api-lib/adminEmails.js). Each
// gets its admin_profiles row the first time it signs in at /admin/login;
// nobody else can, so there is nothing to grant or revoke here.
export default function AdminsAdmin() {
  const { user } = useAdminSession();
  const [members, setMembers] = useState([]);
  const [adminIds, setAdminIds] = useState(new Set());
  const [resyncing, setResyncing] = useState(false);
  const [resyncNote, setResyncNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: profileRows }, { data: adminRows }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, phone, last_login_at, created_at").order("created_at", { ascending: false }),
      supabase.from("admin_profiles").select("id"),
    ]);
    setMembers(profileRows || []);
    setAdminIds(new Set((adminRows || []).map((r) => r.id)));
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Clears every connected member's sync watermark and starts walking their
  // Strava history again from today back to their first ever activity. The
  // request finishes as much as it can and the daily cron picks up the
  // rest, so this returning is not the same as the walk being complete.
  //
  // One request only gets ~40 seconds, so this keeps calling the endpoint
  // ("continue") until every member's history is in, showing progress as
  // it goes. Leaving the page just stops early — the daily cron finishes
  // whatever is left.
  const resyncStrava = async () => {
    const ok = await confirm({
      title: "Resync Strava histories?",
      message:
        "Every connected member's full history will be pulled from Strava again. Safe to run any time — it corrects and fills in missing rides rather than duplicating them. Keep this page open until it says it's finished (usually a few minutes).",
      confirmLabel: "Start resync",
    });
    if (!ok) return;
    setResyncing(true);
    setError("");
    setResyncNote("");
    const MAX_ROUNDS = 40;
    let pulled = 0;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const { data: sessionData } = await supabase.auth.getSession();
        const res = await fetch("/api/admin/strava-resync", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionData?.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: round === 0 ? "restart" : "continue" }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);

        const fetchedNow = (body?.results || []).reduce((n, r) => n + (r.fetched || 0), 0);
        const finishedNow = (body?.results || []).some((r) => r.done);
        pulled += fetchedNow;
        const remaining = body?.remaining;

        if (remaining === 0) {
          setResyncNote(`Done — every connected member's full Strava history is in (${pulled} activities pulled).`);
          return;
        }
        if (body?.rateLimited) {
          setResyncNote(
            `${pulled} activities pulled so far; ${remaining} member(s) still to finish. Strava's hourly limit was reached — press Resync Strava again in about 15 minutes, or the daily sync will finish it.`
          );
          return;
        }
        if (round > 0 && fetchedNow === 0 && !finishedNow) {
          setResyncNote(
            `${pulled} activities pulled so far; ${remaining} member(s) couldn't be synced right now (their Strava connection may need reconnecting). The daily sync will keep trying.`
          );
          return;
        }
        setResyncNote(`Syncing… ${pulled} activities pulled so far, ${remaining ?? "some"} member(s) still to finish. Keep this page open.`);
      }
      setResyncNote(`${pulled} activities pulled so far. Press Resync Strava again to continue — or the daily sync will finish it.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setResyncing(false);
    }
  };

  // Each fixed admin email, with the member account that signed in with it.
  const adminSlots = ADMIN_EMAILS.map((email) => {
    const member = members.find((m) => normalizeEmail(m.email) === email);
    return { email, member, active: Boolean(member && adminIds.has(member.id)) };
  });
  const activeAdmins = adminSlots.filter((slot) => slot.active).length;

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
      <AdminPageHeader
        title="Members"
        description={`Everyone who has ever signed up, when they last logged in, and whether they have admin access. Only the ${ADMIN_EMAILS.length} RTG admin email addresses can be admins.`}
        stats={[
          { label: "signed up", value: members.length },
          { label: `of ${ADMIN_EMAILS.length} admins signed in`, value: activeAdmins },
        ]}
        actions={
          <button
            onClick={resyncStrava}
            disabled={resyncing}
            title="Pull every connected member's full Strava history again"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw size={15} className={resyncing ? "animate-spin" : ""} />
            {resyncing ? "Resyncing…" : "Resync Strava"}
          </button>
        }
      />

      {/* ---------------------------------------------------------------
          The 3 fixed admin emails, and whether each has signed in yet.
          --------------------------------------------------------------- */}
      <div className="glass rounded-2xl p-5 mb-8 max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="font-display text-xl flex items-center gap-2">
            <ShieldCheck size={17} className="text-rtg-orange-400" /> Admin emails
          </h2>
          <span className="text-xs text-rtg-mist">
            {activeAdmins} of {ADMIN_EMAILS.length} signed in
          </span>
        </div>
        <p className="text-rtg-mist text-xs mb-4">
          Only these addresses can open the admin dashboard. Each becomes active the first time it signs in at /admin/login. To change the list, ask your developer — it is fixed in the code and the database.
        </p>

        <ul className="flex flex-col gap-2">
          {adminSlots.map(({ email, member, active }) => (
            <li
              key={email}
              className={`flex flex-wrap items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                active ? "bg-rtg-purple-950/[0.04] text-rtg-white" : "border border-dashed border-rtg-border text-rtg-mist"
              }`}
            >
              {active ? <ShieldCheck size={14} className="shrink-0 text-rtg-orange-600" /> : <ShieldAlert size={14} className="shrink-0" />}
              <span className="min-w-0 break-all">
                {email}
                {member?.full_name && <span className="text-xs text-rtg-mist"> · {member.full_name}</span>}
                {member && member.id === user?.id && <span className="text-xs text-rtg-mist"> (you)</span>}
              </span>
              <span className="ml-auto text-xs">{active ? "Active" : "Not signed in yet"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by name, email, or phone…"
          className="w-full rounded-full bg-white border border-rtg-border pl-11 pr-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15"
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
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-orange-600">
                          <ShieldCheck size={13} /> Admin
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
