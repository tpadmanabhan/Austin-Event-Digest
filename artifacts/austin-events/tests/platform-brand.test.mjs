import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFileSync(new URL(path, `file://${root}/`), "utf8");

test("platform-root experience uses In Real Life identity without legacy platform branding", () => {
  const sources = [
    read("src/components/platform-layout.tsx"),
    read("src/pages/platform-home.tsx"),
    read("src/i18n/platform-home.ts"),
    read("src/contexts/lang-context.tsx"),
    read("index.html"),
  ].join("\n");

  assert.doesNotMatch(sources, /EventCarpooling|eventcarpooling-logo/i);
  assert.match(sources, /In Real Life/);
  assert.match(sources, /\bIRL\b/);
  assert.match(sources, /街と出会う/);
  assert.match(sources, /都市ごとのイベントガイド/);
  assert.match(sources, /application\/ld\+json/);
  assert.match(sources, /og:title/);
  assert.match(sources, /twitter:description/);
});

test("city-page tenant identity and city logo remain owned by the city shell", () => {
  const cityLayout = read("src/components/layout.tsx");
  const metadata = read("src/components/city-page-metadata.tsx");

  assert.match(cityLayout, /eventcarpooling-logo\.svg/);
  assert.match(cityLayout, /alt="Powered by EventCarpooling"/);
  assert.match(cityLayout, /\{tenant\.name\}/);
  assert.match(metadata, /tenant\.name/);
  assert.match(metadata, /EventCarpooling/);
});
