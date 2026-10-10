---
name: Package installation side effects
description: Failed report-tool installations can still alter this web workspace
---

Inspect the workspace diff even after a package installation reports failure; failure does not mean no changes were made.

**Why:** A Python PDF-tool installation failed against an invalid environment but still created unrelated Python scaffolding and changed system dependencies in this pnpm web workspace.

**How to apply:** Prefer the existing Chromium and Poppler tools for standalone report exports. If an installation fails, check and remove only its unrelated scaffolding and dependency changes, using the managed configuration/package tools.
