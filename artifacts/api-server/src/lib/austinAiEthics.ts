/** Austin's editorial reading card, rendered with email-safe inline styles. */
export function buildAustinAiEthicsSection(): string {
  return `
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:22px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; color:#1f2937; font-size:20px; font-weight:700;">AI Ethics</h2>
      <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.7;">AI promises convenience, but what does it cost us in privacy, trust, and human connection? My latest post explores that trade-off. For deeper perspective, Nick Bostrom’s <em>Superintelligence</em> asks how we can keep increasingly powerful AI aligned with human values. And 404 Media, founded by former VICE journalists, is must-subscribe media for its independent reporting on AI’s real-world impact.</p>
      <ul style="margin:16px 0 0; padding-left:20px; color:#4b5563; font-size:14px; line-height:1.8;">
        <li style="margin-bottom:10px;"><a href="https://customersuccessforgood.com/2026/09/30/are-we-trading-our-soul-for-convenience/" style="color:#047857; text-decoration:underline;">Are We Trading Our Soul for Convenience?</a> — Raj’s blog</li>
        <li style="margin-bottom:10px;"><a href="https://www.404media.co/" style="color:#047857; text-decoration:underline;">404 Media</a> — Must-subscribe journalism on AI, privacy, and accountability</li>
        <li><a href="https://note.com/akih/n/n1253589b1ffb?hl=en" style="color:#047857; text-decoration:underline;">Superintelligence: Paths, Dangers, Strategies</a> — Nick Bostrom’s book, featured in Aki’s article</li>
      </ul>
    </div>`;
}