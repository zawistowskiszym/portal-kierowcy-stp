import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

// GET endpoint — signed via headers; body is empty string, signature covers `${ts}.`
export const Route = createFileRoute("/api/public/roblox/driver")({
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);

        const [dutyRes, liveRes, msgsRes, cmdsRes] = await Promise.all([
          supabaseAdmin.from("duties")
            .select("id, duty_number, duty_date, route, vehicle_id, vehicle_label, depot, start_time, end_time, live_status, notes, pis_route, pis_headsign, pis_current_stop, pis_next_stop, pis_delay_sec, vehicles:vehicle_id(id, vehicle_number, model, fuel, depot)")
            .eq("assigned_to", driver.id).eq("duty_date", today).maybeSingle(),
          supabaseAdmin.from("driver_live")
            .select("live_status, live_status_note, live_status_updated_at, pis_route, pis_headsign, pis_current_stop, pis_next_stop, pis_delay_sec, pis_updated_at, duty_number")
            .eq("user_id", driver.id).maybeSingle(),
          supabaseAdmin.from("message_recipients")
            .select("read_at, internal_messages!inner(id, kind, title, body, created_at)")
            .eq("user_id", driver.id).is("read_at", null).limit(20),
          supabaseAdmin.from("roblox_commands")
            .select("id, type, payload, created_at")
            .eq("target_user_id", driver.id).is("acked_at", null).order("created_at", { ascending: true }).limit(20),
        ]);

        // Mark commands as delivered (but not acked).
        if (cmdsRes.data && cmdsRes.data.length) {
          const undeliveredIds = cmdsRes.data.map((c: any) => c.id);
          await supabaseAdmin.from("roblox_commands").update({ delivered_at: new Date().toISOString() })
            .in("id", undeliveredIds).is("delivered_at", null);
        }

        const duty: any = dutyRes.data ?? null;
        const vehicle = duty?.vehicles ?? null;

        return jsonResponse({
          profile: {
            id: driver.id,
            full_name: driver.full_name,
            employee_id: driver.employee_id,
            depot: driver.depot,
          },
          active_duty: duty
            ? {
                id: duty.id,
                duty_number: duty.duty_number,
                duty_date: duty.duty_date,
                route: duty.route,
                depot: duty.depot,
                start_time: duty.start_time,
                end_time: duty.end_time,
                live_status: duty.live_status,
                notes: duty.notes,
                vehicle_id: duty.vehicle_id ?? null,
                vehicle_label: duty.vehicle_label ?? vehicle?.vehicle_number ?? null,
                vehicle: vehicle
                  ? {
                      id: vehicle.id,
                      vehicle_number: vehicle.vehicle_number,
                      model: vehicle.model,
                      fuel: vehicle.fuel,
                      depot: vehicle.depot,
                    }
                  : null,
                pis_route: duty.pis_route,
                pis_headsign: duty.pis_headsign,
                pis_current_stop: duty.pis_current_stop,
                pis_next_stop: duty.pis_next_stop,
                pis_delay_sec: duty.pis_delay_sec,
              }
            : null,
          live: liveRes.data ?? null,
          messages: (msgsRes.data ?? []).map((r: any) => r.internal_messages).filter(Boolean),
          commands: cmdsRes.data ?? [],
          server_time: new Date().toISOString(),
        });
      },
    },
  },
});
