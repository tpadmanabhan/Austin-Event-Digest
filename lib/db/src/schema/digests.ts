import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const EventItemSchema = z.object({
  title: z.string(),
  date: z.string(),
  venue: z.string(),
  description: z.string(),
  link: z.string().nullable().optional(),
  category: z.string(),
  imageUrl: z.string().nullable().optional(),
});

export type EventItem = z.infer<typeof EventItemSchema>;

export const digestsTable = pgTable("digests", {
  id: serial("id").primaryKey(),
  weekOf: timestamp("week_of").notNull(),
  subject: text("subject").notNull(),
  intro: text("intro").notNull(),
  events: jsonb("events").notNull().$type<EventItem[]>(),
  sentAt: timestamp("sent_at"),
  sentCount: integer("sent_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDigestSchema = createInsertSchema(digestsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertDigest = z.infer<typeof insertDigestSchema>;
export type Digest = typeof digestsTable.$inferSelect;
