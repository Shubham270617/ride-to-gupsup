import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User, Loader2, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { images } from "../../data/images";
import { brand } from "../../data/content";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Same field-carryover fix as the member panel: never let a password
  // typed into one tab linger, pre-filled, in the other.
  const switchMode = (newMode) => {
    setMode(newMode);
    setEmail("");
    setPassword("");
    setFullName("");
    setError("");
    setNotice("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!isSupabaseConfigured) {
      setError("The database isn't connected yet.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        setEmail("");
        setPassword("");
        setFullName("");
        setNotice(
          data.session
            ? "Account created. Ask an existing admin to grant you access from the Admins screen."
            : "Check your inbox to confirm your email, then ask an existing admin to grant you access from the Admins screen."
        );
        setMode("login");
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from("admin_profiles")
        .select("id")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        setError("This account isn't set up as an admin yet.");
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-rtg-ink px-6">
      <div className="relative glass rounded-3xl p-8 md:p-10 w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-rtg-mist hover:text-rtg-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>
        <img src={images.logo} alt={brand.name} className="h-10 w-auto mx-auto mb-6" />
        <h1 className="font-display text-3xl text-center mb-1">Admin</h1>
        <p className="text-rtg-mist text-sm text-center mb-8">Manage RTG's events, gallery, store, and more.</p>

        <div className="flex glass rounded-full p-1 mb-5">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
              mode === "login" ? "bg-rtg-orange-500 text-rtg-ink" : "text-rtg-mist"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-colors ${
              mode === "signup" ? "bg-rtg-orange-500 text-rtg-ink" : "text-rtg-mist"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
              />
            </div>
          )}
          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-full bg-white/5 border border-white/10 pl-11 pr-4 py-3 text-sm text-rtg-white placeholder:text-rtg-mist/70 focus:outline-none focus:border-rtg-orange-400/60"
            />
          </div>

          {error && <p className="text-xs text-rtg-orange-400 text-center">{error}</p>}
          {notice && <p className="text-xs text-rtg-mist text-center">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-rtg-ink font-semibold py-3 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
