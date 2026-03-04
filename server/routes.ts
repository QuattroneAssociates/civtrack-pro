import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { requireAuth, requireRole } from "./auth";
import { insertUserSchema, insertProjectSchema, insertPermitSchema, insertTaskSchema, insertNoteSchema, insertAuditLogSchema, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/api", (req, res, next) => {
    if (req.path.startsWith("/auth")) return next();
    requireAuth(req, res, next);
  });

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post("/api/users", requireRole("admin"), async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.createUser(parsed.data);
    res.status(201).json(user);
  });

  app.patch("/api/users/:id", requireRole("admin"), async (req, res) => {
    const parsed = insertUserSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.updateUser(req.params.id, parsed.data);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.get("/api/projects", async (_req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req, res) => {
    const project = await storage.getProject(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", requireRole("admin"), async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const project = await storage.createProject(parsed.data);
    res.status(201).json(project);
  });

  app.patch("/api/projects/:id", requireRole("admin"), async (req, res) => {
    const parsed = insertProjectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const project = await storage.updateProject(req.params.id, parsed.data);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", requireRole("admin"), async (req, res) => {
    await storage.deleteProject(req.params.id);
    res.status(204).send();
  });

  app.get("/api/permits", async (_req, res) => {
    const permits = await storage.getPermits();
    res.json(permits);
  });

  app.get("/api/projects/:id/permits", async (req, res) => {
    const permits = await storage.getPermitsByProject(req.params.id);
    res.json(permits);
  });

  app.post("/api/permits", requireRole("admin"), async (req, res) => {
    const parsed = insertPermitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const permit = await storage.createPermit(parsed.data);
    res.status(201).json(permit);
  });

  app.patch("/api/permits/:id", requireRole("admin"), async (req, res) => {
    const parsed = insertPermitSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const permit = await storage.updatePermit(req.params.id, parsed.data);
    if (!permit) return res.status(404).json({ message: "Permit not found" });
    res.json(permit);
  });

  app.delete("/api/permits/:id", requireRole("admin"), async (req, res) => {
    await storage.deletePermit(req.params.id);
    res.status(204).send();
  });

  app.get("/api/tasks", async (_req, res) => {
    const tasks = await storage.getTasks();
    res.json(tasks);
  });

  app.get("/api/projects/:id/tasks", async (req, res) => {
    const tasks = await storage.getTasksByProject(req.params.id);
    res.json(tasks);
  });

  app.post("/api/tasks", requireRole("admin", "project_manager"), async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", requireRole("admin", "project_manager"), async (req, res) => {
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.updateTask(req.params.id, parsed.data);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.patch("/api/tasks/:id/status", requireAuth, async (req, res) => {
    const { status, dateCompleted } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const validStatuses = ["Pending", "Assigned", "In Progress", "Complete", "Completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await storage.getTask(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const [sessionUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId!));

    if (!sessionUser) return res.status(401).json({ message: "User not found" });

    const isAdminOrPM = sessionUser.authRole === "admin" || sessionUser.authRole === "project_manager";
    if (!isAdminOrPM && task.assignedTo.toLowerCase() !== sessionUser.name.toLowerCase()) {
      return res.status(403).json({ message: "You can only update status on your own tasks" });
    }

    const updated = await storage.updateTask(req.params.id, { status, dateCompleted });
    res.json(updated);
  });

  app.delete("/api/tasks/:id", requireRole("admin", "project_manager"), async (req, res) => {
    await storage.deleteTask(req.params.id);
    res.status(204).send();
  });

  app.get("/api/notes", async (_req, res) => {
    const notes = await storage.getNotes();
    res.json(notes);
  });

  app.get("/api/projects/:id/notes", async (req, res) => {
    const notes = await storage.getNotesByProject(req.params.id);
    res.json(notes);
  });

  app.post("/api/notes", requireRole("admin", "project_manager"), async (req, res) => {
    const parsed = insertNoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.createNote(parsed.data);
    res.status(201).json(note);
  });

  app.patch("/api/notes/:id", requireRole("admin", "project_manager"), async (req, res) => {
    const parsed = insertNoteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.updateNote(req.params.id, parsed.data);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  });

  app.delete("/api/notes/:id", requireRole("admin", "project_manager"), async (req, res) => {
    await storage.deleteNote(req.params.id);
    res.status(204).send();
  });

  app.get("/api/audit-logs", requireRole("admin"), async (_req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.post("/api/audit-logs", requireRole("admin"), async (req, res) => {
    const parsed = insertAuditLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createAuditLog(parsed.data);
    res.status(201).json(log);
  });

  return httpServer;
}
