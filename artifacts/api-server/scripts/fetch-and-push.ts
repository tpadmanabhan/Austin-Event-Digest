/**
 * Standalone script: runs event source adapters directly from source code
 * and PATCHes results into production digests via the live API.
 * Run with: cd artifacts/api-server && npx tsx scripts/fetch-and-push.ts
 */
import { createHmac } from "crypto";
import { eventbriteWebAdapter } from "../src/lib/eventSources/eventbriteWeb";
import { ticketmasterAdapter } from "../src/lib/eventSources/ticketmaster";
import { meetupAdapter } from "../src/lib/eventSources/meetup";
import { bandsintownAdapter } from "../src/lib/eventSources/bandsintown";
import { songkickAdapter } from "../src/lib/eventSources/songkick";
import type { SourceQuery } from "../src/lib/eventSources/types";
import type { EventItem } from "@workspace/db";

// ── Tenant config ────────────────────────────────────────────────────────────
const TENANTS = [
  {
    subdomain: "austincares",
    city: "Austin, TX",
    digestId: 85,
    weekOf: new Date("2026-07-27T00:00:00Z"),
    weekEnd: new Date("2026-08-02T23:59:59Z"),
    categories: ["Tech", "Music", "Arts", "Food", "Civics", "Wellness", "Sports"],
    passwordHash: "da297117bd280d438b4082b00b0b0159d2024bbfaa643509f07e2e4ecb8a1febd3f49f9b8da2ad15e52086092b686c81e506cb9a1b4bbeaaed0d69d62cc98d95:093f8368e18871dbd11b9afe9b832970",
  },
  {
    subdomain: "sacramento",
    city: "Sacramento, CA",
    digestId: 77,
    weekOf: new Date("2026-07-26T00:00:00Z"),
    weekEnd: new Date("2026-08-01T23:59:59Z"),
    categories: ["Tech", "Music", "Arts", "Food", "Civics", "Wellness", "Sports"],
    passwordHash: "dfd88f4cf97acdb339541d35c18dc5d5b63d8156987d09ada1bd0e2d0d59c720d3a9dc7fc9f3b0c719ebcdcbb1616426f83a8e1931b418c08d94c00f1238f56d:34de22808925446d571bcbd38ed5dc56",
  },
  {
    subdomain: "portland",
    city: "Portland, OR",
    digestId: 71,
    weekOf: new Date("2026-07-26T00:00:00Z"),
    weekEnd: new Date("2026-08-01T23:59:59Z"),
    categories: ["Tech", "Music", "Arts", "Food", "Civics", "Wellness", "Sports"],
    passwordHash: "7af356df13f43e6b5052fcdb53685d56f094934c645235c7063120eecd526c2cef55cae6802083eeb77b4ec17ba18e42e0f135822b62fa3d39b0d8a659d1b3f4:9ff84c03e62e7101770cbf036df75eb8",
  },
  {
    subdomain: "bulverde",
    city: "Bulverde, TX",
    digestId: 81,
    weekOf: new Date("2026-07-26T00:00:00Z"),
    weekEnd: new Date("2026-08-01T23:59:59Z"),
    categories: ["Tech", "Music", "Arts", "Food", "Civics", "Wellness", "Sports"],
    passwordHash: "e93382132390c96a7f24d27f21aacb08e3f70eba1fc555e69084bd15f7a90a4ade775c48a544880402b5f0b3d6eb4173a7fa7204648603d1881706bedbb40587:b32fb2673c07b8a661330426eeed8bfe",
  },
  {
    subdomain: "stlouis",
    city: "St. Louis, MO",
    digestId: 87,
    weekOf: new Date("2026-08-02T00:00:00Z"),
    weekEnd: new Date("2026-08-08T23:59:59Z"),
    categories: ["Tech", "Music", "Arts", "Food", "Civics", "Wellness", "Sports"],
    passwordHash: "9d0832717c9df457ca033d96018c1efa68a6a718e09d6ff125a23df8912d6757f0755fbb4b8297a2a90ff5544322d37c6d6f5944617631412099170ea9653588:d159f509ac83fbf04fd7dd77f37ef4d0",
  },
];

// Adapters to run (in order, per category)
const ADAPTERS_BY_CATEGORY: Record<string, typeof eventbriteWebAdapter[]> = {
  Tech:             [eventbriteWebAdapter, meetupAdapter],
  Music:            [bandsintownAdapter, songkickAdapter, eventbriteWebAdapter, ticketmasterAdapter],
  "Arts":           [eventbriteWebAdapter, ticketmasterAdapter],
  "Arts & Culture": [eventbriteWebAdapter, ticketmasterAdapter],
  Food:             [eventbriteWebAdapter],
  Civics:           [meetupAdapter, eventbriteWebAdapter],
  Wellness:         [meetupAdapter, eventbriteWebAdapter],
  Sports:           [eventbriteWebAdapter, ticketmasterAdapter],
};

function adminToken(passwordHash: string): string {
  return createHmac("sha256", passwordHash).update("admin-session").digest("hex");
}

function dedupe(events: EventItem[]): EventItem[] {
  const seen = new Set<string>();
  return events.filter(e => {
    const key = e.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getCurrentEvents(subdomain: string, token: string, digestId: number): Promise<EventItem[]> {
  const res = await fetch(`https://${subdomain}.eventcarpooling.com/api/events/digest/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await res.json() as any[];
  const digest = list.find((d: any) => d.id === digestId);
  return (digest?.events ?? []) as EventItem[];
}

async function fetchEventsForCity(tenant: typeof TENANTS[0]): Promise<EventItem[]> {
  const allEvents: EventItem[] = [];
  const seen = new Set<string>();

  await Promise.allSettled(
    tenant.categories.flatMap(category => {
      const adapters = ADAPTERS_BY_CATEGORY[category] ?? [];
      return adapters.map(async adapter => {
        const query: SourceQuery = {
          city: tenant.city,
          category,
          weekOf: tenant.weekOf,
          weekEnd: tenant.weekEnd,
        };
        try {
          const events = await adapter.fetchEvents(query);
          for (const ev of events) {
            const key = ev.title.toLowerCase().replace(/\s+/g, "").substring(0, 40);
            if (!seen.has(key)) {
              seen.add(key);
              allEvents.push(ev);
            }
          }
          if (events.length > 0) {
            console.log(`  ✓ ${adapter.name}/${category}: ${events.length} events`);
          }
        } catch (err) {
          console.log(`  ✗ ${adapter.name}/${category}: ${(err as Error).message?.substring(0, 60)}`);
        }
      });
    })
  );

  return allEvents;
}

async function patchDigest(subdomain: string, token: string, digestId: number, events: EventItem[]): Promise<void> {
  const res = await fetch(`https://${subdomain}.eventcarpooling.com/api/events/digest/${digestId}/events`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH failed ${res.status}: ${text.substring(0, 100)}`);
  }
}

async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log("Event fetch-and-push script");
  console.log(`TM key status: ${process.env.TICKETMASTER_API_KEY ? "SET (" + (process.env.TICKETMASTER_API_KEY.length) + " chars)" : "MISSING"}`);
  console.log("=".repeat(60));

  for (const tenant of TENANTS) {
    console.log(`\n── ${tenant.subdomain.toUpperCase()} (digest ${tenant.digestId}) ──`);
    const token = adminToken(tenant.passwordHash);

    // Get current events in the digest
    let existing: EventItem[] = [];
    try {
      existing = await getCurrentEvents(tenant.subdomain, token, tenant.digestId);
      console.log(`  Existing events: ${existing.length}`);
    } catch (err) {
      console.log(`  Could not fetch existing events: ${(err as Error).message}`);
    }

    // Fetch new events from adapters
    console.log(`  Fetching from adapters...`);
    const newEvents = await fetchEventsForCity(tenant);
    console.log(`  New events found: ${newEvents.length}`);

    if (newEvents.length === 0) {
      console.log(`  ⚠ No new events found — skipping PATCH`);
      continue;
    }

    // Merge and deduplicate
    const merged = dedupe([...existing, ...newEvents]);
    const added = merged.length - existing.length;
    console.log(`  Merged: ${existing.length} existing + ${newEvents.length} new → ${merged.length} total (${added} net new)`);

    // PATCH into production
    try {
      await patchDigest(tenant.subdomain, token, tenant.digestId, merged);
      console.log(`  ✅ Patched digest ${tenant.digestId} → ${merged.length} events`);
    } catch (err) {
      console.log(`  ❌ PATCH failed: ${(err as Error).message}`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("Done.");
}

main().catch(console.error);
