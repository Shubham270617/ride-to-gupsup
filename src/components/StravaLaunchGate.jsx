import { Navigate } from "react-router-dom";
import { STRAVA_ENABLED } from "../lib/launchFeatures";

export default function StravaLaunchGate({ children }) {
  return STRAVA_ENABLED ? children : <Navigate to="/lab" replace />;
}
