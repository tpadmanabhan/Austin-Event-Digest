// Opt-in browser smoke test using the same runtime settings as city-request-ui.test.mjs.
// No POST may reach a real service.
import { test } from "node:test";
import assert from "node:assert/strict";

test("Spock stays compact, loads cleanly, and accompanies both launch buttons", {
  skip: !process.env.CITY_REQUEST_PLAYWRIGHT_MODULE,
  timeout: 60000,
}, async () => {
  const { chromium } = await import(process.env.CITY_REQUEST_PLAYWRIGHT_MODULE);
  const browser = await chromium.launch({
    executablePath: process.env.CITY_REQUEST_CHROMIUM,
    args: ["--no-sandbox", "--host-resolver-rules=MAP eventcarpooling.com 127.0.0.1"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/**", (route) => route.request().method() === "POST" ? route.abort("blockedbyclient") : route.continue());
  try {
    await page.goto(process.env.CITY_REQUEST_UI_URL ?? "http://eventcarpooling.com:23822/", { waitUntil: "domcontentloaded" });
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const hero = page.getByRole("button", { name: "Launch your city", exact: true });
      const heroSection = hero.locator("xpath=ancestor::section[1]");
      const launch = page.locator("#launch");
      const about = page.getByTestId("section-spock-about");
      for (const section of [heroSection, launch, about]) {
        await section.scrollIntoViewIfNeeded();
        const image = section.getByTestId("img-spock-mascot");
        await image.waitFor();
        await image.evaluate((image) => image.complete ? undefined : new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error("Spock image did not load"));
        }));
        const bounds = await image.boundingBox();
        assert.ok(bounds.width <= 88 && bounds.height <= 61, "The mascot must remain small");
        assert.equal(await image.evaluate((image) => image.naturalWidth), 320);
        assert.match(await image.getAttribute("alt"), /Spock/);
      }
      assert.match(await about.innerText(), /research local events.*city guides.*weekly newsletters/s);
      assert.match(await about.innerText(), /review every city request/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await launch.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const heading = document.querySelector("#launch h2");
        return heading && getComputedStyle(heading.parentElement).opacity === "1";
      });
      if (process.env.SPOCK_SCREENSHOT_DIR) {
        await launch.screenshot({ path: `${process.env.SPOCK_SCREENSHOT_DIR}/spock-launch-${width}.png` });
      }
      await hero.click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      assert.equal(await dialog.locator("input").count(), 2);
      assert.equal(await dialog.getByTestId("img-spock-mascot").count(), 1);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
    }
    await page.getByRole("button", { name: "Toggle language", exact: true }).click();
    const note = page.locator("#launch").getByTestId("note-spock");
    assert.match(await note.innerText(), /Spock/);
    assert.match(await note.innerText(), /[\u3040-\u30ff\u3400-\u9fff]/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
