import { supabase } from "./supabaseClient";

const GENERIC = "Something went wrong. Please try again.";

const ERROR_MESSAGES = {
  invalid_email: "Enter a valid email address.",
  too_soon: "Please wait a moment before asking for another code.",
  too_many_requests: "Too many reset requests. Please try again in an hour.",
  send_failed: "We couldn't send the email. Please try again in a few minutes.",
  invalid_code: "That code isn't right. Check the email and try again.",
  too_many_attempts: "Too many wrong tries. Request a new code.",
  invalid_link: "This link has expired or was already used. Request a new one.",
  weak_password: "Use between 8 and 72 characters.",
  server_misconfigured: "Password reset isn't fully set up yet — please check back soon.",
};

// Forgot password runs through /api/auth/account?op=password-reset, not Supabase's
// mailer — see api-lib/passwordReset.js. `credential` is either { email, code } (typed from
// the email) or { token } (the link in the email).
async function call(action, payload) {
  try {
    const res = await fetch("/api/auth/account?op=password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: {
          code: body.error,
          message: body.message || ERROR_MESSAGES[body.error] || GENERIC,
          retryAfter: body.retryAfter,
        },
      };
    }
    return { data: body };
  } catch {
    return { error: { message: GENERIC } };
  }
}

export const requestPasswordReset = (email) => call("request", { email });

export const checkResetCredential = (credential) => call("verify", credential);

// Sets the new password, then adopts the one-time sign-in token the server
// hands back, so the member lands signed in.
export async function completePasswordReset(credential, password) {
  const { data, error } = await call("complete", { ...credential, password });
  if (error) return { error };

  const signInFailed = {
    error: { message: "Your password was changed, but we couldn't sign you in. Log in with your new password." },
  };
  if (!data.token_hash) return signInFailed;
  const { error: sessionError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "email" });
  return sessionError ? signInFailed : {};
}
