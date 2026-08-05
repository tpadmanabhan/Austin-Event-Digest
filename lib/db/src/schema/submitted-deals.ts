import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const submittedDealsTable = pgTable("submitted_deals", {
  id: serial("id").primaryKey(),
  // Public-facing deal info (extracted by AI + user-supplied)
  business: text("business").notNull(),
  deal: text("deal").notNull(),
  savings: text("savings").notNull().default(""),
  day: text("day").notNull().default("ANY DAY"),
  locationName: text("location_name").notNull(),
  locationAddress: text("location_address").notNull(),
  imageUrl: text("image_url"),        // object storage path: /api/storage/objects/...
  // lat/lng are added at runtime via startup migration (ADD COLUMN IF NOT EXISTS)
  // and queried via raw SQL to avoid drizzle schema diff on first deploy
  // Submitter info — never returned in public API responses
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubmittedDealSchema = createInsertSchema(submittedDealsTable);
export type InsertSubmittedDeal = typeof submittedDealsTable.$inferInsert;
export type SubmittedDeal = typeof submittedDealsTable.$inferSelect;
