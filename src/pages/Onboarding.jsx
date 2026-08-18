import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Phone, Cake, MapPin, AtSign, ShieldAlert, Droplet, MessageCircle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import ImageUploadField from "../admin/components/ImageUploadField";

const COUNTRY_CODE = "+91";
const toE164 = (localNumber) => `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;

const RIDE_FREQUENCIES = ["Daily", "4-5 times a week", "Weekends only", "Occasionally (1-2 times a week)", "Rarely (just starting)"];

const inputClass =
  "w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60";

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
                ? "bg-rtg-orange-500 border-rtg-orange-500 text-rtg-ink"
                : "bg-white/5 border-white/10 text-rtg-mist hover:border-rtg-orange-400/40"
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
  const { user, loading: sessionLoading } = useSession();

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
      <div className="min-h-svh flex items-center justify-center bg-rtg-ink">
        <Loader2 className="animate-spin text-rtg-orange-400" size={28} />
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

      const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", user.id);
      if (updateError) throw updateError;

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-rtg-ink px-6 py-12">
      <div className="glass rounded-3xl p-8 md:p-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs mb-3">
            RTG Community Registration
          </span>
          <h1 className="font-display text-3xl md:text-4xl leading-none mb-2">
            Complete Your <span className="text-gradient">Profile</span>
          </h1>
          <p className="text-rtg-mist text-sm">A few details so RTG knows who's joining the ride.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center">
            <ImageUploadField
              label="Profile Photo"
              value={avatarUrl}
              onChange={setAvatarUrl}
              folder="avatar"
              accept="image/*"
              signEndpoint="/api/cloudinary/sign-avatar"
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
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white focus:outline-none focus:border-rtg-orange-400/60"
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
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className={inputClass}
              />
            </div>
          </div>

          <RadioGroup label="Gender" options={["Male", "Female"]} value={gender} onChange={setGender} />
          <RadioGroup label="Are you a rider, runner, or both?" options={["Rider", "Runner", "Both"]} value={riderType} onChange={setRiderType} />
          <RadioGroup label="How often do you ride?" options={RIDE_FREQUENCIES} value={rideFrequency} onChange={setRideFrequency} />
          <RadioGroup label="Do you have a Strava profile?" options={["Yes", "No"]} value={hasStrava} onChange={setHasStrava} />

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
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60 resize-y"
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

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-rtg-mist uppercase tracking-wide mb-1.5">
              <MessageCircle size={13} /> Why do you want to join RTG? (optional)
            </label>
            <textarea
              rows={3}
              value={joinReason}
              onChange={(e) => setJoinReason(e.target.value)}
              className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60 resize-y"
            />
          </div>

          {error && <p className="text-xs text-rtg-orange-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold py-3 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Finish Setup
          </button>
        </form>
      </div>
    </div>
  );
}
