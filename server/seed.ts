import { db } from "./db";
import { users } from "@shared/schema";

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) return;

  console.log("Seeding database with team members...");

  await db.insert(users).values([
    { name: "Al Quattrone", role: "Application Owner", email: "al@quattrone.com", isActive: true },
    { name: "Frank Feeney", role: "Project Manager", email: "frank@quattrone.com", isActive: true },
    { name: "Josh Eisenoff", role: "Associate Engineer", email: "josh@quattrone.com", isActive: true },
    { name: "Shelly Stalnos", role: "Office Manager", email: "shelly@quattrone.com", isActive: true },
    { name: "Jhonny Foronda", role: "Project Manager", email: "jhonny@quattrone.com", isActive: true },
    { name: "Jacob Soud", role: "Engineer", email: "jacob@quattrone.com", isActive: true },
    { name: "Jeff Falzone", role: "Planner", email: "jeff@quattrone.com", isActive: true },
    { name: "Sharon Hrabak", role: "Designer", email: "sharon@quattrone.com", isActive: true },
    { name: "Erick Diaz", role: "Engineer", email: "erick@quattrone.com", isActive: true },
    { name: "John Udart", role: "Engineer", email: "john@quattrone.com", isActive: true },
    { name: "Carson Tucker", role: "Engineer", email: "carson@quattrone.com", isActive: true },
    { name: "Angelica Hoffert", role: "Project Manager", email: "angelica@quattrone.com", isActive: true },
    { name: "David Castillo", role: "Project Manager", email: "david@quattrone.com", isActive: true },
  ]);

  console.log("Database seeded with team members!");
}
