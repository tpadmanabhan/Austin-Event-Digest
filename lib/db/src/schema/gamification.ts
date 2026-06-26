import { pgTable, text, serial, timestamp, integer, jsonb, unique } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const xpLedgerTable = pgTable("xp_ledger", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const earnedBadgesTable = pgTable("earned_badges", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  badgeId: text("badge_id").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
}, (t) => ({
  uniq: unique("earned_badges_tenant_badge").on(t.tenantId, t.badgeId),
}));

export const weeklyChallengesTable = pgTable("weekly_challenges", {
  id: serial("id").primaryKey(),
  weekOf: text("week_of").notNull(),
  challengeKey: text("challenge_key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  targetValue: integer("target_value").notNull(),
  xpReward: integer("xp_reward").notNull(),
  reasonFilter: text("reason_filter").notNull(),
});

export const challengeProgressTable = pgTable("challenge_progress", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  challengeId: integer("challenge_id").notNull().references(() => weeklyChallengesTable.id),
  currentValue: integer("current_value").notNull().default(0),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  uniq: unique("challenge_progress_tenant_challenge").on(t.tenantId, t.challengeId),
}));

export const streaksTable = pgTable("streaks", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().unique().references(() => tenantsTable.id),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveWeek: text("last_active_week"),
});

export type XpLedgerEntry = typeof xpLedgerTable.$inferSelect;
export type EarnedBadge = typeof earnedBadgesTable.$inferSelect;
export type WeeklyChallenge = typeof weeklyChallengesTable.$inferSelect;
export type ChallengeProgress = typeof challengeProgressTable.$inferSelect;
export type Streak = typeof streaksTable.$inferSelect;
