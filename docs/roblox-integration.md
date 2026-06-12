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
