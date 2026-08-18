import { supabase } from "./supabaseClient";

const ERROR_MESSAGES = {
  invalid_credentials: "Incorrect phone number or password.",
  missing_fields: "Enter both a phone number and a password.",
  server_misconfigured: "Login isn't fully set up yet — please check back soon.",
};

// Logging in by phone number isn't a native Supabase Auth identity here
// (that would need SMS verification, which this project skips — see
// AuthGate.jsx). /api/auth/phone-login looks up the matching account by
// phone server-side and hands back a real session, which we then adopt
// client-side exactly like any other login.
export async function signInWithPhone(phone, password) {
  try {
    const res = await fetch("/api/auth/phone-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: { message: ERROR_MESSAGES[body.error] || "Something went wrong. Please try again." } };
    }
    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    return { error };
  } catch {
    return { error: { message: "Something went wrong. Please try again." } };
  }
}
