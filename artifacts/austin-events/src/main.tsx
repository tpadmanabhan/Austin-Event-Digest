import { createRoot, hydrateRoot } from "react-dom/client";
import { useLayoutEffect } from "react";
import App from "./App";
import { PublicDocumentView } from "./components/public-document-view";
import type { PublicDocumentModel } from "./lib/public-document";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { finishPublicHandoff, hydratesPublicDocument } from "./lib/public-handoff";

setAuthTokenGetter(() => sessionStorage.getItem("admin_token"));

const payload = document.getElementById("public-document")?.textContent;
const model: PublicDocumentModel | undefined = payload ? JSON.parse(payload) : undefined;
window.__PUBLIC_DOCUMENT__ = model;
const root = document.getElementById("root")!;
function ClientApp() {
  useLayoutEffect(finishPublicHandoff, []);
  return <App />;
}

if (model && hydratesPublicDocument(model.kind)) {
  hydrateRoot(root, <PublicDocumentView model={model} />);
} else {
  createRoot(root).render(<ClientApp />);
}
