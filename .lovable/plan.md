## Roblox HTTPS integration

Bidirectional sync between the Roblox game and the STP portal, with driver identity resolved via `profiles.roblox_username`.

### Endpoints (public server routes under `/api/public/roblox/*`)

All requests authenticated with a shared HMAC: header `x-roblox-signature = hex(hmac_sha256(ROBLOX_SHARED_SECRET, raw_body))` + `x-roblox-timestamp` (rejected if older than 5 min, prevents replay). Every request body carries `roblox_username` to identify the driver.

**Game → Portal (telemetry)**

- `POST /api/public/roblox/duty` — duty lifecycle. Body: `{ roblox_username, event: "start"|"end"|"break_start"|"break_end", duty_number?, route?, vehicle_label?, at? }`. Effects: updates `duties.live_status` for the driver's active duty (today's by default, or matched by `duty_number`) and `driver_presence.status` (`active` / `break` / `offline`).
- `POST /api/public/roblox/pis` — PIS / route telemetry. Body: `{ roblox_username, route, headsign?, current_stop?, next_stop?, delay_sec? }`. Stored on the active duty (new columns `pis_route`, `pis_headsign`, `pis_current_stop`, `pis_next_stop`, `pis_delay_sec`, `pis_updated_at`).
- `POST /api/public/roblox/position` — periodic ping. Body: `{ roblox_username, x, y, z?, heading?, speed_kmh? }`. Upserts a row in new `driver_positions` table (one row per driver, updated_at).
- `POST /api/public/roblox/incident` — in-game incident. Body: `{ roblox_username, kind, severity, summary, details?, location? }`. Inserts into `incidents` with `source = 'roblox'`.

**Portal → Game (pull)**

- `GET /api/public/roblox/driver?roblox_username=...` — returns the driver's active duty + dispatcher messages. Shape: `{ profile: { employee_id, full_name, depot }, active_duty: { duty_number, route, vehicle_label, start_time, end_time, live_status }|null, messages: [{ id, kind, title, body, sent_at }], commands: [{ id, type, payload }] }`. Game polls this every 15–30 s.
- `POST /api/public/roblox/ack` — acks a delivered command/message so it stops being returned.

### Database changes (single migration)

- Add columns to `duties`: `pis_route text`, `pis_headsign text`, `pis_current_stop text`, `pis_next_stop text`, `pis_delay_sec int`, `pis_updated_at timestamptz`.
- Add column `incidents.source text not null default 'portal'`.
- New table `public.driver_positions` (`user_id uuid PK → profiles`, `x double precision`, `y double precision`, `z double precision`, `heading real`, `speed_kmh real`, `updated_at timestamptz`). GRANTs + RLS: drivers see/insert their own row, dispatchers/admins read all, service_role full.
- New table `public.roblox_commands` (id, target_user_id, type text, payload jsonb, created_at, delivered_at, acked_at). GRANTs + RLS: target driver can read/ack own; admins/dispatchers can insert; service_role full.

### Files

- `src/lib/roblox-auth.server.ts` — HMAC verify + timestamp check helper.
- `src/routes/api/public/roblox/duty.ts`
- `src/routes/api/public/roblox/pis.ts`
- `src/routes/api/public/roblox/position.ts`
- `src/routes/api/public/roblox/incident.ts`
- `src/routes/api/public/roblox/driver.ts`
- `src/routes/api/public/roblox/ack.ts`

Each handler: parse raw body, verify HMAC + timestamp, resolve `user_id` via `profiles.roblox_username` (case-insensitive), use `supabaseAdmin` (dynamic import in handler) for writes, return JSON with proper CORS headers + OPTIONS handler.

### Dispatcher UI additions (light)

- On `/admin/monitor` (or `/admin/mapa`), show last `driver_positions.updated_at` and PIS fields per active duty.
- On `/admin/komunikacja`, add a "Wyślij komendę do gry" action that inserts into `roblox_commands` (types: `force_end_service`, `recall_to_depot`, `custom_message`).

### Secrets

- `ROBLOX_SHARED_SECRET` — added via `add_secret`, used server-side only for HMAC verification. Same value pasted into the Roblox game's `HttpService` script.

### Roblox-side reference (for the user, not built here)

A short Markdown doc at `docs/roblox-integration.md` with: base URL, endpoint list, request/response examples, and a minimal Lua snippet showing how to sign requests with HMAC-SHA256 and how to poll `/driver`.

### Out of scope (v1)

- No per-driver tokens (identity = `roblox_username` + signed request).
- No realtime WebSocket — game polls `/driver` and pushes telemetry on its own cadence.
- No map tile rendering of in-game coords (just raw values shown to dispatcher).
