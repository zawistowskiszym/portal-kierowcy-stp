import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, resolveDriverByRoblox, verifyRobloxRequest } from "@/lib/roblox-auth.server";

export const Route = createFileRoute("/api/public/roblox/ack")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const { roblox_username, command_ids, message_ids } = v.json ?? {};
        if (!roblox_username) return errorResponse(400, "roblox_username required");

        const driver = await resolveDriverByRoblox(String(roblox_username));
        if (!driver) return errorResponse(404, "driver not found");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date().toISOString();

        if (Array.isArray(command_ids) && command_ids.length) {
          await supabaseAdmin.from("roblox_commands").update({ acked_at: now })
            .in("id", command_ids).eq("target_user_id", driver.id);
        }
        if (Array.isArray(message_ids) && message_ids.length) {
          await supabaseAdmin.from("message_recipients").update({ read_at: now })
            .in("message_id", message_ids).eq("user_id", driver.id);
        }

        return jsonResponse({ ok: true });
      },
    },
  },
});
