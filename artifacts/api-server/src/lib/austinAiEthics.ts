import austinAiEthics from "../../../../shared/austin-ai-ethics.json";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);

/** Austin's editorial reading card, rendered with email-safe inline styles. */
export function buildAustinAiEthicsSection(): string {
  const links = (item: (typeof austinAiEthics.items)[number]) =>
    (item.links ?? [])
      .map(
        ({ label, url }) =>
          `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#047857; text-decoration:underline;">${escapeHtml(label)}</a>`,
      )
      .join(" · ");

  return `
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:22px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; color:#1f2937; font-size:20px; font-weight:700;">${escapeHtml(austinAiEthics.title)}</h2>
      <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.7;">${escapeHtml(austinAiEthics.intro)}</p>
      <ul style="margin:16px 0 0; padding-left:20px; color:#4b5563; font-size:14px; line-height:1.8;">
        ${austinAiEthics.items
          .map(
            (item, index) =>
              `<li style="margin-bottom:${index === austinAiEthics.items.length - 1 ? "0" : "10px"};"><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.description)}${item.links?.length ? ` ${links(item)}` : ""}</li>`,
          )
          .join("\n        ")}
      </ul>
    </div>`;
}