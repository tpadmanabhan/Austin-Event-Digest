---
name: project-one-page-summary
description: Recreate or refresh an evidence-based, printable one-page software project summary, with PDF and optional JPG/HTML exports. Use for project one-pagers, not slide decks or interactive reports.
---

# Project One-Page Summary

## Process

1. Find and inspect the earlier summary, its editable source, and the user's requested changes. Preserve the previous files; export a new dated version unless replacement is explicitly requested.
2. Refresh facts from current code, the verified published site, and read-only production aggregates where appropriate. Do not copy historical counts into a newly dated report.
3. Distinguish **built**, **live**, **disabled**, and **planned** capabilities. Adapter code does not prove that a service is configured or healthy.
4. Preserve the original visual style unless asked to redesign. Include a concise product introduction, a few defensible metrics, capability highlights, integrations, an as-of date, and compact counting notes.
5. Give a requested major rebuild a prominent section, not a footnote. Explain the visible benefit and implementation accurately, with known limitations.
6. Use existing local report/export tools when available; do not scaffold an application, add app dependencies, or publish the website just to make a document.
7. Confirm the final PDF contains **exactly one page**, selectable text, no clipped content, and complete methodology/footer. Render and inspect that final page.
8. If making a JPG, regenerate it from the final verified PDF—not an older draft. Confirm dimensions and image quality. Keep HTML self-contained.
9. Deliver the finished files with `presentAsset`, using workspace-relative paths. Generated outputs belong in a directory ignored by Git and deployments.

## Counting rules

- Completed work items are not a strict feature count. Unmerged work is not necessarily live.
- Define source-code scope explicitly; state whether tests, comments, blank lines, generated files, and other artifacts are included.
- Git publish checkpoints are not verified successful releases. Label the evidence accurately.
- Subscriber-sent newsletter editions are not recipient-email totals. Exclude drafts/test previews; retained records are not necessarily a lifetime sending history.
- Never include secrets, subscriber identities, contact lists, or authenticated URLs.

## AI-readable rebuild wording

Describe server-rendered HTML, readable initial page content, event/venue answer pages, metadata, robots, sitemaps, and **eligible** Event structured data. Do not claim that every event has schema without verifying coverage.

Crawler-header checks demonstrate accessible responses; they do not prove actual indexing, citations, or ranking. JavaScript may still power interactive features.

Read [EventCarpooling export reference](references/eventcarpooling.md) only when working in this project.
