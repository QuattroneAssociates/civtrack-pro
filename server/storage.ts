import { eq, desc, and, or, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  users, projects, permits, tasks, notes, auditLogs,
  type User, type InsertUser,
  type Project, type InsertProject,
  type Permit, type InsertPermit,
  type Task, type InsertTask,
  type Note, type InsertNote,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  getPermits(): Promise<Permit[]>;
  getPermitsByProject(projectId: string): Promise<Permit[]>;
  createPermit(permit: InsertPermit): Promise<Permit>;
  updatePermit(id: string, permit: Partial<InsertPermit>): Promise<Permit | undefined>;
  deletePermit(id: string): Promise<void>;

  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByProject(projectId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<void>;

  getNotes(): Promise<Note[]>;
  getNotesByProject(projectId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<void>;

  getAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.name);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({ ...data, lastUpdatedDate: new Date().toISOString().split('T')[0] }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.projectId, id));
    await db.delete(tasks).where(eq(tasks.projectId, id));
    await db.delete(permits).where(eq(permits.projectId, id));
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getPermits(): Promise<Permit[]> {
    return db.select().from(permits);
  }

  async getPermitsByProject(projectId: string): Promise<Permit[]> {
    return db.select().from(permits).where(eq(permits.projectId, projectId));
  }

  async createPermit(permit: InsertPermit): Promise<Permit> {
    const [created] = await db.insert(permits).values(permit).returning();
    return created;
  }

  async updatePermit(id: string, data: Partial<InsertPermit>): Promise<Permit | undefined> {
    const [updated] = await db.update(permits).set(data).where(eq(permits.id, id)).returning();
    return updated;
  }

  async deletePermit(id: string): Promise<void> {
    await db.delete(permits).where(eq(permits.id, id));
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks).orderBy(desc(tasks.dateAssigned));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByProject(projectId: string): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: string, data: Partial<InsertTask>): Promise<Task | undefined> {
    const [updated] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  async getNotes(): Promise<Note[]> {
    return db.select().from(notes).orderBy(desc(notes.date));
  }

  async getNotesByProject(projectId: string): Promise<Note[]> {
    return db.select().from(notes).where(eq(notes.projectId, projectId)).orderBy(desc(notes.date));
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }

  async updateNote(id: string, data: Partial<InsertNote>): Promise<Note | undefined> {
    const [updated] = await db.update(notes).set(data).where(eq(notes.id, id)).returning();
    return updated;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
