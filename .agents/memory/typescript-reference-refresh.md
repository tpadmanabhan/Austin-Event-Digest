---
name: TypeScript reference refresh
description: Generated contracts and shared schema edits can leave consumers using stale referenced declarations
---

Rebuild shared TypeScript project references after changing generated contracts or database schema types, before checking consuming artifacts.

**Why:** Code generation completed successfully, but both server and test typechecks still reported new fields as missing until the shared references were rebuilt. Do not assume the codegen command refreshes those declarations in this workspace.

**How to apply:** Run the root `typecheck:libs` script after shared changes. If source contains a field that consumer typechecks cannot see, check referenced declaration freshness before rewriting valid code or editing generated declarations manually.
