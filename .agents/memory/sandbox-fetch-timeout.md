---
name: Sandbox web globals
description: CodeExecution exposes different web globals in durable and impure scopes
---

CodeExecution's durable scope does not provide `URL` or `Intl`; parse URLs and format time zones inside a small impure function instead. The impure scope provides `URL`, `Intl`, and `fetch`, but `AbortSignal` was not defined there when tested. Treat impure-function parameters as immutable; assign transformed data to a new local variable instead of reassigning a parameter.

**Why:** URL parsing and `Intl.DateTimeFormat` failed in durable scope but worked in impure scope. Reassigning an impure function's array parameter failed with “Assignment to constant variable.” An authenticated fetch failed with `AbortSignal.timeout(...)`, but worked once the signal option was removed.

**How to apply:** Put URL parsing, time-zone formatting, and network work in the smallest impure function, passing inputs explicitly. Use a new local variable for filtered arrays. Omit `AbortSignal.timeout` unless its availability is confirmed, and never log credentials or tokens.

`structuredClone` may also be unavailable inside an impure function. For plain JSON request data, use `JSON.parse(JSON.stringify(value))` when a deep copy is necessary.

**Why:** An event-update preflight failed before making any requests because `structuredClone` was undefined; a JSON round-trip copy worked.

**How to apply:** Use this alternative only for JSON-compatible data, not dates, buffers, or other typed objects. If a preflight fails, confirm whether any side effects occurred before retrying.

The durable runtime may also reject `Date.now()` as disabled. Obtain real operation timestamps inside the impure function performing the request, and return the timestamp with the safe result.

**Why:** A draft-send preflight stopped at `Date.now()` in durable scope; moving timestamp capture into the impure request function worked.

**How to apply:** Use the returned timestamp for subsequent log queries. If timestamp capture fails before a side-effecting request, fix it before sending; never retry a completed email send merely to obtain a timestamp.

## Background processes

Start delayed or long-running shell processes with the managed background shell tool, not a detached child process inside CodeExecution.

**Why:** CodeExecution did not provide a usable `process.execPath`; attempting to spawn Node directly disconnected its worker without starting a confirmed background process.

**How to apply:** Keep credentials in runtime memory or use existing environment secrets without printing them. Use the managed background task ID to monitor completion; do not assume an untracked child process survived.