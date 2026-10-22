import { useFeature } from "../lib/features";
import NotFound from "../pages/NotFound";

// Shows a page only while its admin switch is on; otherwise the visitor gets
// the normal "page not found", as if the page didn't exist yet.
export default function FeatureGate({ feature, children }) {
  const { ready, on } = useFeature(feature);
  if (!ready) return null;
  return on ? children : <NotFound />;
}
