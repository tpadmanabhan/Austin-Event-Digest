/** Miami editorial content: same readings and local framing as the public pages. */
export function buildMiamiAiEthicsSection(): string {
  const readings = [
    ["https://brianchristian.org/the-alignment-problem/", "The Alignment Problem", "Book by Brian Christian", "How systems learn goals different from the ones we meant, a useful lens for anyone automating flood or public-service decisions that need to stay accountable."],
    ["https://algorithmsofoppression.com/about/", "Algorithms of Oppression", "Book by Safiya Umoja Noble", "How search engines can reinforce racial and gender bias, worth reading before trusting ranked results in housing searches or any service people find through a search box."],
    ["https://www.katedarling.org/", "The New Breed", "Book by Kate Darling", "Argues we should treat robots more like animals we work alongside than human replacements, a frame for hospitality workers keeping agency as new tools arrive."],
    ["https://www.unesco.org/en/artificial-intelligence/recommendation-ethics", "Recommendation on the Ethics of Artificial Intelligence", "UNESCO", "Global principles on human rights, fairness and cultural and linguistic diversity, a baseline for AI that serves English, Spanish and Haitian Creole speakers alike."],
  ];
  return `<section style="background:#edf7f3;border:1px solid #8FD3C4;border-radius:16px;padding:24px;margin-bottom:24px;">
    <p style="color:#0E5560;font-size:12px;">Reading list / Miami</p>
    <h2 style="color:#12343a;margin:0 0 12px;">AI Ethics</h2>
    <p style="color:#475569;line-height:1.7;">Miami lives at the edge of the water and runs on many languages. As AI shows up in flood response, public services, housing searches and hospitality work, this edition asks who gets heard, who can appeal a decision, and who keeps their judgment on the job. These books are not about Miami, but their questions belong in every room where local builders meet.</p>
    <ol style="color:#475569;line-height:1.7;">${readings.map(([url, title, source, note]) =>
      `<li style="margin-bottom:12px;"><a href="${url}" style="color:#0E5560;font-weight:bold;">${title}</a> / ${source}<br />${note}</li>`).join("")}</ol>
  </section>`;
}
