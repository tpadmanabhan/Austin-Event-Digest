import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  accentColor: text("accent_color").notNull().default("#7c3aed"),
  categories: jsonb("categories").notNull().$type<string[]>(),
  digestTitle: text("digest_title"),
  curatorName: text("curator_name"),
  passwordHash: text("password_hash"),
  adminEmail: text("admin_email"),
  heroImageUrl: text("hero_image_url"),
  brandIconUrl: text("brand_icon_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  firstRun: boolean("first_run").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Tenant = typeof tenantsTable.$inferSelect;
export type InsertTenant = typeof tenantsTable.$inferInsert;
