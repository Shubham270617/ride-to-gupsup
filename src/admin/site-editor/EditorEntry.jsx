import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
const SiteEditor = lazy(() => import('./MultiPageEditor'));
const HomeCanvas = lazy(() => import('./HomeCanvas'));
// Keep these surfaces outside App: no visit tracking, welcome email, chat or cart side effects.
export default function EditorEntry({ children }) {
  const { pathname } = useLocation();
  if (!['/admin/site-editor','/admin/site-canvas'].includes(pathname)) return children;
  return <Suspense fallback={<p role="status">Opening visual editor…</p>}><ProtectedRoute><Routes>
    <Route path="/admin/site-editor" element={<SiteEditor canvasUrl="/admin/site-canvas" />} />
    <Route path="/admin/site-canvas" element={<HomeCanvas />} />
  </Routes></ProtectedRoute></Suspense>;
}
