// Strava's brand artwork (see https://developers.strava.com/guidelines/):
// the orange "Connect with Strava" button, exactly as Strava supplies it,
// and the Strava wordmark. They live in /public/images/strava/ and must not
// be redrawn, recoloured or stretched.
//
// The wordmark is Strava's "Powered by Strava" logo with the words "Powered
// by" removed, at the site owner's request. Strava's guidelines ask API
// apps to show the full "Powered by Strava" logo, so if Strava objects, the
// original files are in git history (api_logo_pwrdBy_strava_*.svg).

export const STRAVA_URL = "https://www.strava.com";

// The official button, 48px tall. It starts the "connect my Strava" flow
// that /api/auth/strava/connect-start runs.
export function ConnectWithStrava({ onClick, alt, disabled = false }) {
  return (
    <button type="button" className="strava-connect" onClick={onClick} disabled={disabled}>
      <img src="/images/strava/btn_strava_connect_with_orange.svg" alt={alt} width="193" height="48" />
    </button>
  );
}

// The Strava wordmark on its own (no "Powered by"): Strava's own lettering,
// cut from its logo file without redrawing it. `white` is for dark panels.
export function StravaLogo({ alt, white = false, className = "" }) {
  const file = white ? "strava_wordmark_white.svg" : "strava_wordmark_orange.svg";
  return <img className={`strava-logo ${className}`.trim()} src={`/images/strava/${file}`} alt={alt} />;
}
