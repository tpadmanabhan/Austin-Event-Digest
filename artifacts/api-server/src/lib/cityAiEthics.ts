import cityAiEthicsData from "../../../../shared/city-ai-ethics.json";

type CityAiEthicsReading = {
  title: string;
  source: string;
  href: string;
  note: string;
};

type CityAiEthicsContent = {
  city: string;
  eyebrow: string;
  intro: string;
  readings: CityAiEthicsReading[];
};

const CITY_AI_ETHICS = cityAiEthicsData as Record<string, CityAiEthicsContent>;

function escapeEthicsHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCityAiEthicsSection(slug: string): string {
  const content = CITY_AI_ETHICS[slug];
  if (!content) return "";

  const readings = content.readings.map((reading) =>
    `<li style="margin-bottom:12px;"><a href="${escapeEthicsHtml(reading.href)}" style="color:#176b55;font-weight:bold;">${escapeEthicsHtml(reading.title)}</a> / ${escapeEthicsHtml(reading.source)}<br />${escapeEthicsHtml(reading.note)}</li>`,
  ).join("");

  return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:22px 24px;margin:0 0 16px;">
    <p style="color:#176b55;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 5px;">${escapeEthicsHtml(content.eyebrow)}</p>
    <h2 style="color:#172b3a;font-size:20px;margin:0 0 10px;">AI Ethics</h2>
    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 14px;">${escapeEthicsHtml(content.intro)}</p>
    <ol style="color:#475569;font-size:13px;line-height:1.65;margin:0;padding-left:20px;">${readings}</ol>
  </div>`;
}
