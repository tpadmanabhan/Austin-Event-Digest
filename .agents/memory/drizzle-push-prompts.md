---
name: Drizzle push prompts
description: Non-interactive schema synchronization can report misleading success at a database-safety prompt
---

Do not infer that a database schema was applied solely from a zero exit code when running Drizzle push with closed stdin. A prompt offering to truncate a populated table can be printed, followed by exit code 0 without resolving the prompt. Drizzle may also offer to add a unique constraint that already exists in PostgreSQL.

**Why:** Post-merge synchronization stalled at a subscriber-table truncation question even though its intended unique constraint was present. Repeating the command with closed or piped stdin printed the prompt and exited successfully without making progress.

**How to apply:** Avoid redundant schema pushes on merges without schema changes. On actual schema changes, treat any interactive question as a failure requiring human review; never use force to accept potentially destructive operations merely to make setup pass.