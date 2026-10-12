import type { PublicDocumentModel } from "./public-document";

/** These pages hydrate the exact server view; all others mount the interactive app. */
export function hydratesPublicDocument(kind: PublicDocumentModel["kind"]) {
  return ["event", "venue", "about", "not-found", "unavailable"].includes(kind);
}

export function finishPublicHandoff() {
  const html = document.documentElement;
  const timer = html.getAttribute("data-public-boot-timer");
  if (timer) window.clearTimeout(Number(timer));
  // Remove the old view before revealing the committed app, in the same paint.
  document.getElementById("public-fallback")?.remove();
  document.getElementById("public-app-loading")?.remove();
  html.removeAttribute("data-public-boot-timer");
  html.removeAttribute("data-public-boot");
}
