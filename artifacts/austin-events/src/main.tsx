import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import { PublicDocumentView } from "./components/public-document-view";
import type { PublicDocumentModel } from "./lib/public-document";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => sessionStorage.getItem("admin_token"));

const payload = document.getElementById("public-document")?.textContent;
const model: PublicDocumentModel | undefined = payload ? JSON.parse(payload) : undefined;
window.__PUBLIC_DOCUMENT__ = model;
const root = document.getElementById("root")!;
if (model && ["event", "venue", "about", "not-found", "unavailable"].includes(model.kind)) {
  hydrateRoot(root, <PublicDocumentView model={model} />);
} else {
  createRoot(root).render(<App />);
}
