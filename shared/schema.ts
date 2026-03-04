import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, date, doublePrecision, jsonb, uuid, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull(),
  email: text("email").notNull().unique(),
  loginEmail: text("login_email").unique(),
  authRole: text("auth_role"),
  isActive: boolean("is_active").notNull().default(true),
});

export const authCodes = pgTable("auth_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  number: text("number").notNull().unique(),
  description: text("description"),
  status: text("status").notNull().default("Active"),
  projectManagerId: text("project_manager_id").notNull(),
  address: text("address").notNull(),
  mapLink: text("map_link"),
  agency: text("agency").notNull(),
  strapNumber: text("strap_number").notNull(),
  oneDriveFolder: text("one_drive_folder"),
  oneDriveNotes: text("one_drive_notes"),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientMobile: text("client_mobile"),
  clientOffice: text("client_office"),
  architect: text("architect"),
  biologist: text("biologist"),
  landscaper: text("landscaper"),
  surveyor: text("surveyor"),
  trafficEngineer: text("traffic_engineer"),
  titlePolicyStatus: text("title_policy_status").notNull().default("Pending"),
  ballInCourt: text("ball_in_court"),
  createdAt: date("created_at").notNull().default(sql`CURRENT_DATE`),
  createdBy: text("created_by"),
  lastUpdatedDate: date("last_updated_date").default(sql`CURRENT_DATE`),
  lastUpdatedBy: text("last_updated_by"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
});

export const permits = pgTable("permits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull(),
  type: text("type").notNull(),
  number: text("number"),
  description: text("description"),
  targetDate: date("target_date"),
  submittalDate: date("submittal_date"),
  comments1Date: date("comments_1_date"),
  resubmittal1Date: date("resubmittal_1_date"),
  comments2Date: date("comments_2_date"),
  resubmittal2Date: date("resubmittal_2_date"),
  approvalDate: date("approval_date"),
  expirationDate: date("expiration_date"),
  agency: text("agency"),
  applicationStatus: text("application_status"),
  submittalType: text("submittal_type"),
  feeStatus: text("fee_status"),
  feeAmount: text("fee_amount"),
  externalDependency: text("external_dependency"),
  lastActionDate: date("last_action_date"),
  submittalNotes: text("submittal_notes"),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  assignedBy: text("assigned_by").notNull(),
  assignedTo: text("assigned_to").notNull(),
  dateAssigned: date("date_assigned").notNull().default(sql`CURRENT_DATE`),
  dueDate: date("due_date").notNull(),
  dateCompleted: date("date_completed"),
  status: text("status").notNull().default("Assigned"),
  isImportant: boolean("is_important").notNull().default(false),
  priority: text("priority").notNull().default("Medium"),
  notes: text("notes"),
  tags: text("tags").array(),
  comments: jsonb("comments"),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull(),
  type: text("type").notNull(),
  body: text("body").notNull(),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  author: text("author").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityName: text("entity_name").notNull(),
  action: text("action").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`NOW()`),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAuthCodeSchema = createInsertSchema(authCodes).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, lastUpdatedDate: true });
export const insertPermitSchema = createInsertSchema(permits).omit({ id: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, dateAssigned: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, date: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, timestamp: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAuthCode = z.infer<typeof insertAuthCodeSchema>;
export type AuthCode = typeof authCodes.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertPermit = z.infer<typeof insertPermitSchema>;
export type Permit = typeof permits.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}
