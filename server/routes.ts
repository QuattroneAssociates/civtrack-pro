import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProjectSchema, insertPermitSchema, insertTaskSchema, insertNoteSchema, insertAuditLogSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const user = await storage.createUser(parsed.data);
    res.status(201).json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
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

  app.post("/api/projects", async (req, res) => {
    const parsed = insertProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const project = await storage.createProject(parsed.data);
    res.status(201).json(project);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const parsed = insertProjectSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const project = await storage.updateProject(req.params.id, parsed.data);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.delete("/api/projects/:id", async (req, res) => {
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

  app.post("/api/permits", async (req, res) => {
    const parsed = insertPermitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const permit = await storage.createPermit(parsed.data);
    res.status(201).json(permit);
  });

  app.patch("/api/permits/:id", async (req, res) => {
    const parsed = insertPermitSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const permit = await storage.updatePermit(req.params.id, parsed.data);
    if (!permit) return res.status(404).json({ message: "Permit not found" });
    res.json(permit);
  });

  app.delete("/api/permits/:id", async (req, res) => {
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

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.updateTask(req.params.id, parsed.data);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
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

  app.post("/api/notes", async (req, res) => {
    const parsed = insertNoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.createNote(parsed.data);
    res.status(201).json(note);
  });

  app.patch("/api/notes/:id", async (req, res) => {
    const parsed = insertNoteSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const note = await storage.updateNote(req.params.id, parsed.data);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    await storage.deleteNote(req.params.id);
    res.status(204).send();
  });

  app.get("/api/audit-logs", async (_req, res) => {
    const logs = await storage.getAuditLogs();
    res.json(logs);
  });

  app.post("/api/audit-logs", async (req, res) => {
    const parsed = insertAuditLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const log = await storage.createAuditLog(parsed.data);
    res.status(201).json(log);
  });

  return httpServer;
}
