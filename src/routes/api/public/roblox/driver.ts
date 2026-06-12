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

        const [dutyRes, msgsRes, cmdsRes] = await Promise.all([
          supabaseAdmin.from("duties")
            .select("id, duty_number, route, vehicle_label, depot, start_time, end_time, live_status, notes, pis_route, pis_headsign, pis_current_stop, pis_next_stop, pis_delay_sec")
            .eq("assigned_to", driver.id).eq("duty_date", today).maybeSingle(),
          supabaseAdmin.from("message_recipients")
            .select("read_at, internal_messages!inner(id, kind, title, body, created_at)")
            .eq("user_id", driver.id).is("read_at", null).order("created_at", { foreignTable: "internal_messages", ascending: false }).limit(20),
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

        return jsonResponse({
          profile: {
            id: driver.id,
            full_name: driver.full_name,
            employee_id: driver.employee_id,
            depot: driver.depot,
          },
          active_duty: dutyRes.data ?? null,
          messages: (msgsRes.data ?? []).map((r: any) => r.internal_messages).filter(Boolean),
          commands: cmdsRes.data ?? [],
          server_time: new Date().toISOString(),
        });
      },
    },
  },
});
