import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Search, Loader2, Users } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";
import { useConfirm } from "../components/ConfirmDialog";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

// Every member who has ever signed up, in one place — how many there are,
// their contact info, when they last logged in, and a one-click way to
// grant (or revoke) admin access. Replaces the old email-search-only flow:
// now you just scroll/filter the full list instead of having to already
// know someone's exact email.
export default function AdminsAdmin() {
  const { user } = useAdminSession();
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [adminIds, setAdminIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

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

  const grantAdmin = async (member) => {
    setBusyId(member.id);
    setError("");
    try {
      const { error: err } = await supabase.from("admin_profiles").insert({ id: member.id, full_name: member.full_name });
      if (err) throw err;
      setAdminIds((prev) => new Set(prev).add(member.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter((m) => [m.full_name, m.email, m.phone].some((v) => v?.toLowerCase().includes(q)))
    : members;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl">Members</h1>
        <span className="inline-flex items-center gap-1.5 text-sm text-rtg-mist">
          <Users size={15} /> {members.length} signed up
        </span>
      </div>
      <p className="text-rtg-mist text-sm mb-6 max-w-2xl">
        Everyone who has ever signed up, when they last logged in, and whether they have admin access. Grant or
        remove admin access with one click — no SQL needed.
      </p>

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

      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : (
        <div className="glass rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-rtg-mist border-b border-white/10">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Phone</th>
                <th className="px-5 py-3 font-semibold">Last Login</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isAdmin = adminIds.has(m.id);
                return (
                  <tr key={m.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-rtg-white">
                      {m.full_name || "—"} {m.id === user?.id && <span className="text-rtg-mist">(you)</span>}
                    </td>
                    <td className="px-5 py-3 text-rtg-mist">{m.email || "—"}</td>
                    <td className="px-5 py-3 text-rtg-mist">{m.phone || "—"}</td>
                    <td className="px-5 py-3 text-rtg-mist">{formatDate(m.last_login_at)}</td>
                    <td className="px-5 py-3 text-rtg-mist">{formatDate(m.created_at)}</td>
                    <td className="px-5 py-3 text-right">
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
                      ) : (
                        <button
                          onClick={() => grantAdmin(m)}
                          disabled={busyId === m.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-rtg-orange-500/15 text-rtg-orange-300 px-3.5 py-1.5 hover:bg-rtg-orange-500/25 transition-colors disabled:opacity-60"
                        >
                          {busyId === m.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Make Admin
                        </button>
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
    </div>
  );
}
