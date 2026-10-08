---
name: Custom date range digests
description: Coverage audits, strict visible cutoffs, and sent-history preservation for extended editions
---

## Required post-generation audit
Custom-range generation can include events from the previous local calendar day because source timestamps cross UTC boundaries. Broad Ticketmaster results can also collapse unrelated categories into Arts, leaving Tech or Civics unrepresented.

**Why:** A custom Austin generation included events from the day before its requested start and produced an overwhelmingly Arts-heavy list despite all five tenant categories being configured.

**How to apply:** Before keeping a custom-range digest, remove out-of-range events, validate stated weekdays against numerical dates, deduplicate titles, and confirm intentional representation of every configured category.

Longer editions can also fill the generation cap on the first few busy days, leaving later requested dates empty even though matching events exist.

**Why:** A ten-day city edition initially returned only events from the first few days despite live events later in the requested range.

**How to apply:** Audit every date in the requested span, not just the total count; curate verified later events rather than assuming generation covers the entire range.

## Strict date cutoffs apply to visible copy
When a user requests date references only from the edition's start onward, audit the complete rendered text, not just event date fields.

**Why:** Filtering event dates alone left earlier dates in a curator intro and an ongoing festival's description.

**How to apply:** Check intros, labels, descriptions, and spotlights. Describe an ongoing event's remaining day without repeating its earlier start. Preserve original source links; historical dates inside URLs are not visible editorial copy.

## Preserve previously sent editions
Prepare a date-range update as a new unsent draft rather than overwriting a previously sent edition, unless the user explicitly requests an in-place change.

**Why:** This preserves the original sent history and existing edition references while allowing review of the updated content.

**How to apply:** Clone the complete stored array into the new draft, retain relevant events and spotlights, and keep draft sends scoped to the explicitly requested test recipient.
