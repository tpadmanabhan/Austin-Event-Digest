import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const leadershipEventsTable = pgTable("leadership_events", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  seedKey: text("seed_key"),
  title: text("title").notNull(),
  date: text("date").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  venue: text("venue").notNull(),
  venueAddress: text("venue_address"),
  description: text("description").notNull(),
  link: text("link"),
  category: text("category").notNull(),
  organizer: text("organizer"),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  sourceAlumni: text("source_alumni").notNull(),
  imageUrl: text("image_url"),
  submissionStatus: text("submission_status").notNull().default("approved"),
  submitterName: text("submitter_name"),
  submitterEmail: text("submitter_email"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("leadership_events_tenant_seed_key_uq").on(table.tenantId, table.seedKey),
  index("leadership_events_tenant_active_start_idx").on(table.tenantId, table.isActive, table.startDate),
]);

export type LeadershipEvent = typeof leadershipEventsTable.$inferSelect;
export type InsertLeadershipEvent = typeof leadershipEventsTable.$inferInsert;
