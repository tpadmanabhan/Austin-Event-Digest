/** Austin's editorial reading card, rendered with email-safe inline styles. */
export function buildAustinAiEthicsSection(): string {
  return `
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:22px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; color:#1f2937; font-size:20px; font-weight:700;">AI Ethics</h2>
      <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.7;">AI can help us plan, but it cannot replace friends, new experiences, or time outside. My latest post explores why human connection and real-life curiosity still matter. Dan Harris’s podcast offers simple ways to calm the nervous system—and asks why scrolling is not the same as rest. Dr. Sanjay Gupta explores the promise and risks of giving AI our medical records. For an IRL leadership perspective, Admiral William H. McRaven’s <em>The Wisdom of the Bullfrog</em> brings the focus back to character, responsibility, and showing up for others. Use technology to help you get out there, not keep you scrolling.</p>
      <ul style="margin:16px 0 0; padding-left:20px; color:#4b5563; font-size:14px; line-height:1.8;">
        <li style="margin-bottom:10px;"><a href="https://customersuccessforgood.com/2026/10/07/ai-doesnt-solve-this/" style="color:#047857; text-decoration:underline;">AI Doesn’t Solve This</a> — Raj’s blog</li>
        <li style="margin-bottom:10px;"><a href="https://podcasts.apple.com/us/podcast/10-happier-with-dan-harris/id1087147821?i=1000793503590" style="color:#047857; text-decoration:underline;">10% Happier with Dan Harris</a> — Calm Your Nervous System: simple daily practices with Nadia Narain and Katia Narain Phillips</li>
        <li style="margin-bottom:10px;"><a href="https://podcasts.apple.com/us/podcast/chasing-life-with-dr-sanjay-gupta/id1501029683?i=1000791424717" style="color:#047857; text-decoration:underline;">Chasing Life with Dr. Sanjay Gupta</a> — Should You Give AI Your Medical Records? Sanjay Did.</li>
        <li><a href="https://www.amazon.com/Wisdom-Bullfrog-Leadership-Made-Simple/dp/1538707942" style="color:#047857; text-decoration:underline;">IRL Lifestyle Book of the Week: The Wisdom of the Bullfrog</a> — Leadership Made Simple (But Not Easy), by Admiral William H. McRaven</li>
      </ul>
    </div>`;
}