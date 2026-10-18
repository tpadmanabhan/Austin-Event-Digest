---
name: Workspace send runner restarts
description: What to do when a monitored one-time newsletter send runner is interrupted by a workspace restart.
---

# Workspace send runner restarts

A workspace restart can terminate a managed background shell runner and remove its output log. Do not infer that a scheduled send either happened or did not happen from the runner disappearing.

**Why:** A pending Austin send runner was lost during a workspace restart; checking production metadata confirmed the edition was still unsent, allowing a replacement runner before the requested send time.

**How to apply:** After a runner disappears, immediately check the production edition's `sentAt` and `sentCount` and compare the current city-local time with the requested send time. Re-arm only if it is still before the deadline and production confirms no send. Never send late or automatically retry an ambiguous broadcast.
