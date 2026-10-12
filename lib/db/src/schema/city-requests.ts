import { pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Platform requests are deliberately separate from tenants and subscribers.
export const cityRequestsTable = pgTable("city_requests", {
  id: serial("id").primaryKey(),
  cityName: text("city_name").notNull(),
  cityKey: text("city_key").notNull(),
  email: text("email").notNull(),
  ipHash: text("ip_hash").notNull(),
  // Reserved before sending. Never automatically retry an uncertain delivery.
  notificationStatus: text("notification_status")
    .$type<"sent" | "failed" | "unconfirmed">().notNull().default("unconfirmed"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("city_requests_city_email_unique").on(table.cityKey, table.email),
  index("city_requests_created_at_idx").on(table.createdAt),
]);

export const insertCityRequestSchema = createInsertSchema(cityRequestsTable)
  .omit({ id: true, createdAt: true, notifiedAt: true });
export type CityRequest = typeof cityRequestsTable.$inferSelect;
export type InsertCityRequest = typeof cityRequestsTable.$inferInsert;
