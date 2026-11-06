import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const centinelaResidentsTable = pgTable(
  "centinela_residents",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("centinela_residents_tenant_email").on(table.tenantId, table.email)],
);

export const centinelaUpdatesTable = pgTable("centinela_updates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("HOA"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const centinelaActivitiesTable = pgTable("centinela_activities", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id")
    .notNull()
    .references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default("Details to be decided"),
  timingLabel: text("timing_label").notNull().default("Proposed — date and time to be determined"),
  status: text("status").notNull().default("proposed"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const centinelaActivityInterestsTable = pgTable(
  "centinela_activity_interests",
  {
    id: serial("id").primaryKey(),
    tenantId: integer("tenant_id")
      .notNull()
      .references(() => tenantsTable.id, { onDelete: "cascade" }),
    activityId: integer("activity_id")
      .notNull()
      .references(() => centinelaActivitiesTable.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("centinela_activity_interests_user").on(
      table.tenantId,
      table.activityId,
      table.clerkUserId,
    ),
  ],
);

export const insertCentinelaResidentSchema = createInsertSchema(centinelaResidentsTable).omit({
  id: true,
  createdAt: true,
});
export const insertCentinelaUpdateSchema = createInsertSchema(centinelaUpdatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCentinelaActivitySchema = createInsertSchema(centinelaActivitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCentinelaActivityInterestSchema = createInsertSchema(
  centinelaActivityInterestsTable,
).omit({
  id: true,
  createdAt: true,
});

export type CentinelaResident = typeof centinelaResidentsTable.$inferSelect;
export type InsertCentinelaResident = z.infer<typeof insertCentinelaResidentSchema>;
export type CentinelaUpdate = typeof centinelaUpdatesTable.$inferSelect;
export type InsertCentinelaUpdate = z.infer<typeof insertCentinelaUpdateSchema>;
export type CentinelaActivity = typeof centinelaActivitiesTable.$inferSelect;
export type InsertCentinelaActivity = z.infer<typeof insertCentinelaActivitySchema>;
export type CentinelaActivityInterest = typeof centinelaActivityInterestsTable.$inferSelect;
export type InsertCentinelaActivityInterest = z.infer<
  typeof insertCentinelaActivityInterestSchema
>;
