import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./styles/lab.css";
import App from "./App.jsx";
import EditorEntry from "./admin/site-editor/EditorEntry";
import { applyCachedAppearance } from "./lib/appearance";

// Replays the admin's last-known text size/font/colour before the first
// paint, so the saved appearance doesn't visibly snap into place once the
// settings request lands. useAppearance() in App then reconciles it.
applyCachedAppearance();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <EditorEntry><App /></EditorEntry>
    </BrowserRouter>
  </StrictMode>
);

