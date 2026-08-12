import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Search, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import useAdminSession from "../useAdminSession";

export default function AdminsAdmin() {
  const { user } = useAdminSession();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const loadAdmins = async () => {
    setLoading(true);
    const { data: adminRows } = await supabase
      .from("admin_profiles")
      .select("id, full_name, created_at")
      .order("created_at");
    const ids = (adminRows || []).map((r) => r.id);
    const profileMap = {};
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, email").in("id", ids);
      (profs || []).forEach((p) => {
        profileMap[p.id] = p.email;
      });
    }
    setAdmins((adminRows || []).map((r) => ({ ...r, email: profileMap[r.id] })));
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", `%${query.trim()}%`)
      .limit(10);
    if (err) setError(err.message);
    setResults(data || []);
    setSearching(false);
  };

  const grantAdmin = async (member) => {
    setBusyId(member.id);
    setError("");
    try {
      const { error: err } = await supabase
        .from("admin_profiles")
        .insert({ id: member.id, full_name: member.full_name });
      if (err) throw err;
      await loadAdmins();
      setResults((r) => r.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const revokeAdmin = async (admin) => {
    if (!window.confirm(`Remove admin access for ${admin.email || admin.full_name}?`)) return;
    setBusyId(admin.id);
    setError("");
    try {
      const { error: err } = await supabase.from("admin_profiles").delete().eq("id", admin.id);
      if (err) throw err;
      await loadAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const adminIds = new Set(admins.map((a) => a.id));

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Admins</h1>
      <p className="text-rtg-mist text-sm mb-8 max-w-2xl">
        Anyone with admin access can manage every part of the site. Search for a member by email to grant them
        access — they must already have an RTG account.
      </p>

      <div className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-4">Grant Admin Access</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members by email…"
              className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : "Search"}
          </button>
        </form>

        {error && <p className="text-rtg-orange-400 text-sm mb-3">{error}</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-rtg-white">{m.full_name || "—"}</p>
                  <p className="text-xs text-rtg-mist">{m.email}</p>
                </div>
                {adminIds.has(m.id) ? (
                  <span className="text-xs text-rtg-mist">Already admin</span>
                ) : (
                  <button
                    onClick={() => grantAdmin(m)}
                    disabled={busyId === m.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-rtg-orange-500/15 text-rtg-orange-300 px-3.5 py-1.5 hover:bg-rtg-orange-500/25 transition-colors disabled:opacity-60"
                  >
                    <ShieldCheck size={13} /> Make Admin
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-rtg-mist mb-4">Current Admins</h2>
      {loading ? (
        <p className="text-rtg-mist text-sm">Loading…</p>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
              <div>
                <p className="text-sm text-rtg-white">
                  {a.full_name || a.email || "—"} {a.id === user?.id && <span className="text-rtg-mist">(you)</span>}
                </p>
                <p className="text-xs text-rtg-mist">{a.email}</p>
              </div>
              {a.id !== user?.id && (
                <button
                  onClick={() => revokeAdmin(a)}
                  disabled={busyId === a.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-white/5 text-rtg-mist px-3.5 py-1.5 hover:text-rtg-orange-400 hover:bg-white/10 transition-colors disabled:opacity-60"
                >
                  <ShieldOff size={13} /> Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
