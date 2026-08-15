import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, User, MapPin, Activity, Save, CheckCircle2, Calendar, Trophy, ArrowRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useUpcomingEvent, useRaceResults } from "../lib/publicData";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";

const StravaMark = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} {...props}>
    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066M9.395 0L3.638 11.61h3.462L9.6 6.859l2.5 4.751h3.467L9.395 0z" />
  </svg>
);

function LoggedOutPrompt() {
  const { requestLogin } = useAuthGate();
  return (
    <Section>
      <GlassCard className="max-w-md mx-auto text-center py-14">
        <User className="text-rtg-orange-400 mx-auto mb-4" size={32} />
        <h1 className="font-display text-3xl mb-2">Your Dashboard</h1>
        <p className="text-rtg-mist mb-8">Log in to view and edit your athlete profile.</p>
        <Button onClick={() => requestLogin("login")} size="lg">Log In</Button>
      </GlassCard>
    </Section>
  );
}

export default function Dashboard() {
  const { user, loading: sessionLoading } = useSession();
  const upcomingEvent = useUpcomingEvent();
  const raceResults = useRaceResults();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", city: "", sport: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setForm({
            full_name: data.full_name || "",
            city: data.city || "",
            sport: data.sport || "",
            bio: data.bio || "",
          });
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const { error: err } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || (user && loading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!user) return <LoggedOutPrompt />;

  const inputClass =
    "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/50 focus:outline-none focus:border-rtg-orange-400/60";

  const myResults = form.full_name
    ? raceResults.filter((r) => r.athleteName.trim().toLowerCase() === form.full_name.trim().toLowerCase())
    : [];

  return (
    <Section eyebrow="Member Dashboard" title={`Welcome, ${form.full_name || "Athlete"}`}>
      <div className="grid md:grid-cols-2 gap-5 max-w-4xl mx-auto mb-8">
        {upcomingEvent && (
          <Link to={`/events/${upcomingEvent.slug || upcomingEvent.id}`} className="group">
            <GlassCard className="h-full hover:border-rtg-orange-400/40 transition-colors">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-rtg-orange-400 font-semibold mb-2">
                <Calendar size={13} /> Upcoming Event
              </span>
              <p className="font-display text-xl mb-1">{upcomingEvent.title}</p>
              <p className="text-rtg-mist text-sm mb-3">{upcomingEvent.date}</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rtg-white group-hover:text-rtg-orange-400 transition-colors">
                View details <ArrowRight size={12} />
              </span>
            </GlassCard>
          </Link>
        )}
        <Link to="/race-results" className="group">
          <GlassCard className="h-full hover:border-rtg-orange-400/40 transition-colors">
            <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-rtg-orange-400 font-semibold mb-2">
              <Trophy size={13} /> Your Race Results
            </span>
            {myResults.length > 0 ? (
              <>
                <p className="font-display text-xl mb-1">{myResults.length} result{myResults.length > 1 ? "s" : ""} on record</p>
                <p className="text-rtg-mist text-sm mb-3">
                  Latest: {myResults[0].eventName} — {myResults[0].position || myResults[0].finishTime || "—"}
                </p>
              </>
            ) : (
              <p className="text-rtg-mist text-sm mb-3">
                No results under "{form.full_name || "your name"}" yet — they'll show up here once RTG posts them.
              </p>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rtg-white group-hover:text-rtg-orange-400 transition-colors">
              View all results <ArrowRight size={12} />
            </span>
          </GlassCard>
        </Link>
      </div>

      <h2 className="font-display text-2xl mb-4 max-w-4xl mx-auto">Athlete Profile</h2>
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <GlassCard className="md:col-span-1 text-center">
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(form.full_name || user.email)}&backgroundColor=f76b1c`}
            alt={form.full_name}
            className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-2 border-rtg-orange-400"
          />
          <p className="font-semibold text-rtg-white mb-1">{form.full_name || "Athlete"}</p>
          <p className="text-xs text-rtg-mist mb-4">{profile?.email || user.email}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-rtg-mist">
            {profile?.strava_athlete_id ? (
              <span className="inline-flex items-center gap-1.5 text-rtg-orange-400">
                <StravaMark /> Strava Connected
              </span>
            ) : (
              <span>No Strava connected</span>
            )}
          </div>
        </GlassCard>

        <GlassCard className="md:col-span-2">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <MapPin size={12} /> City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="e.g. Delhi"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Activity size={12} /> Sport
                </label>
                <input
                  type="text"
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                  placeholder="e.g. Cycling, Running"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
                placeholder="A little about your endurance journey..."
                className={`${inputClass} resize-y`}
              />
            </div>

            {error && <p className="text-sm text-rtg-orange-400">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold px-6 py-2.5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              {saved ? "Saved" : "Save Changes"}
            </button>
          </form>
        </GlassCard>
      </div>
    </Section>
  );
}
