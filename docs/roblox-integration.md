# Roblox ↔ Portal STP — HTTPS integration

Bidirectional integration between the Roblox game and Portal STP. Identity is
resolved per request via `profiles.roblox_username` (set on the driver's
profile in the portal). All endpoints are authenticated with HMAC‑SHA256
over `${timestamp}.${body}` using the shared secret `ROBLOX_SHARED_SECRET`.

## Base URL

Production: `https://panel.skuszawyjice.eu/api/public/roblox`
(or `https://stp-driver-hub.lovable.app/api/public/roblox`)

## Required headers (every request)

```
Content-Type: application/json
x-roblox-timestamp: <unix ms, e.g. 1781258914654>
x-roblox-signature: <hex hmac_sha256(ROBLOX_SHARED_SECRET, "<timestamp>.<rawBody>")>
```

`GET` requests send an empty body — the signature is over `"<timestamp>."`.
Requests with `|now - timestamp| > 5 min` are rejected.

## Endpoints

### POST `/duty` — duty lifecycle
```json
{ "roblox_username": "DriverX", "event": "start", "duty_number": "12/01" }
```
`event` ∈ `start | end | break_start | break_end`. Updates `duties.live_status`
and `driver_presence.status`.

### POST `/pis` — PIS / route telemetry
```json
{ "roblox_username": "DriverX", "route": "175",
  "headsign": "Dw. Centralny", "current_stop": "Politechnika",
  "next_stop": "Pl. Konstytucji", "delay_sec": 90 }
```

### POST `/position` — periodic position ping
```json
{ "roblox_username": "DriverX", "x": 123.4, "y": 56.7, "z": 0,
  "heading": 90, "speed_kmh": 38 }
```

### POST `/incident`
```json
{ "roblox_username": "DriverX", "type": "breakdown",
  "priority": "high", "description": "Awaria drzwi",
  "location": "ul. Marszałkowska" }
```
`type` ∈ `collision|breakdown|blockage|major_delay|passenger_emergency|security|infrastructure|other`.

### GET `/driver?roblox_username=DriverX`
Returns the driver's profile, today's active duty, pending dispatcher
messages and pending in‑game commands. Poll every 15–30 s. Commands are
marked `delivered_at` on this call.

### GET `/spawn?roblox_username=DriverX` — vehicle the driver may spawn
Called by the in‑game spawn GUI. Returns the vehicle assigned to today's
duty so Roblox knows which model/number to spawn. `409` when the driver
has no duty or no vehicle assigned, `404` when the username is unknown.

```json
{
  "ok": true,
  "can_spawn": true,
  "driver": { "id": "...", "full_name": "...", "employee_id": "..." },
  "duty":    { "id": "...", "duty_number": "12/01", "route": "175", "depot": "R-1" },
  "vehicle": { "id": "...", "vehicle_number": "1234", "model": "Solaris U18",
               "fuel": "Diesel", "depot": "R-1" }
}
```

### POST `/spawn` — confirm the in‑game spawn
Call after the GUI actually spawns the vehicle. Re‑validates the
assignment server‑side, updates `driver_live` and writes an audit row
to `dispatcher_log`.

```json
{ "roblox_username": "DriverX",
  "vehicle_number": "1234",            // optional, must match assignment
  "spawn_location": "Zajezdnia R-1" }  // optional
```



### POST `/ack`
```json
{ "roblox_username": "DriverX",
  "command_ids": ["..."], "message_ids": ["..."] }
```
Acks delivered commands / marks messages as read.

## Reference Lua (Roblox `HttpService`)

```lua
local HttpService = game:GetService("HttpService")
local SECRET = "<ROBLOX_SHARED_SECRET>"
local BASE = "https://panel.skuszawyjice.eu/api/public/roblox"

-- HMAC-SHA256 helper (use a vetted library, e.g. boatbomber/HashLib)
local HashLib = require(script.HashLib)

local function send(path, method, body)
  local raw = body and HttpService:JSONEncode(body) or ""
  local ts  = tostring(math.floor(os.time() * 1000))
  local sig = HashLib.hmac(HashLib.sha256, SECRET, ts .. "." .. raw, true)
  return HttpService:RequestAsync({
    Url = BASE .. path,
    Method = method,
    Headers = {
      ["Content-Type"]       = "application/json",
      ["x-roblox-timestamp"] = ts,
      ["x-roblox-signature"] = sig,
    },
    Body = raw,
  })
end

-- start service
send("/duty", "POST", { roblox_username = "DriverX", event = "start" })
-- poll
local res = send("/driver?roblox_username=DriverX", "GET", nil)
```

HttpService requests must be enabled in the game settings.

### POST `/pis` — extended fields
The `/pis` endpoint also accepts `stop_index` (0-based index of the stop the
bus just left / is at) and `total_stops` (number of stops on the current
direction of the route). These power the "Progress X / Y stops" UI on the
driver's dashboard and on the dispatcher monitor.

```json
{ "roblox_username": "DriverX", "route": "178",
  "headsign": "Brokolin", "current_stop": "Śródmieście",
  "next_stop": "Wiktoria", "stop_index": 7, "total_stops": 18,
  "delay_sec": 0 }
```

### GET `/timetable?route=178[&day_type=weekday]`
Returns the line definition, ordered list of stops (per direction) with
travel time to next stop, the active timetable, and frequency windows. The
game uses this to render arrival times and the stop list. `day_type` is
optional — defaults to today's day type (`weekday`, `saturday`, `sunday`).

```json
{
  "ok": true,
  "line": { "id": "...", "line_number": "178", "terminus_a": "Centrum",
            "terminus_b": "Brokolin", "depot": "R-1" },
  "day_type": "weekday",
  "stops": [
    { "position": 1, "direction": "a", "name": "Centrum", "code": "01",
      "travel_time_to_next_min": 2 }
  ],
  "timetable": { "first_departure": "04:30", "last_departure": "23:10",
                 "layover_a_min": 5, "layover_b_min": 5 },
  "frequency_windows": [
    { "start_time": "06:00", "end_time": "09:00", "headway_min": 6 }
  ]
}
```

### GET `/timetable` (no `route`) — all lines
Omit `route` to fetch every line at once. The response uses a `lines: [...]`
array; each item has the same `{ line, stops, timetable, frequency_windows }`
shape as the single-line response.

```json
{
  "ok": true,
  "day_type": "weekday",
  "lines": [
    { "line": { "line_number": "178", ... }, "stops": [...],
      "timetable": {...}, "frequency_windows": [...] }
  ]
}
```
