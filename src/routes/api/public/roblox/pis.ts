import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

export const Route = createFileRoute("/api/public/roblox/pis")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, route, headsign, current_stop, next_stop, delay_sec, duty_number, stop_index, total_stops } = v.json ?? {};
        if (!roblox_username || !route) return errorResponse(400, "roblox_username and route required");

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();
        const today = now.slice(0, 10);
        const delay = typeof delay_sec === "number" ? Math.trunc(delay_sec) : null;

        // Always write PIS to driver_live (no duty required).
        const { error: liveErr } = await supabaseAdmin.from("driver_live").upsert({
          user_id: driver.id,
          pis_route: String(route),
          pis_headsign: headsign ?? null,
          pis_current_stop: current_stop ?? null,
          pis_next_stop: next_stop ?? null,
          pis_delay_sec: delay,
          pis_updated_at: now,
          duty_number: duty_number ? String(duty_number) : null,
        });
        if (liveErr) return errorResponse(500, liveErr.message);

        // Best-effort mirror to duty row if one matches today.
        let q = supabaseAdmin.from("duties").select("id").eq("assigned_to", driver.id);
        if (duty_number) q = q.eq("duty_number", String(duty_number));
        else q = q.eq("duty_date", today);
        const { data: duty } = await q.maybeSingle();

        if (duty?.id) {
          await supabaseAdmin.from("duties").update({
            pis_route: String(route),
            pis_headsign: headsign ?? null,
            pis_current_stop: current_stop ?? null,
            pis_next_stop: next_stop ?? null,
            pis_delay_sec: delay,
            pis_updated_at: now,
          }).eq("id", duty.id);
        }

        return jsonResponse({ ok: true, duty_id: duty?.id ?? null });
      },
    },
  },
});
