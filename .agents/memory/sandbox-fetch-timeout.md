---
name: Sandbox web globals
description: CodeExecution exposes different web globals in durable and impure scopes
---

CodeExecution's durable scope does not provide `URL`; construct and parse URLs inside a small impure function instead. The impure scope provides `URL` and `fetch`, but `AbortSignal` was not defined there when tested.

**Why:** URL parsing failed before a request in durable scope, then succeeded in impure scope. An authenticated fetch also failed with `AbortSignal.timeout(...)`, but worked once the signal option was removed.

**How to apply:** Put URL parsing and network work in the smallest impure function, passing inputs explicitly. Omit `AbortSignal.timeout` unless its availability is confirmed, and never log credentials or tokens.