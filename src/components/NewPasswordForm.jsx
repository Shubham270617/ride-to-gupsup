import { useState } from "react";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";

const FIELD =
  "w-full rounded-2xl bg-white border border-rtg-border pl-11 pr-12 py-3.5 text-sm text-rtg-white placeholder:text-rtg-mist/70 transition focus:outline-none focus:border-rtg-orange-400 focus:ring-4 focus:ring-rtg-orange-400/15";

export const MIN_PASSWORD_LENGTH = 8;

// The "new password + confirm" form shared by /forgot-password (after the
// emailed code) and /reset-password (after the emailed link). `onSubmit`
// gets the password and resolves to an error message, or nothing on success.
export default function NewPasswordForm({ onSubmit, submitLabel = "Update password" }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those two passwords don't match.");
      return;
    }
    setSubmitting(true);
    const message = await onSubmit(password);
    if (message) setError(message);
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
        <input
          type={show ? "text" : "password"}
          required
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={72}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className={FIELD}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-rtg-mist hover:text-rtg-orange-500 transition-colors"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="relative">
        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-rtg-mist" />
        <input
          type={show ? "text" : "password"}
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={72}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className={FIELD}
        />
      </div>

      <p className="text-xs text-rtg-mist px-1">At least {MIN_PASSWORD_LENGTH} characters.</p>

      {error && <p className="text-xs text-rtg-orange-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="btn-shine w-full inline-flex items-center justify-center gap-2 rounded-full bg-rtg-orange-500 text-white font-semibold py-3.5 text-sm hover:bg-rtg-orange-400 transition-colors disabled:opacity-60"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
