import { createFileRoute } from "@tanstack/react-router";
import {
  CORS_HEADERS,
  errorResponse,
  jsonResponse,
  resolveDriverByRoblox,
  verifyRobloxRequest,
} from "@/lib/roblox-auth.server";

// Roblox vehicle spawn endpoint.
//
// GET  /api/public/roblox/spawn?roblox_username=DriverX
//   → returns the vehicle the driver is allowed to spawn right now
//     (based on today's active duty). 409 if no eligible vehicle.
//
// POST /api/public/roblox/spawn
//   body: { roblox_username, vehicle_number?, spawn_location? }
//   → records that the vehicle was spawned in-game, updates live status
//     and writes an audit row. Returns the resolved vehicle.
//
// Both verbs are HMAC-signed (see roblox-auth.server / docs/roblox-integration.md).

export const Route = createFileRoute("/api/public/roblox/spawn")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),

      GET: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const url = new URL(request.url);
        const username = url.searchParams.get("roblox_username");
        if (!username) return errorResponse(400, "roblox_username required");

        const driver = await resolveDriverByRoblox(username);
        if (!driver) return errorResponse(404, "driver not found");

        const eligible = await resolveAssignedVehicle(driver.id);
        if (!eligible.ok) return errorResponse(eligible.status, eligible.message);

        return jsonResponse({
          ok: true,
          can_spawn: true,
          driver: { id: driver.id, full_name: driver.full_name, employee_id: driver.employee_id },
          duty: eligible.duty,
          vehicle: eligible.vehicle,
        });
      },

      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, vehicle_number, spawn_location } = v.json ?? {};
        if (!roblox_username) return errorResponse(400, "roblox_username required");

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const eligible = await resolveAssignedVehicle(driver.id);
        if (!eligible.ok) return errorResponse(eligible.status, eligible.message);

        // If the client claims a specific vehicle, it must match the assignment.
        if (vehicle_number && String(vehicle_number) !== eligible.vehicle.vehicle_number) {
          return errorResponse(
            403,
            `vehicle ${vehicle_number} is not assigned to this driver today`,
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        await supabaseAdmin.from("driver_live").upsert({
          user_id: driver.id,
          live_status: "on_route",
          live_status_note: `Spawned vehicle ${eligible.vehicle.vehicle_number} in Roblox`,
          live_status_updated_at: now,
          duty_number: eligible.duty.duty_number ?? null,
        });

        await supabaseAdmin.from("dispatcher_log").insert({
          actor_id: driver.id,
          action: "roblox_vehicle_spawn",
          target_kind: "vehicle",
          target_id: eligible.vehicle.id,
          target_label: eligible.vehicle.vehicle_number,
          meta: {
            duty_id: eligible.duty.id,
            duty_number: eligible.duty.duty_number,
            route: eligible.duty.route,
            spawn_location: spawn_location ?? null,
            via: "roblox",
          },
        });

        return jsonResponse({
          ok: true,
          spawned_at: now,
          vehicle: eligible.vehicle,
          duty: eligible.duty,
        });
      },
    },
  },
});

type EligibleVehicle =
  | { ok: true; vehicle: any; duty: any }
  | { ok: false; status: number; message: string };

async function resolveAssignedVehicle(driverId: string): Promise<EligibleVehicle> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = new Date().toISOString().slice(0, 10);

  const { data: duty, error } = await supabaseAdmin
    .from("duties")
    .select(
      "id, duty_number, duty_date, route, depot, vehicle_id, vehicle_label, vehicles:vehicle_id(id, vehicle_number, model, fuel, depot, active)",
    )
    .eq("assigned_to", driverId)
    .eq("duty_date", today)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!duty) return { ok: false, status: 409, message: "no duty assigned for today" };

  const v: any = (duty as any).vehicles ?? null;
  if (!v && !duty.vehicle_label) {
    return { ok: false, status: 409, message: "duty has no vehicle assigned" };
  }
  if (v && v.active === false) {
    return { ok: false, status: 409, message: "assigned vehicle is inactive" };
  }

  const vehicle = v
    ? { id: v.id, vehicle_number: v.vehicle_number, model: v.model, fuel: v.fuel, depot: v.depot }
    : { id: null, vehicle_number: duty.vehicle_label!, model: null, fuel: null, depot: duty.depot };

  return {
    ok: true,
    duty: {
      id: duty.id,
      duty_number: duty.duty_number,
      duty_date: duty.duty_date,
      route: duty.route,
      depot: duty.depot,
    },
    vehicle,
  };
}
