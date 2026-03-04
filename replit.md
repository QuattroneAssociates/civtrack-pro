# CivTrack Pro — Quattrone & Associates

## Overview
Full-stack civil engineering project management application migrated from a Google AI Studio/Supabase prototype. Built for Quattrone & Associates to manage projects, permits, tasks, and team members.

## Architecture
- **Frontend**: React + Vite, wouter routing, TanStack Query, shadcn/ui, Tailwind CSS, Recharts
- **Backend**: Express.js on port 5000, PostgreSQL via Drizzle ORM
- **Shared**: `shared/schema.ts` defines all Drizzle tables and Zod schemas
- **Auth**: Email OTP login via Resend, express-session with connect-pg-simple, role-based access control

## Authentication
- **Login Flow**: Email → 6-digit OTP via Resend → Session-based auth
- **Roles**: admin, project_manager, team_member
- **19 authorized users** with @qainc.net login emails
- **Session**: PostgreSQL-backed via connect-pg-simple (7-day cookie)
- **Key files**: `server/auth.ts` (routes + middleware), `client/src/lib/auth.tsx` (AuthProvider context), `client/src/pages/login.tsx`
- **Middleware**: `requireAuth` on all /api/* except /api/auth/*, `requireRole(...)` on write routes
- **Permission Matrix**:
  - Admin: Full access (CRUD projects, permits, tasks, notes; see Reports & Team)
  - PM: Read projects, manage tasks/notes, no project CRUD, no Reports/Team
  - Team Member: Read-only view, can update own task status (Pending/Assigned/In Progress/Complete) via dropdown

## Key Files
- `shared/schema.ts` — Database schema (users, projects, permits, tasks, notes, auditLogs, authCodes)
- `server/auth.ts` — Authentication routes and middleware (OTP, session, role guards)
- `server/db.ts` — Database connection pool
- `server/storage.ts` — DatabaseStorage class implementing IStorage interface
- `server/routes.ts` — Full CRUD API routes under `/api/` with role-based middleware
- `server/seed.ts` — Seeds 13 team members on fresh start (no sample project data)
- `server/import-csv.ts` — CSV import script for real data (projects, permits, tasks, notes)
- `client/src/App.tsx` — Route definitions with AuthProvider wrapper
- `client/src/lib/auth.tsx` — AuthContext provider (user state, login/logout, hasRole helper)
- `client/src/pages/login.tsx` — Email OTP login page (two-step: email → code)
- `client/src/components/app-layout.tsx` — Sidebar layout with role-based nav and logout

## Pages
- `/` — Dashboard (metrics, active projects, deadline radar)
- `/projects` — Project list with filters, pagination, search
- `/projects/new` — Create project form (admin only)
- `/projects/:id` — Project details (permit matrix, task ledger, notes tabs)
- `/projects/:id/edit` — Edit project form (admin only)
- `/tasks` — Task list with board (3 columns: Assigned/In Progress/Complete), list, and archive views; status + priority dropdowns on each task; sorted by due date; defaults to logged-in user's tasks
- `/alerts` — Alert center (target deadlines, expirations, stagnant, unpaid fees)
- `/calendar` — Calendar view for tasks and permit expirations
- `/reports` — Analytics (admin only)
- `/users` — Team directory (admin only)

## Database
- PostgreSQL via `DATABASE_URL`
- Tables: users, projects, permits, tasks, notes, auditLogs, authCodes, session
- UUID primary keys generated via `gen_random_uuid()`
- Project delete cascades to permits, tasks, notes
- Real data: 2,281 projects, 1,377 permits, 103 tasks, 383 notes, 30 users (19 authorized)

## API Pattern
- `apiRequest(method, url, data)` from `@/lib/queryClient`
- All routes prefixed with `/api/`
- Auth routes: `/api/auth/request-code`, `/api/auth/verify-code`, `/api/auth/me`, `/api/auth/logout`
- Protected routes require valid session (401 without)
- Write routes require specific roles (403 without)

## Styling
- Warm cream/tan palette inspired by mockup design
- Background: warm cream `hsl(37 30% 91%)`, Cards: off-white `hsl(40 33% 96%)`
- Sidebar: dark slate blue `hsl(213 30% 18%)` with white/opacity text
- Primary: dark navy `hsl(213 30% 22%)`, Accent: dusty rose `#c4917a`, steel blue `#8fa5b8`
- Login page: `bg-[#263042]` with matching button colors
- Dashboard: stat cards with circular icons + accent bars, Recently Submitted permits list, Deadline Radar mini calendar widget
- Uses shadcn elevation system (`hover-elevate`)
- Font: Open Sans

## Secrets
- `DATABASE_URL` — PostgreSQL connection
- `SESSION_SECRET` — Express session encryption
- `RESEND_API_KEY` — Email OTP delivery via Resend

## Dev Commands
- `npm run dev` — Start dev server
- `npm run db:push` — Push schema to database
- `npm run build` — Build for production
