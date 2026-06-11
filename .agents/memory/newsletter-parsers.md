---
name: Newsletter parser formats
description: How each Austin newsletter is parsed; key quirks and fixes applied
---

## parseLumaStyle (What's Weird ATX, Luma)
- TIME_LINE regex matches "7:30pm @ The Stage – Sterling Events Center..." — extract ONLY the time portion with `line.match(/^\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)/i)?.[0]`
- Long titleLine (>80 chars) = description being used as title — truncate to first phrase before `.!?—|`
- venueLine "To see N more picks for Thursday, click here!" must be excluded from hasVenue via `/to see \d+ more/i`

## parseDateColonStyle (Austin Business Review)
- DATE_COLON_LINE regex must use `[a-z]*` after month abbreviation: `/^(jan|...|jun)[a-z]*\.?\s+(\d{1,2}):\s+(.+)/i` to match full month names like "June 11: Event"
- Without `[a-z]*`, "June 11: ..." fails to match and genericParser runs instead, picking up section headers like "RECOMMENDED PARTNERS"

## parseAtxTodayStyle (ATX Today / 6AM City)
- Format: `Event Title | time | venue | price`
- Newsletter date appears as `MM.DD.YYYY` at top of email (e.g., "06.11.2026")
- Must require `time !== ""` — shopping/gift items (Father's Day gifts section) don't have times
- Venue parts that match DATE_LINE (recurring date ranges like "Thu, June 11-Aug. 13") must be excluded
- ATX Today detected via body snippet containing "6am city" or MM.DD.YYYY at top

## Source names added
- "What's Weird ATX" — detected by subject match `/what'?s weird atx/i`
- "The Weekly Common" — detected by subject `/weekly common|parks.*books.*beer/i`
- "ATX Today" — detected by body snippet `/6am city|6am austin|atxtoday/i` or `\d{2}\.\d{2}\.\d{4}` in first 200 chars

## Source URLs in event-card.tsx
- "What's Weird ATX": https://whatsweirdatx.substack.com
- "The Weekly Common": https://theweeklycommon.substack.com

**Why:** Each newsletter has unique structure; wrong parser means junk titles (section headers) or shopping items enter the digest. The TIME_LINE extraction bug was the root cause of venue data ending up in date fields for What's Weird ATX events.
