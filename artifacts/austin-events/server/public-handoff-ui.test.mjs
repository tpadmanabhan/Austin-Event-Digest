// Opt-in Playwright checks. Uses the same runtime settings as city-request-ui.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";

test("public startup never flashes the reader view, retains no-JS content, and recovers from failed JS", {
  skip: !process.env.CITY_REQUEST_PLAYWRIGHT_MODULE,
  timeout: 60000,
}, async () => {
  const { chromium } = await import(process.env.CITY_REQUEST_PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({
    executablePath: process.env.CITY_REQUEST_CHROMIUM,
    args: ["--no-sandbox", "--host-resolver-rules=MAP eventcarpooling.com 127.0.0.1"],
  });
  const url = process.env.CITY_REQUEST_UI_URL ?? "http://eventcarpooling.com:23822/";
  const errors = [];
  const createPage = async (javaScriptEnabled = true) => {
    const page = await browser.newPage({ javaScriptEnabled });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", (route) => route.request().method() === "POST" ? route.abort("blockedbyclient") : route.continue());
    return page;
  };
  const entry = (url) => /\/src\/main\.tsx(?:\?|$)|\/assets\/index-[^/]+\.js(?:\?|$)/.test(url);
  try {
    const slow = await createPage();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await slow.route("**/*", async (route) => {
      if (!entry(route.request().url())) return route.fallback();
      await gate;
      await route.continue();
    });
    await slow.goto(url, { waitUntil: "commit" });
    await slow.locator("#public-fallback").waitFor({ state: "attached" });
    assert.equal(await slow.locator("#public-fallback").isVisible(), false);
    assert.equal(await slow.locator("#public-app-loading").isVisible(), true);
    assert.equal(await slow.getByRole("heading", { name: "Find local events and connect with your community." }).count(), 0);
    await slow.waitForFunction(() => document.documentElement.dataset.publicBoot === "pending");
    release();
    await slow.getByRole("heading", { name: /In Real Life/ }).waitFor();
    assert.equal(await slow.locator("#public-fallback").count(), 0);
    assert.equal(await slow.locator("#public-app-loading").count(), 0);
    assert.equal(await slow.locator("html").getAttribute("data-public-boot"), null);
    await slow.close();

    const noJs = await createPage(false);
    await noJs.goto(url);
    assert.equal(await noJs.locator("#public-fallback").isVisible(), true);
    assert.equal(await noJs.locator("#public-app-loading").isVisible(), false);
    assert.match(await noJs.locator("#public-fallback").innerText(), /Find local events/);
    assert.match(await noJs.locator("#public-fallback").innerText(), /Spock/);
    await noJs.close();

    const failed = await createPage();
    await failed.route("**/*", (route) => entry(route.request().url()) ? route.abort("failed") : route.fallback());
    await failed.goto(url);
    assert.equal(await failed.locator("#public-app-loading").isVisible(), true);
    await failed.waitForFunction(() => !document.documentElement.hasAttribute("data-public-boot"), undefined, { timeout: 11000 });
    assert.equal(await failed.locator("#public-fallback").isVisible(), true);
    assert.equal(await failed.locator("#public-app-loading").isVisible(), false);
    await failed.close();

    const about = await createPage();
    await about.goto(new URL("/about", url).href);
    await about.getByRole("heading", { name: /Meet Spock/ }).waitFor();
    assert.equal(await about.locator("#public-fallback").count(), 0);
    assert.equal(await about.locator("#public-app-loading").count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
