# Duty Planning Redesign — STP

A full rebuild of `/admin/sluzby` into an enterprise transit-ops planning board, delivered in 4 phases. Each phase ends in a working app; you can stop after any phase.

## Phase 1 — Schema & server foundations (1 migration + portal.functions extensions)

**Migration:**
- Add enum `vehicle_status` = `available | assigned | out_of_service | reserve`; add `vehicles.status` (default `available`).
- Extend `duties`:
  - `status` enum `duty_status` = `unassigned | pending | assigned` (auto-derived via trigger from `assigned_to`/`vehicle_id`).
  - `vehicle_id uuid` FK → `vehicles(id)` (keep `vehicle_label` for legacy/free-text).
  - `priority` enum = `low | normal | high` default `normal`.
  - `division` text (used by bulk generator; e.g. depot or operational division).
- New table `notifications`:
  - `id, user_id, type, title, body, related_duty_id, read_at, created_at`.
  - RLS: users select/update own; service_role full; trigger inserts on `duties.assigned_to` change.
- Indexes: `duties(duty_date, start_time)`, `duties(assigned_to, duty_date)`, `vehicles(status)`, `notifications(user_id, read_at)`.

**Server functions (`portal.functions.ts`):**
- `getPlanningBoard({from, to, depot?})` → duties+driver+vehicle joined, drivers (with month hours), vehicles, availability — all admin queries in one round-trip.
- `assignDriverToDuty({dutyId, driverId|null})` — runs conflict checks server-side.
- `assignVehicleToDuty({dutyId, vehicleId|null})` — overlap check.
- `bulkGenerateDuties({date, division, count, template})` — creates `N` duties named `<routes>/1..N`.
- `listUnassignedDuties({from?, to?})`.
- `getAdminAnalytics({date})` — today's tiles.
- `listMyNotifications`, `markNotificationRead`.

## Phase 2 — Planning board UI (`/admin/sluzby`)

Rebuilt page with three panes:

```text
┌──────────── Drivers ───────────┐┌─────── Schedule Board ────────┐┌── Duty Details ──┐
│ Filters: depot ▾  Active  Avail││ [Day][Week][Month]  < Jun 14 >││ Duty #151+190/1  │
│                                ││                                ││ 14:30 → 22:15    │
│ ● Jan Kowalski   D-1042   72h  ││  ┌─────────┐ ┌─────────┐       ││ Depot: Zaj. A    │
│ ● Anna Nowak     D-1080  140h  ││  │14:30    │ │08:00    │       ││ Routes: 151,190  │
│ ● Piotr Lis      D-1099   12h  ││  │22:15 ●  │ │16:00 ○  │       ││ Vehicle: 1925    │
│                                ││  │151+190/1│ │24/2     │       ││ Driver: J. Kow.. │
│ (drag onto duty →)             ││  └─────────┘ └─────────┘       ││ [Assign][Edit]   │
└────────────────────────────────┘└────────────────────────────────┘└──────────────────┘
```

- **Left:** drivers list with green/yellow/red dot (computed from availability + hours), filter chips, search. Draggable cards (`@dnd-kit`). Click → opens a sheet with profile + month duties.
- **Center:** Day / Week / Month tabs. Week view = 7-column grid; Day view = vertical time axis; Month = compact cells. Each duty card shows number, time, routes, vehicle badge, color-coded border (green/yellow/red). Drop targets accept driver cards.
- **Right:** selected duty details + actions (Assign/Change driver, Assign vehicle picker, Edit, Delete). Inline conflict warnings (driver unavailable, overlap, vehicle conflict).

Toolbar: `+ Nowa służba`, `⚡ Generator zbiorczy`, date navigator, depot filter.

## Phase 3 — Bulk generator, unassigned dashboard, conflict engine

- **Bulk generator dialog:** date · division · template (start, end, route(s), depot, vehicle optional) · count → creates `route/1`…`route/N`. Preview list before commit.
- **Unassigned dashboard** at `/admin/nieprzydzielone`: filter date range, sort by priority/date; one-click driver picker (uses same server fn as board).
- **Conflict detection** (server side, surfaced inline):
  - driver already assigned to overlapping duty,
  - driver on approved leave or marked unavailable,
  - vehicle assigned to overlapping duty,
  - missing driver / missing vehicle (warnings, not blockers).

## Phase 4 — Notifications & analytics

- DB trigger on `duties`: when `assigned_to` changes, insert a notification for the new driver ("Przydzielono do służby <nr>") and for the previous driver if changed ("Służba <nr> przepisana").
- Bell icon in `AppHeader` with unread count + dropdown (last 10, mark read).
- Driver `/pulpit` shows notification card.
- **Admin analytics** tiles on `/admin/raporty` (today): duties total · assigned · unassigned · drivers available · driver utilization % · vehicle utilization %.

## Technical notes
- DnD: `@dnd-kit/core` + `@dnd-kit/sortable` (install in Phase 2).
- All status colors via existing brand tokens (`--brand`, semantic destructive/warning); no hard-coded hex.
- Vehicle status auto-recomputed by trigger when duties insert/update/delete (so admin never edits it manually unless setting OOS/Reserve).
- The redesigned page replaces the current `src/routes/_authenticated/admin/sluzby.tsx` table.
- Existing `vehicle_label` field stays; new `vehicle_id` is preferred and we backfill labels from it.

## Out of scope (ask later if needed)
- SMS / email push for notifications (in-portal only).
- Driver self-swap requests.
- Multi-week shift patterns / rotation templates.

---

Reply **"go phase 1"** to start with the migration + server functions, or pick a different starting phase.