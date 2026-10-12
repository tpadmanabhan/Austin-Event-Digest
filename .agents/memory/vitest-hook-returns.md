---
name: Vitest hook returns
description: The installed Vitest runtime treats a function returned from beforeEach as cleanup
---

Mock-reset hooks must return void, not the mock function.

**Why:** The installed Vitest runtime interprets a function returned by `beforeEach` as cleanup. An implicit return from a mock reset can invoke the mock again after the test, producing unexpected rejected promises even when the tested HTTP handler correctly catches its errors.

**How to apply:** Use block-bodied hooks for reset-only callbacks. When caught mock rejections still fail a test, inspect hook return values before changing production error handling.
