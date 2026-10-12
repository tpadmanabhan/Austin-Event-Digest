---
name: SQL callback result format
description: Decoding JSON-valued executeSql results without exposing confidential query data
---

The `executeSql` callback's `output` can be CSV with a header, not a JSON document. A JSON-valued cell may be wrapped in quotes with its embedded quotes doubled.

**Why:** Direct JSON parsing and JSON-object extraction both failed because the JSON cell was CSV-escaped.

**How to apply:** Decode the CSV cell before parsing its JSON. For a single-column result, remove the header, unwrap the quoted cell, and unescape doubled quotes; use a proper CSV parser for multiple columns. Check for missing rows first. Keep confidential result cells and derived authentication material inside runtime code and never print them while inspecting formatting.
