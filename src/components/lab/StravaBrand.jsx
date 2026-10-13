// Strava's own brand files, used exactly as Strava supplies them (see
// https://developers.strava.com/guidelines/): the orange "Connect with
// Strava" button and the "Powered by Strava" logo. They live in
// /public/images/strava/ and must not be redrawn, recoloured or stretched.

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

// `stack` puts "POWERED BY" above the wordmark; `white` is for dark panels.
export function PoweredByStrava({ alt, stack = false, white = false, className = "" }) {
  const file = white
    ? "api_logo_pwrdBy_strava_horiz_white.svg"
    : stack
      ? "api_logo_pwrdBy_strava_stack_orange.svg"
      : "api_logo_pwrdBy_strava_horiz_orange.svg";
  return <img className={`strava-powered ${className}`.trim()} src={`/images/strava/${file}`} alt={alt} />;
}
