---
name: Mobile city-grid sizing
description: Preventing shared city pages from clipping grid content on narrow screens
---

Responsive grids in city pages should declare an explicit mobile track, such as `grid-cols-1`, before adding `sm:`, `md:`, or `lg:` multi-column layouts. A bare `grid` with only a larger-breakpoint column definition can leave auto-sized implicit tracks that retain content's intrinsic width.

**Why:** The shared city hero's implicit mobile track stayed over 500px wide inside an overflow-hidden section, cutting off text and signup cards rather than allowing them to wrap.

**How to apply:** Use explicit base grid columns in shared homepage and full-edition layouts. Verify phone widths in a browser and inspect inner grid widths; document scroll width alone can miss content clipped by an ancestor.
