---
name: Tailwind @theme inline blocks resist runtime CSS var overrides
description: Why setting --color-primary etc. via JS at runtime does nothing when index.css uses "@theme inline"
---

When a project's Tailwind CSS entry uses `@theme inline { --color-primary: hsl(var(--primary)); ... }`, utilities like `text-primary`/`bg-primary` compile directly to reference the underlying raw variable (e.g. `color: hsl(var(--primary))`), NOT `var(--color-primary)`. Setting `--color-primary` on `documentElement.style` at runtime (e.g. for per-tenant theming) has no visible effect, since nothing reads that variable name.

**Why:** `@theme inline` inlines/expands theme tokens at build time into the raw var reference rather than keeping `--color-*` as an indirection layer consumers read at runtime.

**How to apply:** For runtime/per-tenant theme overrides in a codebase using `@theme inline`, set the raw `:root` variable names directly (e.g. `--primary`, `--secondary`, `--background`, `--foreground`, `--accent`, `--ring`, `--muted`, `--sidebar*`) using the same format already used in `:root` (e.g. bare `"H S% L%"` HSL triplet, not a hex string and not wrapped in `hsl(...)`). Verify by actually diffing rendered colors, not just by reading the override code — a plausible-looking override can silently be a no-op.
