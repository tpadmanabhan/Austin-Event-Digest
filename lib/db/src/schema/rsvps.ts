import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const rsvpsTable = pgTable("rsvps", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  digestId: integer("digest_id").notNull(),
  eventTitle: text("event_title").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("rsvp_unique").on(t.tenantId, t.digestId, t.eventTitle, t.email),
]);

export type Rsvp = typeof rsvpsTable.$inferSelect;
