import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const golfCourseRequestsTable = pgTable("golf_course_requests", {
  id: serial("id").primaryKey(),
  courseName: text("course_name").notNull(),
  courseKey: text("course_key").notNull(),
  address: text("address").notNull(),
  courseWebsite: text("course_website"),
  bookingUrl: text("booking_url"),
  submitterName: text("submitter_name"),
  email: text("email").notNull(),
  notes: text("notes"),
  ipHash: text("ip_hash").notNull(),
  notificationStatus: text("notification_status")
    .$type<"sent" | "failed" | "unconfirmed">().notNull().default("unconfirmed"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("golf_course_requests_course_email_unique").on(table.courseKey, table.email),
  index("golf_course_requests_created_at_idx").on(table.createdAt),
]);

export const insertGolfCourseRequestSchema = createInsertSchema(golfCourseRequestsTable)
  .omit({ id: true, createdAt: true, notifiedAt: true });
export type GolfCourseRequest = typeof golfCourseRequestsTable.$inferSelect;
export type InsertGolfCourseRequest = typeof golfCourseRequestsTable.$inferInsert;
