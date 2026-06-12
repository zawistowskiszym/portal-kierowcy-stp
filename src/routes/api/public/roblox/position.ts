import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

export const Route = createFileRoute("/api/public/roblox/position")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, x, y, z, heading, speed_kmh } = v.json ?? {};
        if (!roblox_username || typeof x !== "number" || typeof y !== "number") {
          return errorResponse(400, "roblox_username, x, y required");
        }

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.from("driver_positions").upsert({
          user_id: driver.id,
          x, y,
          z: typeof z === "number" ? z : null,
          heading: typeof heading === "number" ? heading : null,
          speed_kmh: typeof speed_kmh === "number" ? speed_kmh : null,
          updated_at: new Date().toISOString(),
        });
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ ok: true });
      },
    },
  },
});
