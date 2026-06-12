import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, verifyRobloxRequest } from "@/lib/roblox-auth.server";

// GET /api/public/roblox/timetable?route=178[&day_type=weekday]
// Returns the stops, frequency windows and timetable summary for a line
// so the in-game PIS / driver UI can display arrival times and stop lists.
export const Route = createFileRoute("/api/public/roblox/timetable")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const v = await verifyRobloxRequest(request);
        if (!v.ok) return errorResponse(v.status, v.message);

        const url = new URL(request.url);
        const route = url.searchParams.get("route");
        const dayTypeParam = url.searchParams.get("day_type");
        if (!route) return errorResponse(400, "route query parameter required");

        const dayType =
          dayTypeParam ??
          (() => {
            const d = new Date().getDay();
            if (d === 0) return "sunday";
            if (d === 6) return "saturday";
            return "weekday";
          })();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: line, error: lineErr } = await supabaseAdmin
          .from("lines")
          .select("id, line_number, terminus_a, terminus_b, depot")
          .eq("line_number", String(route))
          .maybeSingle();
        if (lineErr) return errorResponse(500, lineErr.message);
        if (!line) return errorResponse(404, "line not found");

        const [stopsRes, ttRes] = await Promise.all([
          supabaseAdmin
            .from("line_stops")
            .select("position, direction, travel_time_to_next_min, stop:stop_id(name, code)")
            .eq("line_id", line.id)
            .order("direction")
            .order("position"),
          supabaseAdmin
            .from("line_timetables")
            .select("id, day_type, first_departure, last_departure, layover_a_min, layover_b_min")
            .eq("line_id", line.id)
            .eq("day_type", dayType as any)
            .maybeSingle(),
        ]);

        const timetable = ttRes.data ?? null;
        const freqRes = timetable
          ? await supabaseAdmin
              .from("line_frequency_windows")
              .select("start_time, end_time, headway_min")
              .eq("timetable_id", timetable.id)
              .order("start_time")
          : { data: [] as any[] };

        const stops = (stopsRes.data ?? []).map((s: any) => ({
          position: s.position,
          direction: s.direction,
          travel_time_to_next_min: s.travel_time_to_next_min,
          name: s.stop?.name ?? null,
          code: s.stop?.code ?? null,
        }));

        return jsonResponse({
          ok: true,
          line: {
            id: line.id,
            line_number: line.line_number,
            terminus_a: line.terminus_a,
            terminus_b: line.terminus_b,
            depot: line.depot,
          },
          day_type: dayType,
          stops,
          timetable: ttRes.data ?? null,
          frequency_windows: freqRes.data ?? [],
          server_time: new Date().toISOString(),
        });
      },
    },
  },
});
