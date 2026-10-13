import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Lock, Phone, Cake, MapPin, AtSign, ShieldAlert, Droplet, MessageCircle, Check } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import ImageUploadField from "../admin/components/ImageUploadField";
import { useSiteImages, useSiteSettings, pickText } from "../lib/publicData";
import { ONBOARDING_PAGE_TEXT, onboardingKey } from "../data/onboardingContent";
import { GENDERS, RIDER_TYPES, RIDE_FREQUENCIES, ageFromDob } from "../lib/profileFields";

const isVideoUrl = (url) => /\.(mp4|webm|mov)(\?|$)/i.test(url || "");

// The moving RTG backdrop: a video when the first slot holds one, otherwise
// a slow cross-fade of the photos. Purely decorative.
function OnboardingBackdrop({ slides }) {
  const [first, ...rest] = slides;
  return (
    <div className="onb-bg" aria-hidden="true">
      {isVideoUrl(first) ? (
        <video src={first} poster={rest.find((u) => !isVideoUrl(u))} autoPlay muted loop playsInline />
      ) : (
        slides
          .filter((u) => !isVideoUrl(u))
          .slice(0, 3)
          .map((url, i) => <div key={url + i} className="onb-slide" style={{ backgroundImage: `url("${url}")`, animationDelay: `${i * 7}s` }} />)
      )}
      <div className="onb-shade" />
    </div>
  );
}

const COUNTRY_CODE = "+91";
const toE164 = (localNumber) => `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;

const inputClass =
  "w-full rounded-full bg-white border border-rtg-purple-600/20 shadow-[0_1px_2px_rgba(53,36,111,0.05)] pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60";

function RadioGroup({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
              value === opt
                ? "bg-rtg-orange-500 border-rtg-orange-500 text-white shadow-md shadow-rtg-orange-500/25"
                : "bg-white border-rtg-purple-600/20 text-rtg-white/80 hover:border-rtg-orange-400"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// One-time page shown right after a fresh signup — Google or email/phone,
// see the redirects in AuthCallback.jsx and AuthGate.jsx — carrying the
// same questions as RTG's real community registration form (city, DOB,
// age, gender, rider/runner, ride frequency, Strava, Instagram, emergency
// contact, medical conditions, blood group, why join), plus a photo and,
// for Google sign-ins only, a password so they can also log in by phone
// afterward (phone login checks a password — see /api/auth/phone-login).
export default function Onboarding() {
  const navigate = useNavigate();
  // Sent here by a "Join Community" button (lib/JoinCommunityContext.jsx).
  const [searchParams] = useSearchParams();
  const cameToJoin = searchParams.get("join") === "1";
  const { user, loading: sessionLoading } = useSession();
  const images = useSiteImages();
  const settings = useSiteSettings();
  const copy = Object.fromEntries(ONBOARDING_PAGE_TEXT.map((f) => [f.field, pickText(settings, onboardingKey(f.field), f.text)]));
  const slides = [images.onboardingBg, images.onboardingBg2, images.onboardingBg3].filter(Boolean);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [city, setCity] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [riderType, setRiderType] = useState("");
  const [rideFrequency, setRideFrequency] = useState("");
  const [hasStrava, setHasStrava] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [joinReason, setJoinReason] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !isSupabaseConfigured) {
      navigate("/", { replace: true });
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_complete) {
          navigate("/", { replace: true });
          return;
        }
        setProfile(data);
        setAvatarUrl(data?.avatar_url || "");
        setCity(data?.city || "");
        setLoading(false);
      });
  }, [user, sessionLoading, navigate]);

  if (sessionLoading || loading) {
    return (
      <div className="onb min-h-svh flex items-center justify-center">
        <OnboardingBackdrop slides={slides} />
        <Loader2 className="relative animate-spin text-rtg-orange-400" size={28} />
      </div>
    );
  }

  const needsPhone = !profile?.phone;
  const needsPassword = user?.app_metadata?.provider === "google";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (needsPassword && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!gender || !riderType || !rideFrequency || !hasStrava) {
      setError("Please answer every required question.");
      return;
    }
    setSubmitting(true);
    try {
      if (needsPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      const updates = {
        avatar_url: avatarUrl || null,
        city,
        dob: dob || null,
        age: age ? Number(age) : null,
        gender,
        rider_type: riderType,
        ride_frequency: rideFrequency,
        has_strava: hasStrava === "Yes",
        instagram_id: instagramId,
        emergency_contact: emergencyContact,
        medical_conditions: medicalConditions || null,
        blood_group: bloodGroup,
        join_reason: joinReason || null,
        onboarding_complete: true,
      };
      if (needsPhone) updates.phone = toE164(phone);

      // Submitting this form is what makes someone a community member.
      const joined = { community_joined: true, community_joined_at: new Date().toISOString() };
      let { error: updateError } = await supabase.from("profiles").update({ ...updates, ...joined }).eq("id", user.id);
      // A database that hasn't had migration 014 yet has no "joined"
      // columns — save the profile without them rather than fail.
      if (updateError && /community_joined/.test(updateError.message || "")) {
        ({ error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id));
      }
      if (updateError) throw updateError;

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onb min-h-svh">
      <OnboardingBackdrop slides={slides} />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,38rem)] lg:gap-14 lg:py-14">
        <aside className="theme-night onb-side lg:sticky lg:top-14 lg:self-start">
          <img src={images.logo} alt="Ride Tea GupShup" className="h-11 w-auto sm:h-14" />
          <span className="mt-8 hidden text-xs font-semibold uppercase tracking-[0.24em] text-rtg-orange-300 lg:block">{copy.sideEyebrow}</span>
          <p className="mt-3 hidden font-display text-6xl leading-[0.95] text-white lg:block xl:text-7xl">
            {copy.sideTitle} <span className="text-rtg-orange-400">{copy.sideTitleAccent}</span>
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 lg:mt-5 lg:text-base">{copy.sideText}</p>
          <ul className="mt-7 hidden space-y-3 lg:block">
            {copy.sidePoints
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-white/90">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rtg-orange-500 text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
          </ul>
        </aside>

      <div className="onb-card rounded-3xl p-6 sm:p-8 md:p-10 w-full">
        <div className="text-center mb-8">
          <span className="inline-block text-rtg-orange-500 font-semibold tracking-[0.2em] uppercase text-xs mb-3">
            {copy.eyebrow}
          </span>
          <h1 className="font-display text-3xl md:text-4xl leading-none mb-2">
            {copy.title} <span className="text-gradient">{copy.titleAccent}</span>
          </h1>
          <p className="text-rtg-mist text-sm">
            {cameToJoin ? copy.subtitleJoin : copy.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center">
            <ImageUploadField
              label="Profile Photo"
              value={avatarUrl}
              onChange={setAvatarUrl}
              accept="image/*"
              ownAvatar
            />
          </div>

          {needsPhone && (
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
              <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-rtg-mist">{COUNTRY_CODE}</span>
              <input
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="Phone number — 98765 43210"
                className={`${inputClass} pl-[4.5rem]`}
              />
            </div>
          )}

          {needsPassword && (
            <>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-rtg-mist -mt-3 px-1">
                Lets you log in with your phone number next time, not just Google.
              </p>
            </>
          )}

          <div className="relative">
            <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="text"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City / Area"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                max={new Date().toLocaleDateString("en-CA")}
                onChange={(e) => {
                  setDob(e.target.value);
                  setAge(ageFromDob(e.target.value));
                }}
                className="w-full rounded-full bg-white border border-rtg-purple-600/20 shadow-[0_1px_2px_rgba(53,36,111,0.05)] px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">Age</label>
              <Cake size={16} className="absolute left-4 top-[2.6rem] text-rtg-mist" />
              <input
                type="number"
                required
                min={10}
                max={100}
                value={age}
                readOnly
                tabIndex={-1}
                placeholder="Filled from date of birth"
                className={`${inputClass} bg-rtg-purple-600/5 cursor-default`}
              />
            </div>
          </div>

          <RadioGroup label="Gender" options={GENDERS} value={gender} onChange={setGender} />
          <RadioGroup label="Are you a rider, runner, or both?" options={RIDER_TYPES} value={riderType} onChange={setRiderType} />
          <RadioGroup label="How often do you ride?" options={RIDE_FREQUENCIES} value={rideFrequency} onChange={setRideFrequency} />
          <RadioGroup label="Do you have a Strava profile?" options={["Yes", "No"]} value={hasStrava} onChange={setHasStrava} />

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
              <input
                type="text"
                required
                value={instagramId}
                onChange={(e) => setInstagramId(e.target.value)}
                placeholder="Your Instagram ID"
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Droplet size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
              <input
                type="text"
                required
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="Blood Group"
                className={inputClass}
              />
            </div>
          </div>

          <div className="relative">
            <ShieldAlert size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="text"
              required
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="Emergency Contact — Name & Number"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">
              Any medical conditions we should know? (optional)
            </label>
            <textarea
              rows={2}
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              className="w-full rounded-2xl bg-white border border-rtg-purple-600/20 shadow-[0_1px_2px_rgba(53,36,111,0.05)] px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60 resize-y"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">
              <MessageCircle size={13} /> Why do you want to join RTG? (optional)
            </label>
            <textarea
              rows={3}
              value={joinReason}
              onChange={(e) => setJoinReason(e.target.value)}
              className="w-full rounded-2xl bg-white border border-rtg-purple-600/20 shadow-[0_1px_2px_rgba(53,36,111,0.05)] px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60 resize-y"
            />
          </div>

          {error && <p className="text-xs text-rtg-orange-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm shadow-lg shadow-rtg-orange-500/30 hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {copy.submitLabel}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
