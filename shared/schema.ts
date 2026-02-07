import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for PMs, Consultants, Copy Editors, Managing Directors
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("consultant"), // pm, consultant, copy_editor, managing_director
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  title: text("title"), // Principal, Research Associate, Consultant
});

// RFP Documents
export const rfps = pgTable("rfps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  source: text("source").notNull(), // federal, state
  agency: text("agency"),
  documentUrl: text("document_url"),
  documentContent: text("document_content"),
  status: text("status").notNull().default("draft"), // draft, analyzing, in_progress, review, submitted
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  submittedAt: timestamp("submitted_at"),
  keywords: text("keywords").array(),
  state: text("state"),
  assignedPmId: varchar("assigned_pm_id").references(() => users.id),
});

// Requirements extracted from RFPs
export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  rfpId: integer("rfp_id").notNull().references(() => rfps.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  section: text("section"),
  priority: text("priority").default("medium"), // high, medium, low
  highlightStart: integer("highlight_start"),
  highlightEnd: integer("highlight_end"),
  status: text("status").default("pending"), // pending, addressed, skipped
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Response Templates
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Proposal Responses
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  rfpId: integer("rfp_id").notNull().references(() => rfps.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  lastSavedAt: timestamp("last_saved_at").default(sql`CURRENT_TIMESTAMP`),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Response Sections with assignments
export const responseSections = pgTable("response_sections", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").notNull().references(() => responses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  orderIndex: integer("order_index").notNull().default(0),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  isLocked: boolean("is_locked").default(false),
  lockedByPmId: varchar("locked_by_pm_id").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Budget Items
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  rfpId: integer("rfp_id").notNull().references(() => rfps.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  hours: decimal("hours", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// LLM Insights for proposals
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").notNull().references(() => responses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // writing_improvement, inconsistency, language_match
  text: text("text").notNull(),
  suggestion: text("suggestion"),
  sectionId: integer("section_id").references(() => responseSections.id),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Reviews (Copy Editing, Budget, Final)
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  rfpId: integer("rfp_id").notNull().references(() => rfps.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // copy_editing, budget, final
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewerId: varchar("reviewer_id").references(() => users.id),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertRfpSchema = createInsertSchema(rfps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  createdAt: true,
  lastSavedAt: true,
});

export const insertResponseSectionSchema = createInsertSchema(responseSections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Rfp = typeof rfps.$inferSelect;
export type InsertRfp = z.infer<typeof insertRfpSchema>;

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;

export type ResponseSection = typeof responseSections.$inferSelect;
export type InsertResponseSection = z.infer<typeof insertResponseSectionSchema>;

export type BudgetItem = typeof budgetItems.$inferSelect;
export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
