import { useSiteImages, useSiteSettings } from '../../lib/publicData';
import { createRidgeIntroLayout } from '../../lib/layout/ridgeIntro';
import { useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { createAuthenticatedLayoutStore } from '../../lib/layout/connection';
import LayoutStudioAdmin from './LayoutStudioAdmin';

// Mount only inside ProtectedRoute. Server independently verifies session,
// admin seat, explicit reviewed administrator allowlist and enablement gate.
export default function ConnectedLayoutStudioAdmin({ pageKey = 'ridge', initialDocument, sectionData }) {
  const settings = useSiteSettings();
  const images = useSiteImages();
  const seed = useMemo(() => initialDocument || (pageKey === 'ridge' ? createRidgeIntroLayout(settings) : undefined), [initialDocument, pageKey, settings]);
  const previewData = { 'ridge-intro': { heroPhoto: images.ridgeHero }, ...sectionData };
  const store = useMemo(() => createAuthenticatedLayoutStore(supabase), []);
  return <>
    <p role="note" className="mb-4 rounded-xl border border-rtg-border p-4 text-sm text-rtg-mist">
      {store ? 'Shared draft controls are connected to the server endpoint. Access or publishing may still be disabled; a failed request does not change your website. Load the shared draft to check access.' : 'Sign-in configuration is unavailable. Only local draft tools are active; no shared save or publish can run.'}
    </p>
    <LayoutStudioAdmin pageKey={pageKey} initialDocument={seed} sectionData={previewData} store={store} />
  </>;
}

