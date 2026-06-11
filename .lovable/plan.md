## Portal Kierowcy STP — Plan fazy 1

Phase 1 scope: auth + roles + driver dashboard + driver timetable + announcements (read) + admin user management + admin duty creation/assignment. Vehicles (full module), availability editor, vacation requests, and statistics are intentionally deferred to Phase 2.

UI is entirely in Polish. Visual direction: "Municipal modernist" ( `#CF2E30` +  `#F7F0D5` on `#FFFFFF`, Public Sans + JetBrains Mono, fixed dark sidebar + light content).

### Backend (Lovable Cloud)

Enable Cloud, then create tables in one migration:

- `profiles` — id (FK auth.users), full_name, employee_id, depot, active, created_at
- `user_roles` — id, user_id, role (`app_role` enum: `admin`, `driver`)
- `duties` — id, duty_number, date, start_time, end_time, depot, route, notes, vehicle_label (free text for now), assigned_to (FK profiles), created_by, created_at
- `announcements` — id, title, body, category (enum: `operations`, `service_changes`, `events`, `training`, `general`), published_at, author_id, archived

RLS:

- `has_role(uuid, app_role)` SECURITY DEFINER helper
- profiles: user sees own row; admin sees/edits all
- user_roles: admin-only writes, read by authenticated
- duties: driver sees rows where `assigned_to = auth.uid()`; admin full access
- announcements: all authenticated read non-archived; admin full access
- All tables get `GRANT` to `authenticated` and `service_role`

Auth: email + password only. Registration disabled in UI (no signup route). Admin creates accounts via a `createServerFn` calling `supabase.auth.admin.createUser` with `supabaseAdmin` (imported inside handler), then inserts profile + role row. Caller authorized via `requireSupabaseAuth` + `has_role(_, 'admin')` check.

A migration seeds the `admin` and `driver` enum values and the `has_role` function only — no demo data per user request. After deploy the user will create the first admin via a one-time bootstrap server function (gated to run only when zero admins exist).

### Routes (TanStack Start)

```
src/routes/
  __root.tsx               (existing; add QueryClient + auth listener)
  index.tsx                (redirect → /auth or /pulpit based on session)
  auth.tsx                 (login form, Polish labels)
  _authenticated/
    route.tsx              (managed gate, ssr:false, redirect to /auth)
    pulpit.tsx             (driver dashboard)
    grafik.tsx             (driver timetable: list + month calendar toggle)
    ogloszenia.tsx         (announcements list)
    admin/
      route.tsx            (gate: has_role admin, else redirect /pulpit)
      uzytkownicy.tsx      (user management table + create/edit dialog)
      sluzby.tsx           (duty list + create/assign dialog)
      ogloszenia.tsx       (announcement create/edit/archive)
```

Driver dashboard (`/pulpit`) mirrors the chosen prototype exactly: header with greeting + date, large "Najbliższa służba" card (line/route, hours, vehicle, depot, action buttons), right-column "Ogłoszenia" list (3 most recent), bottom "Nadchodzące służby" table (next 7 days).

### Server functions

All in `src/lib/*.functions.ts` (client-safe path), `supabaseAdmin` only imported inside handlers when admin elevation needed:

- `getMyNextDuty`, `getMyUpcomingDuties`, `getMyDuties(range)` — `requireSupabaseAuth`, RLS-scoped
- `getAnnouncements(limit)` — `requireSupabaseAuth`
- `listUsers`, `createUser`, `updateUser`, `setUserActive`, `resetUserPassword` — admin-only (auth + `has_role` check)
- `listDuties`, `createDuty`, `updateDuty`, `deleteDuty`, `assignDuty` — admin-only
- `createAnnouncement`, `updateAnnouncement`, `archiveAnnouncement` — admin-only
- `bootstrapFirstAdmin(email, password)` — only runs if `user_roles` has no admin

All inputs validated with zod.

### Components & layout

- `AppSidebar` (shadcn sidebar, navy bg, amber STP mark) with sections "Kierowca" (Pulpit, Mój grafik, Ogłoszenia) and "Administracja" (Użytkownicy, Służby, Ogłoszenia) — admin section conditionally rendered via `has_role` check on profile context
- `AppHeader` with user name, employee ID, sign-out
- shadcn primitives: Dialog (create user / create duty), Form + zod, Table, Badge (role / status), Calendar (timetable month view), Tabs (list vs calendar)
- Toaster (sonner) for action feedback in Polish

Design tokens in `src/styles.css`: brand-primary `#0f172a`, brand-accent `#f59e0b`, brand-surface `#f8fafc`, fonts Public Sans (loaded via `<link>` in `__root.tsx` head) + JetBrains Mono. Both light and dark mode tokens defined; dark mode toggle in header.

### Out of scope (Phase 2, noted but not built)

Vehicle fleet records & images, availability weekly editor, vacation/exception requests, driver statistics dashboards, admin reports, announcement categories filtering UI (categories stored but not surfaced beyond a badge).

### Verification

After build: load `/auth`, sign in as bootstrapped admin, confirm sidebar shows admin section, create a driver account + a duty assigned to that driver, sign in as the driver in a private window, confirm `/pulpit` shows the duty in the hero card and upcoming list, and `/grafik` shows it in the table.