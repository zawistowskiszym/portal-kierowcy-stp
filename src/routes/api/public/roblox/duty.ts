import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

export const Route = createFileRoute("/api/public/roblox/duty")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, event, duty_number } = v.json ?? {};
        if (!roblox_username || !event) return errorResponse(400, "roblox_username and event required");
        if (!["start", "end", "break_start", "break_end"].includes(event)) {
          return errorResponse(400, "invalid event");
        }

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();
        const today = now.slice(0, 10);

        const live_status =
          event === "start" ? "on_route" :
          event === "end" ? "completed" :
          event === "break_start" ? "on_break" : "on_route";
        const presence =
          event === "end" ? "offline" :
          event === "break_start" ? "break" : "active";

        // Always update the lightweight driver_live row (no duty needed).
        await supabaseAdmin.from("driver_live").upsert({
          user_id: driver.id,
          live_status,
          live_status_note: `Roblox: ${event}`,
          live_status_updated_at: now,
          duty_number: duty_number ? String(duty_number) : null,
        });

        // Update presence regardless of duty allocation.
        await supabaseAdmin.from("driver_presence").upsert({
          user_id: driver.id,
          status: presence,
          updated_at: now,
        });

        // Best-effort: if a matching duty exists, mirror status there too.
        let q = supabaseAdmin.from("duties").select("id").eq("assigned_to", driver.id);
        if (duty_number) q = q.eq("duty_number", String(duty_number));
        else q = q.eq("duty_date", today);
        const { data: duty } = await q.maybeSingle();

        if (duty?.id) {
          await supabaseAdmin.from("duties").update({
            live_status,
            live_status_updated_at: now,
            live_status_note: `Roblox: ${event}`,
          }).eq("id", duty.id);
        }

        return jsonResponse({ ok: true, duty_id: duty?.id ?? null, live_status, presence });
      },
    },
  },
});
