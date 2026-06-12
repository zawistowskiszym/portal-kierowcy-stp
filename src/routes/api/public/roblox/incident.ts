import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

const TYPES = new Set(["collision","breakdown","blockage","major_delay","passenger_emergency","security","infrastructure","other"]);
const PRIO = new Set(["critical","high","medium","low"]);

export const Route = createFileRoute("/api/public/roblox/incident")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, type, priority, description, location, route, vehicle_label, duty_number } = v.json ?? {};
        if (!roblox_username || !type || !description) return errorResponse(400, "roblox_username, type, description required");
        if (!TYPES.has(String(type))) return errorResponse(400, "invalid type");
        const prio = priority && PRIO.has(String(priority)) ? String(priority) : "medium";

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const today = new Date().toISOString().slice(0, 10);
        let q = supabaseAdmin.from("duties").select("id, route, vehicle_label, duty_number").eq("assigned_to", driver.id);
        if (duty_number) q = q.eq("duty_number", String(duty_number));
        else q = q.eq("duty_date", today);
        const { data: duty } = await q.maybeSingle();

        const { data, error } = await supabaseAdmin.from("incidents").insert({
          reporter_id: driver.id,
          duty_id: duty?.id ?? null,
          route: route ?? duty?.route ?? null,
          vehicle_label: vehicle_label ?? duty?.vehicle_label ?? null,
          duty_number: duty?.duty_number ?? (duty_number ?? null),
          type,
          priority: prio,
          location: location ?? null,
          description: String(description).slice(0, 4000),
          source: "roblox",
          occurred_at: new Date().toISOString(),
        } as any).select("id, incident_code").single();
        if (error) return errorResponse(500, error.message);

        return jsonResponse({ ok: true, incident_id: data.id, incident_code: data.incident_code });
      },
    },
  },
});
