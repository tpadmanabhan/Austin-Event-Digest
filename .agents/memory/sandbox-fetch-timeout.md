---
name: Sandbox web globals
description: CodeExecution exposes different web globals in durable and impure scopes
---

CodeExecution's durable scope does not provide `URL` or `Intl`; parse URLs and format time zones inside a small impure function instead. The impure scope provides `URL`, `Intl`, and `fetch`, but `AbortSignal` was not defined there when tested. Treat impure-function parameters as immutable; assign transformed data to a new local variable instead of reassigning a parameter.

**Why:** URL parsing and `Intl.DateTimeFormat` failed in durable scope but worked in impure scope. Reassigning an impure function's array parameter failed with “Assignment to constant variable.” An authenticated fetch failed with `AbortSignal.timeout(...)`, but worked once the signal option was removed.

**How to apply:** Put URL parsing, time-zone formatting, and network work in the smallest impure function, passing inputs explicitly. Use a new local variable for filtered arrays. Omit `AbortSignal.timeout` unless its availability is confirmed, and never log credentials or tokens.