import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Lock, Phone, Cake } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import useSession from "../lib/useSession";
import ImageUploadField from "../admin/components/ImageUploadField";

const COUNTRY_CODE = "+91";
const toE164 = (localNumber) => `${COUNTRY_CODE}${localNumber.replace(/\D/g, "")}`;

// One-time page shown right after a fresh signup (Google or email/phone —
// see the redirects in AuthCallback.jsx and AuthGate.jsx) to collect the
// handful of things the main signup form doesn't: a Google sign-in has no
// password yet (needed so they can also log in by phone later, since phone
// login checks a password — see /api/auth/phone-login), and neither flow
// asks for age or a profile photo.
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !isSupabaseConfigured) {
      navigate("/", { replace: true });
      return;
    }
    supabase
      .from("profiles")
      .select("phone, age, avatar_url, onboarding_complete")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_complete) {
          navigate("/", { replace: true });
          return;
        }
        setProfile(data);
        setAge(data?.age ? String(data.age) : "");
        setAvatarUrl(data?.avatar_url || "");
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
    setSubmitting(true);
    try {
      if (needsPassword) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      }

      const updates = {
        age: age ? Number(age) : null,
        avatar_url: avatarUrl || null,
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
      <div className="glass rounded-3xl p-8 md:p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-block text-rtg-orange-400 font-semibold tracking-[0.2em] uppercase text-xs mb-3">
            Almost there
          </span>
          <h1 className="font-display text-3xl md:text-4xl leading-none mb-2">
            Complete Your <span className="text-gradient">Profile</span>
          </h1>
          <p className="text-rtg-mist text-sm">Just a few more details before you're all set.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-full bg-white/5 border border-white/10 pl-[4.5rem] pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
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
                  className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
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
                  className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
                />
              </div>
              <p className="text-xs text-rtg-mist -mt-2 px-1">
                Lets you log in with your phone number next time, not just Google.
              </p>
            </>
          )}

          <div className="relative">
            <Cake size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="number"
              min={10}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Age (optional)"
              className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
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
