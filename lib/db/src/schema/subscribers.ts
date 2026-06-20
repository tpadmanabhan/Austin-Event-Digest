import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subscribersTable = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenantsTable.id),
  email: text("email").notNull().unique(),
  name: text("name"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const insertSubscriberSchema = createInsertSchema(subscribersTable).omit({
  id: true,
  subscribedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribersTable.$inferSelect;
