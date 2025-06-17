import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const bannedSlots = pgTable("banned_slots", {
  id: serial("id").primaryKey(),
  slotName: text("slot_name").notNull(),
  bannedBy: text("banned_by").notNull(),
  bannedAt: timestamp("banned_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBannedSlotSchema = createInsertSchema(bannedSlots).omit({
  id: true,
  bannedAt: true,
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type BannedSlot = typeof bannedSlots.$inferSelect;
export type InsertBannedSlot = z.infer<typeof insertBannedSlotSchema>;
export type AppSettings = typeof appSettings.$inferSelect;
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;

// WebSocket message types
export interface WebSocketMessage {
  type: 'BAN_ADDED' | 'BAN_REMOVED' | 'BAN_EXPIRED' | 'STATUS_CHANGED' | 'BOT_STATUS';
  data: any;
}
