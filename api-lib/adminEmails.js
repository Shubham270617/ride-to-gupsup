// The only accounts that can use the admin dashboard. Fixed by the owner;
// nobody else can become an admin, however they sign in.
//
// The same list lives in the database (admin_email_allowed() in
// supabase/migrations/029_fixed_admin_emails.sql and supabase/schema.sql),
// which is what actually guards the data. To change who is an admin, change
// all three places (tests/repo/consistency.test.js checks they match) and
// run the updated SQL in Supabase.
export const ADMIN_EMAILS = Object.freeze([
  "simranbaghelgame@gmail.com",
  "shub88510@gmail.com",
  "wheelikx@gmail.com",
]);

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const isAdminEmail = (email) => ADMIN_EMAILS.includes(normalizeEmail(email));

// A signed-in Supabase user who may be an admin: one of the emails above,
// and proven to own it (Google sign-in, or the confirmation link for an
// email/password account). Without the second check, anyone could sign up
// with an admin's address and a password of their own.
export const isAdminAccount = (user) => Boolean(user?.email_confirmed_at) && isAdminEmail(user?.email);
