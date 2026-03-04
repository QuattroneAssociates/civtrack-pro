# CivTrack Pro — Quattrone & Associates

## Overview
Full-stack civil engineering project management application migrated from a Google AI Studio/Supabase prototype. Built for Quattrone & Associates to manage projects, permits, tasks, and team members.

## Architecture
- **Frontend**: React + Vite, wouter routing, TanStack Query, shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js on port 5000, PostgreSQL via Drizzle ORM
- **Shared**: `shared/schema.ts` defines all Drizzle tables and Zod schemas

## Key Files
- `shared/schema.ts` — Database schema (users, projects, permits, tasks, notes, auditLogs)
- `server/db.ts` — Database connection pool
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/routes.ts` — Full CRUD API routes under `/api/`
- `server/seed.ts` — Seeds 13 team members on fresh start (no sample project data)
- `server/import-csv.ts` — CSV import script for real data (projects, permits, tasks, notes)
- `client/src/App.tsx` — Route definitions
- `client/src/components/app-layout.tsx` — Sidebar layout with dark navy (#0c0054) + amber accents

## Pages
- `/` — Dashboard (metrics, active projects, deadline radar)
- `/projects` — Project list with filters, pagination, search
- `/projects/new` — Create project form
- `/projects/:id` — Project details (permit matrix, task ledger, notes tabs)
- `/projects/:id/edit` — Edit project form
- `/tasks` — Task list with board/list/archive views
- `/alerts` — Alert center (target deadlines, expirations, stagnant, unpaid fees)
- `/calendar` — Calendar view for tasks and permit expirations
- `/reports` — Analytics (workload, pipeline, agencies, fee tracking)
- `/users` — Team directory with CRUD

## Database
- PostgreSQL via `DATABASE_URL`
- Tables: users, projects, permits, tasks, notes, auditLogs
- UUID primary keys generated via `gen_random_uuid()`
- Project delete cascades to permits, tasks, notes
- Real data: 2,281 projects, 1,377 permits, 103 tasks, 383 notes, 26 users
- Project statuses: Active (188), Closed (2,024), Construction (61), On Hold (8), Proposal (14)

## API Pattern
- `apiRequest(method, url, data)` from `@/lib/queryClient`
- All routes prefixed with `/api/`
- Seed data checks for existing users to avoid duplicates

## Styling
- Custom sidebar: `bg-[#0c0054]` with amber active states
- Uses shadcn elevation system (`hover-elevate`)
- Font: Open Sans
- Primary color: blue (217 91% 60%)

## Dev Commands
- `npm run dev` — Start dev server
- `npm run db:push` — Push schema to database
- `npm run build` — Build for production
