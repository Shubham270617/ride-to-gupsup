import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import signHandler from "./api/cloudinary/sign.js";
import providersHandler from "./api/auth/providers.js";
import authStartHandler from "./api/auth/[provider]/start.js";
import authCallbackHandler from "./api/auth/[provider]/callback.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

app.post("/api/cloudinary/sign", signHandler);
app.get("/api/auth/providers", providersHandler);
app.get("/api/auth/:provider/start", authStartHandler);
app.get("/api/auth/:provider/callback", authCallbackHandler);

// Serve the built Vite frontend, falling back to index.html for any
// non-API route so React Router's client-side routing keeps working on a
// hard refresh/direct link (e.g. /events/some-slug).
const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`RTG server listening on port ${port}`);
});
