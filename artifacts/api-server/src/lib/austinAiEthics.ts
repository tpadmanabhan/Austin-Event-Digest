/** Austin's editorial reading card, rendered with email-safe inline styles. */
export function buildAustinAiEthicsSection(): string {
  return `
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; padding:22px; margin-bottom:24px;">
      <h2 style="margin:0 0 12px; color:#1f2937; font-size:20px; font-weight:700;">AI Ethics</h2>
      <p style="margin:0; color:#4b5563; font-size:15px; line-height:1.7;">Responsible technology should make digital experiences easier to use, support real-world connection, and be built around the people it serves. This week, I’m connecting those ideas to my website rebuild, a story about community builders, and a sports-tech hackathon.</p>
      <ul style="margin:16px 0 0; padding-left:20px; color:#4b5563; font-size:14px; line-height:1.8;">
        <li style="margin-bottom:10px;"><a href="https://eventcarpooling.com/" style="color:#047857; text-decoration:underline;">Rebuilding EventCarpooling.com for a better user experience</a> — I’m improving the site so finding local events feels clearer and easier.</li>
        <li style="margin-bottom:10px;"><a href="https://www.theatlantic.com/health/2026/10/community-builders/688947/" style="color:#047857; text-decoration:underline;">The Rise of the IRL Influencer</a> — Nancy Walecki on community builders bringing people together offline.</li>
        <li style="margin-bottom:10px;"><a href="https://luma.com/i1m74hz4" style="color:#047857; text-decoration:underline;">Spurs² Hackathon @ UT Austin</a> — I’m participating in a hackathon with the San Antonio Spurs and partners to build AI-powered sports media tools.</li>
        <li><a href="https://eventcarpooling.com/" style="color:#047857; text-decoration:underline;">Want an event page for your city?</a> — Make a request; customization is also considered for each city.</li>
      </ul>
    </div>`;
}