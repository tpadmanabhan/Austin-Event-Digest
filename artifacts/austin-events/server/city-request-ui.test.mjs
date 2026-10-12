// Opt-in browser test; all city-request POSTs are intercepted, never delivered.
// Run with CITY_REQUEST_PLAYWRIGHT_MODULE pointing to an installed Playwright module,
// CITY_REQUEST_CHROMIUM pointing to Chromium, and CITY_REQUEST_UI_URL to the dev app.
import { test } from "node:test";
import assert from "node:assert/strict";

test("city request form: both buttons, validation, loading, retries, keyboard and mobile", {
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
  let posts = 0;
  let reply = { status: 201, body: { saved: true, duplicate: false, notificationStatus: "sent", acknowledgementStatus: "sent" } };
  let delay = false;
  let release;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    assert.equal(new URL(request.url()).pathname, "/api/city-requests", "No tenant/signup/newsletter POST allowed");
    posts++;
    assert.deepEqual(Object.keys(request.postDataJSON()).sort(), ["cityName", "email"]);
    if (delay) await new Promise((resolve) => { release = resolve; });
    if (reply.status === 0) return route.abort("failed");
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });

  try {
    await page.goto(process.env.CITY_REQUEST_UI_URL ?? "http://eventcarpooling.com:23822/", { waitUntil: "domcontentloaded" });
    const hero = page.getByRole("button", { name: "Launch your city", exact: true });
    const footer = page.getByRole("button", { name: "Request your city", exact: true });
    const dialog = page.getByRole("dialog");
    const submit = page.getByRole("button", { name: "Submit request", exact: true });
    const checkLaunchAnchor = async () => {
      await page.locator("header a[href='#launch']").click();
      await page.waitForFunction(() => {
        const header = document.querySelector("header")?.getBoundingClientRect();
        const launch = document.getElementById("launch")?.getBoundingClientRect();
        return header && launch && launch.top >= header.bottom + 12;
      });
      const heading = await page.locator("#launch h2").boundingBox();
      const header = await page.locator("header").boundingBox();
      assert.ok(heading.y >= header.y + header.height + 16, "Launch heading must clear the sticky header");
    };
    await hero.waitFor();
    await checkLaunchAnchor();
    await hero.click();
    await dialog.waitFor();
    assert.equal(await dialog.locator("input").count(), 2);
    assert.equal(await page.getByLabel("City name").isEnabled(), true);
    await page.getByLabel("City name").fill("A");
    await page.getByLabel("Email address").fill("wrong");
    assert.equal(await submit.isDisabled(), true);
    await page.getByLabel("City name").fill("London");
    await submit.click();
    assert.equal(await page.getByLabel("Email address").evaluate((input) => input.checkValidity()), false);
    assert.equal(posts, 0);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await hero.evaluate((button) => document.activeElement === button), true);

    await footer.click();
    await dialog.waitFor();
    assert.equal(await page.getByLabel("City name").inputValue(), "");
    await page.getByLabel("City name").fill("London");
    await page.getByLabel("Email address").fill("test@example.invalid");
    delay = true;
    await submit.click();
    await page.getByRole("button", { name: "Submitting request…" }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Submitting request…" }).isDisabled(), true);
    // Even multiple programmatic submits in the same render cannot repeat the POST.
    await dialog.locator("form").evaluate((form) => { form.requestSubmit(); form.requestSubmit(); });
    assert.equal(posts, 1);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await hero.click();
    await page.getByRole("button", { name: "Submitting request…" }).waitFor();
    delay = false;
    release();
    await page.getByRole("heading", { name: "Request saved" }).waitFor();
    assert.match(await page.getByRole("status").innerText(), /team|notification|manual/);
    assert.match(await page.getByRole("status").innerText(), /acknowledgement email to test@example.invalid was accepted/);
    if (process.env.CITY_REQUEST_RECEIPT_SCREENSHOT) {
      await page.screenshot({ path: process.env.CITY_REQUEST_RECEIPT_SCREENSHOT });
    }
    await page.getByRole("button", { name: "Close", exact: true }).first().click();
    await dialog.waitFor({ state: "hidden" });

    await hero.click();
    await page.getByLabel("City name").fill("Paris");
    await page.getByLabel("Email address").fill("test@example.invalid");
    reply = { status: 503, body: { message: "Your request could not be saved. Please try again." } };
    await submit.click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("City name").inputValue(), "Paris");
    reply = { status: 201, body: { saved: true, duplicate: false, notificationStatus: "failed", acknowledgementStatus: "failed" } };
    await submit.click();
    await page.getByRole("heading", { name: "Request saved" }).waitFor();
    assert.match(await page.getByRole("status").innerText(), /saved, but.*could not be confirmed/s);
    assert.match(await page.getByRole("status").innerText(), /acknowledgement email could not be confirmed/);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });

    await page.setViewportSize({ width: 375, height: 812 });
    await checkLaunchAnchor();
    await footer.click();
    await dialog.waitFor();
    await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 376);
    await page.getByLabel("City name").fill("Tokyo");
    await page.keyboard.press("Tab");
    assert.equal(await page.getByLabel("Email address").evaluate((input) => document.activeElement === input), true);
    await page.keyboard.type("test@example.invalid");
    reply = { status: 0, body: {} };
    await submit.click();
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /Connection error/);
    reply = { status: 200, body: { saved: true, duplicate: true, notificationStatus: "unconfirmed", acknowledgementStatus: "unconfirmed" } };
    await submit.click();
    await page.getByRole("heading", { name: "Request saved" }).waitFor();
    assert.match(await page.getByRole("status").innerText(), /No duplicate admin notification was sent/);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await footer.click();
    await dialog.waitFor();
    assert.equal(await page.getByLabel("City name").inputValue(), "");
    assert.equal(await page.getByLabel("Email address").inputValue(), "");
    // Optional ignored output directory for visual inspection of the real modal.
    if (process.env.CITY_REQUEST_SCREENSHOT) {
      await dialog.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      await page.screenshot({ path: process.env.CITY_REQUEST_SCREENSHOT });
    }
    assert.deepEqual(errors, []);
    console.log(`Browser checks passed (${posts} intercepted submissions; zero real notifications).`);
  } finally {
    await browser.close();
  }
});
