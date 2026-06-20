import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  accentColor: text("accent_color").notNull().default("#7c3aed"),
  categories: jsonb("categories").notNull().$type<string[]>(),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type InsertTenant = typeof tenantsTable.$inferInsert;
