---
name: verify-ai-readable-pages
description: Verify that a published website returns useful public HTML without JavaScript. Use when checking AI/crawler readability, server rendering, event schema, or whether a rebuild is actually live. Not a search-ranking or AI-citation audit.
---

# Verify AI-Readable Public Pages

## Process

1. Obtain the current published URL through the deployment skill. Workspace previews and successful builds are not proof of what is live.
2. Fetch the actual public document over HTTP without executing JavaScript. Parse **body text**, excluding scripts, styles, and serialized JSON. A title, description, or event name inside a data script is not readable page content.
3. Check the introduction, headings, useful links, direct answers, and real event details. Inspect a homepage, a city/collection page, one event, and one venue when applicable. Follow links present in the response; do not invent URLs.
4. Repeat representative requests with ordinary-browser and crawler user-agent headers. Say exactly what was tested: header-based requests do not prove the real crawler visited, indexed, or cited the site.
5. Check real robots and XML sitemap responses, canonical URLs, tenant branding, and public resource statuses. Never follow signed subscriber links or submit forms during a read-only audit.
6. Parse event JSON-LD separately. Confirm its name, dates, venue, and address agree with verified visible facts. Inspect multiple samples: one eligible event does not establish full coverage.
7. Report live results separately from workspace-only fixes. Include direct links and limitations; do not promise search rankings, citations, ride bookings, or unavailable features.

## Reusable check

Run the bundled standard-library script against a public URL:

```bash
python .agents/skills/verify-ai-readable-pages/scripts/check_html.py https://example.com/
```

It reports body text, headings, links, schema types, and crawler-header parity. Review the content, not just the word count. This is an HTTP check, not a browser or indexing test.

## Production failures

If the document fails but its public API works, inspect the published web-service configuration and logs before editing. Test the **default production API origin**, not only a mocked override. A workspace-only loopback proxy can pass local tests and fail after publishing. Preserve tenant hosts and privacy boundaries.

For this project's implementation and acceptance checks, read [EventCarpooling checks](references/eventcarpooling.md).

## Report format

- Live URL and check time.
- HTTP status and examples of text present without JavaScript.
- Crawler headers tested and content differences, if any.
- Event-schema coverage: verified, partial, or unavailable.
- Working city/event/venue/About links.
- What remains unpublished or unverified.

Do not replace React/JavaScript merely because source files are JavaScript. Server-rendered JavaScript can deliver complete HTML; verify the response.
