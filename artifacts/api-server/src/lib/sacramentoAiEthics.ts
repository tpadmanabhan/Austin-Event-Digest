/** Sacramento-specific editorial content, mirrored on the city's public pages. */
export function buildSacramentoAiEthicsSection(): string {
  const readings = [
    ["https://www.nist.gov/itl/ai-risk-management-framework", "AI Risk Management Framework", "NIST", "Practical ways to identify, measure and manage risks before deploying AI."],
    ["https://oecd.ai/en/ai-principles", "Principles for Trustworthy AI", "OECD", "Human rights, transparency, accountability and democratic values in AI policy."],
    ["https://yalebooks.yale.edu/book/9780300264630/atlas-of-ai/", "Atlas of AI", "Book by Kate Crawford", "The labor, resources and environmental costs behind artificial intelligence."],
    ["https://virginia-eubanks.com/automating-inequality/", "Automating Inequality", "Book by Virginia Eubanks", "How automated public-service decisions can deepen inequality, and why oversight matters."],
  ];
  return `<section style="background:#ede8f5;border:1px solid #d4c8ea;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#5A2D81;font-size:12px;">Reading list / Sacramento</p>
    <h2 style="color:#1a0a30;margin:0 0 12px;">AI Ethics</h2>
    <p style="color:#475569;line-height:1.7;">In California's capital, technology and public decisions meet. This edition asks who benefits from AI, who bears its costs, and how communities can hold automated systems accountable. Bring those questions to Sac Tech Week and your next local conversation.</p>
    <ol style="color:#475569;line-height:1.7;">${readings.map(([url, title, source, note]) =>
      `<li style="margin-bottom:12px;"><a href="${url}" style="color:#5A2D81;font-weight:bold;">${title}</a> / ${source}<br />${note}</li>`).join("")}</ol>
  </section>`;
}
