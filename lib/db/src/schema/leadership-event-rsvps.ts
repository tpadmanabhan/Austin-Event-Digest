import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { leadershipEventsTable } from "./leadership-events";

export const leadershipEventRsvpsTable = pgTable("leadership_event_rsvps", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  leadershipEventId: integer("leadership_event_id").notNull().references(() => leadershipEventsTable.id),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("leadership_event_rsvp_tenant_event_email_uq")
    .on(table.tenantId, table.leadershipEventId, table.email),
]);

export type LeadershipEventRsvp = typeof leadershipEventRsvpsTable.$inferSelect;
