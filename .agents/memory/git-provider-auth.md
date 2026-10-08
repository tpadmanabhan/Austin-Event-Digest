---
name: Git provider authentication
description: Distinguish successful public fetches and connection health from authenticated Git pushes.
---

A successful fetch from a public repository, or a GitHub connection reported as healthy, does not prove that Git push credentials work. Keep local commits intact when a push is rejected and report that GitHub has not been updated.

**Why:** Public fetch succeeded while GitHub rejected push credentials. Connection metadata still reported healthy, and the available integration reconnect forms could not open.

**How to apply:** Judge synchronization by the actual push result. If the reconnect flow is unavailable, use the documented Replit account settings → Git Providers reconnection path rather than repeatedly opening integration forms or inspecting credential values.
