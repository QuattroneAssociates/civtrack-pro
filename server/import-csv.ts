import { db } from "./db";
import { users, projects, permits, tasks, notes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const CSV_DIR = path.join(process.cwd(), "attached_assets");

function readCSV(filename: string): Record<string, string>[] {
  const filePath = path.join(CSV_DIR, filename);
  const content = fs.readFileSync(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_quotes: true,
    relax_column_count: true,
  });
}

function cleanDate(val: string | undefined): string | null {
  if (!val || val.trim() === "") return null;
  const d = new Date(val.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function clean(val: string | undefined): string | null {
  if (!val || val.trim() === "" || val.trim() === "00" || val.trim() === "0") return null;
  return val.trim();
}

const EMAIL_TO_NAME: Record<string, string> = {
  "al@qainc.net": "Al Quattrone",
  "frank@qainc.net": "Frank Feeney",
  "josh@qainc.net": "Josh Eisenoff",
  "shelly@qainc.net": "Shelly Stalnos",
  "jforonda@qainc.net": "Jhonny Foronda",
  "jacob@qainc.net": "Jacob Soud",
  "jeff@qainc.net": "Jeff Falzone",
  "sharon@qainc.net": "Sharon Hrabak",
  "erick@qainc.net": "Erick Diaz",
  "john@qainc.net": "John Udart",
  "carsont@qainc.net": "Carson Tucker",
  "angelicaqaincarchive@gmail.com": "Angelica Hoffert",
  "david@qainc.net": "David Castillo",
  "michelle@qainc.net": "Michelle Salberg",
  "rostassociates@gmail.com": "Jim Rost",
  "joe@qainc.net": "Joe Mauceri",
  "gary@qainc.net": "Gary Hoffman",
  "leona@qainc.net": "Leona Martin",
  "gabriela@qainc.net": "Gabriela Rodriguez",
  "jamie@qainc.net": "Jamie Rivera",
  "jason@qainc.net": "Jason White",
  "gregqaincarchive@gmail.com": "Greg Stuart",
  "markqaincarchive@gmail.com": "Mark Aral",
  "paulqaincarchive@gmail.com": "Paul Torocco",
  "praneethqaincarchive@gmail.com": "Praneeth Akaveeti",
  "richqaincarchive@gmail.com": "Rich Batewell",
  "sergioqaincarchive@gmail.com": "Sergio Guzman",
};

async function run() {
  console.log("Starting CSV import...");

  const existingUsers = await db.select().from(users);
  const userByName: Record<string, string> = {};
  for (const u of existingUsers) {
    userByName[u.name.toLowerCase()] = u.id;
  }

  async function resolveUserId(email?: string, name?: string): Promise<string> {
    if (name) {
      const existing = userByName[name.toLowerCase()];
      if (existing) return existing;
    }

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const mappedName = EMAIL_TO_NAME[emailLower];
      if (mappedName) {
        const existing = userByName[mappedName.toLowerCase()];
        if (existing) return existing;
      }
    }

    const displayName = name || (email ? EMAIL_TO_NAME[email.toLowerCase().trim()] : null) || email || "Unknown";

    if (userByName[displayName.toLowerCase()]) {
      return userByName[displayName.toLowerCase()];
    }

    const emailForUser = email || `${displayName.toLowerCase().replace(/[^a-z]/g, "")}@qainc.net`;
    try {
      const [newUser] = await db.insert(users).values({
        name: displayName,
        role: "Team Member",
        email: emailForUser,
        isActive: false,
      }).returning();
      userByName[newUser.name.toLowerCase()] = newUser.id;
      console.log(`  Created new user: ${newUser.name} (${emailForUser})`);
      return newUser.id;
    } catch {
      const existing = userByName[displayName.toLowerCase()];
      if (existing) return existing;
      return existingUsers[0].id;
    }
  }

  console.log("\n=== Importing Projects ===");
  const projectRows = readCSV("PROJECTS_1772652434845.csv");
  console.log(`Found ${projectRows.length} project rows`);

  const projectNumberToId: Record<string, string> = {};
  let projectCount = 0;
  let projectSkip = 0;

  for (const row of projectRows) {
    const number = row["Project #"]?.trim();
    if (!number) { projectSkip++; continue; }

    const pmEmail = row["Project Manager Email"]?.trim();
    const pmName = row["Project Manager Name"]?.trim();
    const pmId = await resolveUserId(pmEmail, pmName);

    const status = row["Project Status"]?.trim() || "Active";
    const validStatuses = ["Active", "Closed", "On Hold", "Construction", "Pending", "Proposal"];
    const mappedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase()) || "Active";

    try {
      const [proj] = await db.insert(projects).values({
        number,
        name: row["Project Name"]?.trim() || number,
        status: mappedStatus,
        projectManagerId: pmId,
        address: row["Project Address"]?.trim() || "TBD",
        agency: row["Agency Name"]?.trim() || "TBD",
        strapNumber: row["Strap #"]?.trim() || "TBD",
        clientName: row["Client Name"]?.trim() || "TBD",
        clientEmail: clean(row["Client Email"]),
        clientMobile: clean(row["Client Mobile Phone"]),
        clientOffice: clean(row["Client Office Phone"]),
        architect: clean(row["Subs/Sub - Architect"]),
        biologist: clean(row["Subs/Sub - Biologist"]),
        landscaper: clean(row["Subs/Sub - Landscaper"]),
        surveyor: clean(row["Subs/Sub - Surveyor"]),
        trafficEngineer: clean(row["Subs/Sub - Traffic Eng"]),
        titlePolicyStatus: row["PreSubItms/PreSub - TitlePolicy - Status"]?.trim() || "Pending",
        createdBy: clean(row["RecMetadataInfo/Created By Email"]),
        lastUpdatedBy: clean(row["RecMetadataInfo/Last Updated By Email"]),
      }).returning();
      projectNumberToId[number] = proj.id;
      projectCount++;
    } catch (err: any) {
      if (err.message?.includes("duplicate key")) {
        const existing = await db.select().from(projects).where(eq(projects.number, number));
        if (existing.length > 0) {
          projectNumberToId[number] = existing[0].id;
        }
        projectSkip++;
      } else {
        console.error(`  Error importing project ${number}: ${err.message}`);
        projectSkip++;
      }
    }
  }
  console.log(`Projects imported: ${projectCount}, skipped: ${projectSkip}`);

  console.log("\n=== Importing Permits ===");
  const permitRows = readCSV("PERMITS_1772652443575.csv");
  console.log(`Found ${permitRows.length} permit rows`);

  let permitCount = 0;
  let permitSkip = 0;

  for (const row of permitRows) {
    const projectNum = row["Project #"]?.trim();
    if (!projectNum) { permitSkip++; continue; }

    const projectId = projectNumberToId[projectNum];
    if (!projectId) {
      permitSkip++;
      continue;
    }

    const permitType = row["Permit Type"]?.trim();
    if (!permitType) { permitSkip++; continue; }

    try {
      await db.insert(permits).values({
        projectId,
        type: permitType,
        number: clean(row["Permit #"]),
        description: clean(row["Permit Description"]),
        targetDate: cleanDate(row["Permit Target Date"]),
        submittalDate: cleanDate(row["Permit Submittal Date"]),
        comments1Date: cleanDate(row["Permit Agency Comments 1 Date"]),
        resubmittal1Date: cleanDate(row["Permit Resubmittal 1 Date"]),
        comments2Date: cleanDate(row["Permit Agency Comments 2 Date"]),
        resubmittal2Date: cleanDate(row["Permit Resubmittal 2 Date"]),
        approvalDate: cleanDate(row["Permit Approval Date"]),
        expirationDate: cleanDate(row["Permit Expiration Date"]),
        submittalNotes: clean(row["Notes"]),
      });
      permitCount++;
    } catch (err: any) {
      console.error(`  Error importing permit for project ${projectNum}: ${err.message}`);
      permitSkip++;
    }
  }
  console.log(`Permits imported: ${permitCount}, skipped: ${permitSkip}`);

  console.log("\n=== Importing Tasks ===");
  const taskRows = readCSV("TASKS_1772652446571.csv");
  console.log(`Found ${taskRows.length} task rows`);

  let taskCount = 0;
  let taskSkip = 0;

  for (const row of taskRows) {
    const projectNum = row["Project #"]?.trim();
    if (!projectNum) { taskSkip++; continue; }

    const projectId = projectNumberToId[projectNum];
    if (!projectId) {
      console.log(`  Task skipped - no project found for number: ${projectNum}`);
      taskSkip++;
      continue;
    }

    const taskName = row["Task Name"]?.trim();
    if (!taskName) { taskSkip++; continue; }

    const assignedByName = row["Assigned By Name"]?.trim() || "Unknown";
    const assignedToName = row["Assigned To Name"]?.trim() || "Unknown";

    const statusMap: Record<string, string> = {
      "complete": "Complete",
      "assigned": "Assigned",
      "in progress": "In Progress",
      "pending": "Pending",
      "on hold": "On Hold",
    };
    const rawStatus = row["Task Status"]?.trim().toLowerCase() || "pending";
    const status = statusMap[rawStatus] || "Pending";

    const dueDate = cleanDate(row["Date Due"]) || new Date().toISOString().split("T")[0];

    try {
      await db.insert(tasks).values({
        projectId,
        name: taskName,
        description: clean(row["Task Description"]),
        assignedBy: assignedByName,
        assignedTo: assignedToName,
        dateAssigned: cleanDate(row["Date Assigned"]) || new Date().toISOString().split("T")[0],
        dueDate,
        dateCompleted: cleanDate(row["Date Completed"]),
        status,
        isImportant: false,
        notes: clean(row["Notes"]),
      });
      taskCount++;
    } catch (err: any) {
      console.error(`  Error importing task "${taskName}": ${err.message}`);
      taskSkip++;
    }
  }
  console.log(`Tasks imported: ${taskCount}, skipped: ${taskSkip}`);

  console.log("\n=== Importing Notes ===");
  const noteRows = readCSV("NOTES_1772652449657.csv");
  console.log(`Found ${noteRows.length} note rows`);

  let noteCount = 0;
  let noteSkip = 0;

  for (const row of noteRows) {
    const projectNum = row["Project #"]?.trim();
    if (!projectNum) { noteSkip++; continue; }

    const projectId = projectNumberToId[projectNum];
    if (!projectId) {
      noteSkip++;
      continue;
    }

    const body = row["Note"]?.trim();
    if (!body) { noteSkip++; continue; }

    const noteType = row["Note Type"]?.trim() || "General";
    const authorName = row["Author Name"]?.trim() || "Unknown";
    const noteDate = cleanDate(row["Date"]) || new Date().toISOString().split("T")[0];

    try {
      await db.insert(notes).values({
        projectId,
        type: noteType,
        body,
        date: noteDate,
        author: authorName,
      });
      noteCount++;
    } catch (err: any) {
      console.error(`  Error importing note for project ${projectNum}: ${err.message}`);
      noteSkip++;
    }
  }
  console.log(`Notes imported: ${noteCount}, skipped: ${noteSkip}`);

  console.log("\n=== Import Complete ===");
  console.log(`Projects: ${projectCount}`);
  console.log(`Permits: ${permitCount}`);
  console.log(`Tasks: ${taskCount}`);
  console.log(`Notes: ${noteCount}`);

  process.exit(0);
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
