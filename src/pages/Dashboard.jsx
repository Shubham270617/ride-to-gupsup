import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, User, MapPin, Activity, Save, CheckCircle2, Package, AlertTriangle, Camera, Sparkles, BadgeCheck, ArrowUpRight, Mail, Phone, Cake, AtSign, Droplet, ShieldAlert } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import { useAuthGate } from "../lib/AuthGateContext";
import { useMyStravaActivities, useMyLeaderboardStats } from "../lib/publicData";
import { useMyMemberships, isActiveClub } from "../lib/labData";
import { GENDERS, RIDER_TYPES, RIDE_FREQUENCIES, ageFromDob } from "../lib/profileFields";
import useAuthProviders from "../lib/useAuthProviders";
import Section from "../components/ui/Section";
import GlassCard from "../components/ui/GlassCard";
import Button from "../components/ui/Button";
import { uploadToSupabaseStorage } from "../lib/supabaseUpload";
import { announceAvatar } from "../lib/useMyAvatar";
import { ConnectWithStrava, StravaLogo } from "../components/lab/StravaBrand";

const ORDER_STATUS = {
  pending_verification: { label: "Pending Verification", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  shipped: { label: "Shipped", className: "bg-blue-100 text-blue-800" },
  delivered: { label: "Delivered", className: "bg-rtg-orange-500/15 text-rtg-orange-600" },
};

// A membership or Ridge pack bought on /membership — an admin marks it
// active once the UPI payment is checked.
const MEMBERSHIP_STATUS = {
  pending_verification: { label: "Pending Verification", className: "bg-amber-100 text-amber-800" },
  active: { label: "Active", className: "bg-green-100 text-green-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  expired: { label: "Expired", className: "bg-rtg-purple-600/10 text-rtg-mist" },
  cancelled: { label: "Cancelled", className: "bg-rtg-purple-600/10 text-rtg-mist" },
};

function formatPrice(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function formatKm(meters) {
  return `${(Number(meters || 0) / 1000).toFixed(1)} km`;
}

// Strava's name and button on this page are Strava's own artwork
// (components/lab/StravaBrand.jsx) — never a redrawn mark or a look-alike
// button.
const STRAVA_LOGO_ALT = "Strava";
const STRAVA_CONNECT_ALT = "Connect with Strava";

// One answer out of a few — the same chips as the sign-up form.
function ChipChoice({ label, options, value, onChange }) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => onChange(opt)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              value === opt
                ? "border-rtg-orange-500 bg-rtg-orange-500 text-white shadow-md shadow-rtg-orange-500/25"
                : "border-rtg-purple-600/20 bg-white text-rtg-white/80 hover:border-rtg-orange-400"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// The profile columns the member can edit here, as the form holds them.
const EMPTY_FORM = {
  full_name: "",
  city: "",
  sport: "",
  bio: "",
  avatar_url: "",
  dob: "",
  age: "",
  gender: "",
  rider_type: "",
  ride_frequency: "",
  instagram_id: "",
  blood_group: "",
  emergency_contact: "",
  medical_conditions: "",
  join_reason: "",
};

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

const STRAVA_NOTICES = {
  connected: { text: "Strava connected!", tone: "good" },
  already_linked: { text: "That Strava account is already connected to a different RTG member.", tone: "bad" },
  error: { text: "Couldn't connect Strava — please try again.", tone: "bad" },
};

export default function Dashboard() {
  const { user, loading: sessionLoading } = useSession();
  const myStravaActivities = useMyStravaActivities(user?.id);
  const myLeaderboardStats = useMyLeaderboardStats(user?.id);
  const myMemberships = useMyMemberships(user?.id);
  const clubMember = isActiveClub(myMemberships);
  const authProviders = useAuthProviders();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [deleteStep, setDeleteStep] = useState("idle"); // idle | confirming | deleting
  const [deleteError, setDeleteError] = useState("");
  const [connectingStrava, setConnectingStrava] = useState(false);
  const [myOrders, setMyOrders] = useState([]);

  // Landed back here from api/auth/strava/callback.js after a "Connect
  // Strava" attempt — show what happened once, then drop the param from
  // the URL so refreshing the page doesn't keep re-showing the same
  // message. Captured into state on mount, since the effect below removes
  // the param that stravaNotice would otherwise keep re-reading.
  const [stravaNotice] = useState(() => STRAVA_NOTICES[searchParams.get("strava")]);
  useEffect(() => {
    if (!searchParams.get("strava")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("strava");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setMyOrders(data || []));
  }, [user]);

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
          // Every editable column, blank where the member has not answered.
          setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, data[k] == null ? "" : String(data[k])])));
        }
        setLoading(false);
      });
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const { url } = await uploadToSupabaseStorage(file, "avatar", null, { ownAvatar: true });
      setForm((f) => ({ ...f, avatar_url: url }));
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      announceAvatar(url); // the navbar's account button shows it straight away
    } catch (err) {
      setAvatarError(err.message || "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      // Blank answers are saved as "no answer", not as empty text or 0.
      const updates = { ...form, dob: form.dob || null, age: form.age ? Number(form.age) : null, medical_conditions: form.medical_conditions || null, join_reason: form.join_reason || null };
      const { error: err } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteStep("deleting");
    setDeleteError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Couldn't delete your account. Please try again.");
      }
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleteStep("confirming");
    }
  };

  // Links Strava to this existing account — never signs the browser into a
  // different session (see api/auth/[provider]/connect-start.js). Strava
  // redirects the browser away and back on its own, so this doesn't set
  // connectingStrava back to false on success — only on a failure that
  // never leaves the page.
  const handleConnectStrava = async () => {
    setConnectingStrava(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/auth/strava/connect-start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("not_ok");
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setConnectingStrava(false);
    }
  };

  if (sessionLoading || (user && loading)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-rtg-ink">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  if (!user) return <LoggedOutPrompt />;

  const inputClass =
    "w-full rounded-xl bg-white border border-rtg-purple-600/20 px-4 py-2.5 text-sm text-rtg-white placeholder:text-rtg-mist/60 shadow-[0_1px_2px_rgba(53,36,111,0.05)] focus:outline-none focus:border-rtg-orange-400 focus:ring-2 focus:ring-rtg-orange-400/15";
  const labelClass = "flex items-center gap-1.5 text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5";

  const name = form.full_name || "Athlete";
  const stravaLinked = Boolean(profile?.strava_athlete_id);
  const hasStats = Boolean(myLeaderboardStats && myLeaderboardStats.activity_count > 0);
  const joinedOn = profile?.community_joined_at || profile?.created_at;
  const shortDate = (value, withYear = true) =>
    new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });

  return (
    <div className="dash">
      {/* ---- Banner: who you are, at a glance ---- */}
      <header className="dash-hero theme-night">
        <div className="dash-hero-inner">
          <label className="dash-avatar group" title="Change your photo">
            <img
              src={form.avatar_url || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(form.full_name || user.email)}&backgroundColor=f76b1c`}
              alt={name}
            />
            <span className="dash-avatar-edit">{avatarUploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={avatarUploading} />
          </label>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-rtg-orange-300">Member Dashboard</span>
            <h1 className="font-display text-4xl leading-[0.95] text-white sm:text-5xl md:text-6xl">
              Welcome, <span className="text-rtg-orange-400">{name}</span>
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {form.city && (
                <span className="dash-chip">
                  <MapPin size={12} /> {form.city}
                </span>
              )}
              {form.sport && (
                <span className="dash-chip">
                  <Activity size={12} /> {form.sport}
                </span>
              )}
              {joinedOn && (
                <span className="dash-chip">
                  <Sparkles size={12} /> Member since {new Date(joinedOn).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </span>
              )}
              {clubMember && (
                <span className="dash-chip dash-chip-hot">
                  <BadgeCheck size={12} /> RTG Club
                </span>
              )}
              {stravaLinked && (
                <span className="dash-chip">
                  <CheckCircle2 size={12} /> Strava connected
                </span>
              )}
            </div>
            {avatarError && <p className="mt-3 text-xs text-rtg-orange-300">{avatarError}</p>}
          </div>
        </div>

        {hasStats && (
          <div className="dash-stats">
            <div>
              <strong>{formatKm(myLeaderboardStats.total_distance_meters)}</strong>
              <span>Total distance</span>
            </div>
            <div>
              <strong>{myLeaderboardStats.activity_count}</strong>
              <span>Activities</span>
            </div>
            <div>
              <strong>{Math.round(myLeaderboardStats.total_moving_time_seconds / 3600)}h</strong>
              <span>Moving time</span>
            </div>
          </div>
        )}
      </header>

      <div className="dash-body">
        {stravaNotice && (
          <p className={`dash-notice ${stravaNotice.tone === "good" ? "is-good" : "is-bad"}`}>
            {stravaNotice.tone === "good" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {stravaNotice.text}
          </p>
        )}

        {/* Strava is linked from here, not used to log in: a member who hasn't
            connected it yet is asked to, once signed in. */}
        {!stravaLinked && authProviders.strava && (
          <section className="dash-strava">
            <div className="min-w-0 flex-1">
              <h2 className="mb-1.5 font-display text-2xl leading-none md:text-3xl">Connect Your Strava</h2>
              <p className="text-sm text-rtg-mist">Link your Strava account so your rides and runs show up on your RTG profile automatically.</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {connectingStrava && <Loader2 size={16} className="animate-spin text-rtg-orange-500" />}
              <ConnectWithStrava onClick={handleConnectStrava} alt={STRAVA_CONNECT_ALT} disabled={connectingStrava} />
            </div>
          </section>
        )}

        {myMemberships.length > 0 && (
          <section>
            <h2 className="dash-title">My Memberships</h2>
            <div className="dash-list">
              {myMemberships.map((m) => {
                const status = MEMBERSHIP_STATUS[m.status] || MEMBERSHIP_STATUS.pending_verification;
                return (
                  <article key={m.id} className="dash-row">
                    <span className="dash-row-icon">
                      <BadgeCheck size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{m.plan_name}</p>
                      <p className="mt-0.5 text-xs text-rtg-mist">
                        {shortDate(m.created_at)} · {formatPrice(m.amount)}
                        {m.valid_until ? ` · valid till ${shortDate(m.valid_until)}` : ""}
                      </p>
                    </div>
                    <span className={`dash-pill ${status.className}`}>{status.label}</span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {myOrders.length > 0 && (
          <section>
            <h2 className="dash-title">My Orders</h2>
            <div className="dash-list">
              {myOrders.map((order) => {
                const status = ORDER_STATUS[order.status] || ORDER_STATUS.pending_verification;
                return (
                  <article key={order.id} className="dash-row">
                    <span className="dash-row-icon">
                      <Package size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{order.order_items.map((i) => i.product_name).join(", ")}</p>
                      <p className="mt-0.5 text-xs text-rtg-mist">
                        {shortDate(order.created_at)} · {formatPrice(order.total)}
                      </p>
                    </div>
                    <span className={`dash-pill ${status.className}`}>{status.label}</span>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {stravaLinked && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 className="dash-title !mb-0">My Strava Activity</h2>
                <StravaLogo alt={STRAVA_LOGO_ALT} className="block h-4 w-auto" />
              </div>
              <Link to="/lab/strava" className="inline-flex items-center gap-1 text-xs font-semibold text-rtg-orange-500 transition-colors hover:text-rtg-orange-600">
                Open RTG Club Lab <ArrowUpRight size={13} />
              </Link>
            </div>
            {myStravaActivities.length === 0 ? (
              <p className="dash-empty">No activities synced yet — they'll show up here after your next ride or run on Strava.</p>
            ) : (
              <div className="dash-list">
                {myStravaActivities.map((a) => (
                  <article key={a.id} className="dash-row">
                    <span className="dash-row-icon">
                      <Activity size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.name}</p>
                      <p className="mt-0.5 text-xs text-rtg-mist">
                        {a.type} · {shortDate(a.start_date, false)}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-xl text-rtg-purple-600">{formatKm(a.distance_meters)}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ---- Profile ---- */}
        <section>
          <h2 className="dash-title">Athlete Profile</h2>
          <div className="dash-card">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <User size={12} /> Full Name
                  </label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Mail size={12} /> Account
                  </label>
                  {/* Strava/XFitConnect logins don't hand us a real email, so one
                      gets invented internally (a "@members." placeholder) just to
                      satisfy Supabase's auth system — that's plumbing, never
                      meant to be shown to the member as if it were their email. */}
                  <p className={`${inputClass} truncate !bg-rtg-purple-600/5 text-rtg-mist`}>
                    {profile?.email?.includes("@members.") ? <span className="capitalize">Connected via {profile.auth_provider}</span> : profile?.email || user.email}
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <MapPin size={12} /> City
                  </label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Delhi" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Activity size={12} /> Sport
                  </label>
                  <input type="text" value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} placeholder="e.g. Cycling, Running" className={inputClass} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>
                    <Phone size={12} /> Phone
                  </label>
                  <p className={`${inputClass} truncate !bg-rtg-purple-600/5 text-rtg-mist`}>{profile?.phone || "—"}</p>
                </div>
                <div>
                  <label className={labelClass}>
                    <Cake size={12} /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={form.dob}
                    max={new Date().toLocaleDateString("en-CA")}
                    onChange={(e) => setForm({ ...form, dob: e.target.value, age: ageFromDob(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Age</label>
                  <p className={`${inputClass} !bg-rtg-purple-600/5 text-rtg-mist`}>{form.age || "—"}</p>
                </div>
              </div>

              <ChipChoice label="Gender" options={GENDERS} value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} />
              <ChipChoice label="Rider, runner, or both?" options={RIDER_TYPES} value={form.rider_type} onChange={(v) => setForm({ ...form, rider_type: v })} />
              <ChipChoice label="How often do you ride?" options={RIDE_FREQUENCIES} value={form.ride_frequency} onChange={(v) => setForm({ ...form, ride_frequency: v })} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    <AtSign size={12} /> Instagram ID
                  </label>
                  <input type="text" value={form.instagram_id} onChange={(e) => setForm({ ...form, instagram_id: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    <Droplet size={12} /> Blood Group
                  </label>
                  <input type="text" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} placeholder="e.g. B+" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  <ShieldAlert size={12} /> Emergency Contact — Name &amp; Number
                </label>
                <input type="text" value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Medical conditions we should know (optional)</label>
                <textarea value={form.medical_conditions} onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })} rows={2} className={`${inputClass} resize-y`} />
              </div>
              <div>
                <label className={labelClass}>Why did you join RTG? (optional)</label>
                <textarea value={form.join_reason} onChange={(e) => setForm({ ...form, join_reason: e.target.value })} rows={2} className={`${inputClass} resize-y`} />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  placeholder="A little about your endurance journey..."
                  className={`${inputClass} resize-y`}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-shine inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f45b18] via-rtg-orange-500 to-rtg-orange-400 px-7 py-3 text-sm font-semibold text-white shadow-[0_13px_28px_rgba(247,107,28,0.25)] transition hover:brightness-110 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                  {saved ? "Saved" : "Save Changes"}
                </button>
                {stravaLinked ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rtg-mist">
                    <CheckCircle2 size={13} className="text-green-600" /> Strava connected
                  </span>
                ) : (
                  !authProviders.strava && <span className="text-xs text-rtg-mist">No Strava connected</span>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* ---- Danger zone ---- */}
        <section className="dash-danger">
          <div className="min-w-0 flex-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
              <AlertTriangle size={15} /> Delete My Account
            </h3>
            <p className="mt-1 text-xs text-rtg-mist">Permanently deletes your account and all associated data (profile, orders). This can't be undone.</p>
            {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
          </div>
          {deleteStep === "idle" ? (
            <button
              onClick={() => setDeleteStep("confirming")}
              className="shrink-0 rounded-full border border-red-300 px-5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete my account
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-rtg-white">Are you sure? This is permanent.</span>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteStep === "deleting"}
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
              >
                {deleteStep === "deleting" && <Loader2 size={14} className="animate-spin" />}
                Yes, delete permanently
              </button>
              <button onClick={() => setDeleteStep("idle")} disabled={deleteStep === "deleting"} className="text-xs text-rtg-mist transition-colors hover:text-rtg-white">
                Cancel
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
