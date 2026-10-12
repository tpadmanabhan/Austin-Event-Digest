/** SF-specific editorial content, mirrored on the city's homepage and edition. */
export function buildSanFranciscoAiEthicsSection(): string {
  const readings = [
    ["https://hai.stanford.edu/ai-index/2026-ai-index-report", "AI Index Report 2026", "Stanford HAI", "Annual data on AI research, investment, policy and public opinion."],
    ["https://datasociety.net/library/", "Research Library", "Data & Society", "Reports and essays on the social effects of data-centric technology."],
    ["https://www.harpercollins.com/products/the-ai-con-emily-m-benderalex-hanna", "The AI Con", "Book by Emily M. Bender and Alex Hanna", "A critical look at AI hype and who it serves."],
    ["https://us.macmillan.com/books/9781250897930/theworldsisee", "The Worlds I See", "Book by Fei-Fei Li", "A memoir from one of the researchers behind modern computer vision."],
  ];
  return `<section style="background:#fff4eb;border:1px solid #fed7aa;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#b83b12;font-size:12px;">Reading list / Bay Area</p>
    <h2 style="color:#102B38;margin:0 0 12px;">AI Ethics</h2>
    <p style="color:#475569;line-height:1.7;">San Francisco builds a lot of the technology the rest of the world uses. These reads help keep the conversation grounded: use AI to find your way to the room, then put the phone down and talk to people.</p>
    <ol style="color:#475569;line-height:1.7;">${readings.map(([url, title, source, note]) =>
      `<li style="margin-bottom:12px;"><a href="${url}" style="color:#b83b12;font-weight:bold;">${title}</a> / ${source}<br />${note}</li>`).join("")}</ol>
  </section>`;
}
