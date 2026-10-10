# EventCarpooling summary reference

Preserve the earlier summaries in `.local/outputs/`. The updated editable example is `eventcarpooling-one-page-summary-2026-10-10.html`; locate the newest dated source rather than assuming that file is still current.

## Content

- Multi-city curated events, local newsletters, maps, community participation, and carpool-interest tools where enabled.
- Keep AustinCares prominently identified as a separate local-deals guide.
- Include bilingual Tokyo and major built integrations, with city/configuration availability qualifications.
- Highlight the rebuild from a JavaScript-only shell to server-readable public HTML.
- Link or refer to the verified deployment, not workspace development URLs.

## Refresh metrics

- Count active published local editions from `/api/tenants/list`. Distinguish event cities from the AustinCares deals edition.
- Core code scope: tracked `.ts`, `.tsx`, `.js`, `.mjs`, `.css`, and `.html` files under `artifacts/austin-events`, `artifacts/api-server`, and `lib/db`. Exclude build/dependency directories; include tests, comments, and blank lines.
- Count exact `Published your App` subjects in current Git history. Report publish checkpoints, not successful deployments.
- Load the database skill and use a read-only production aggregate:

```sql
SELECT t.slug, count(*) AS sent_editions
FROM digests d JOIN tenants t ON t.id = d.tenant_id
WHERE d.sent_at IS NOT NULL
GROUP BY t.slug
ORDER BY sent_editions DESC, t.slug;
```

Verify the current sending handler still leaves draft/test previews without a subscriber-send timestamp. Never query or print subscriber contact details for the report.

## Export with existing tools

If available, use Chromium to print the self-contained HTML and Poppler to verify/render the PDF. Discover executable paths rather than assuming them across workspaces.

```bash
chromium --headless --no-sandbox --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=/absolute/path/summary.pdf file:///absolute/path/summary.html
pdfinfo /absolute/path/summary.pdf
pdftotext /absolute/path/summary.pdf -
pdftoppm -f 1 -singlefile -scale-to 1400 -png summary.pdf /tmp/summary-preview
pdftoppm -f 1 -singlefile -r 300 -jpeg -jpegopt quality=95,optimize=y summary.pdf summary
```

For US Letter at 300 DPI, the JPG should be 2550 × 3300. Inspect the final render and assert the PDF page count is one before delivery. Failed package installation can still change workspace configuration; inspect side effects and clean up only installation-created changes using managed tools.
