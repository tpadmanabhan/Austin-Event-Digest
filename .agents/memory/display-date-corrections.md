---
name: Display-only date corrections
description: Preserve source-backed timestamps when only the readable date caption changes.
---

Treat a display-only date-format correction as distinct from a change to the event's actual schedule. Retain verified source timestamps and timezone when the underlying schedule is unchanged.

**Why:** A formatting correction made website ordering work but initially removed verified structured dates. Checking only the rendered caption would have missed the lost source facts.

**How to apply:** Compare complete raw event objects after date-caption edits, including source-backed start/end timestamps and timezone. Confirm both website ordering and email inclusion before sending; do not infer preservation from a successful edit response.
