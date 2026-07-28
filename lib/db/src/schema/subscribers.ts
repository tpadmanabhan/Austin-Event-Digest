import { pgTable, text, serial, timestamp, boolean, integer, doublePrecision, unique } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  email: text("email").notNull(),
  name: text("name"),
  birthMonth: integer("birth_month"),
  birthDay: integer("birth_day"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Radius discovery (Austin only — Task #44)
  anchorLat: doublePrecision("anchor_lat"),
  anchorLng: doublePrecision("anchor_lng"),
  radiusMiles: integer("radius_miles").default(3).notNull(),
  walkableOnly: boolean("walkable_only").default(false).notNull(),
}, (t) => [
  unique("subscribers_tenant_email").on(t.tenantId, t.email),
]);

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  id: true,
  subscribedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
