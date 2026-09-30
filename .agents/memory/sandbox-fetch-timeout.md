---
name: Sandbox fetch timeout
description: A runtime quirk when making local HTTP requests inside CodeExecution's impure function
---

CodeExecution's impure JavaScript function provides `fetch`, but `AbortSignal` was not defined there when tested. Passing `signal: AbortSignal.timeout(...)` failed before the request could be made.

**Why:** A development-only authenticated draft request failed at runtime even though the same fetch worked once the signal option was removed.

**How to apply:** For future CodeExecution impure fetch calls, omit `AbortSignal.timeout` unless its availability is confirmed. Keep network work in the smallest impure function and avoid logging credentials or tokens.