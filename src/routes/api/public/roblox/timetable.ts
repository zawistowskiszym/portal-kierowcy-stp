import { createFileRoute } from "@tanstack/react-router";
import { CORS_HEADERS, errorResponse, jsonResponse, verifyRobloxRequest } from "@/lib/roblox-auth.server";

// GET /api/public/roblox/timetable[?route=178][&day_type=weekday]
// Returns the stops, frequency windows and timetable summary for one line
// (when `route` is provided) or for every active line (when omitted).
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

        const dayType =
          dayTypeParam ??
          (() => {
            const d = new Date().getDay();
            if (d === 0) return "sunday";
            if (d === 6) return "saturday";
            return "weekday";
          })();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Load lines (single or all)
        let linesQ = supabaseAdmin
          .from("lines")
          .select("id, line_number, terminus_a, terminus_b, depot")
          .order("line_number");
        if (route) linesQ = linesQ.eq("line_number", String(route));
        const { data: lines, error: linesErr } = await linesQ;
        if (linesErr) return errorResponse(500, linesErr.message);
        if (!lines || lines.length === 0) {
          return route ? errorResponse(404, "line not found") : jsonResponse({ ok: true, day_type: dayType, lines: [], server_time: new Date().toISOString() });
        }

        const lineIds = lines.map((l: any) => l.id);

        // Bulk fetch stops + timetables for all selected lines.
        const [stopsRes, ttRes] = await Promise.all([
          supabaseAdmin
            .from("line_stops")
            .select("line_id, position, direction, travel_time_to_next_min, stop:stop_id(name, code)")
            .in("line_id", lineIds)
            .order("position"),
          supabaseAdmin
            .from("line_timetables")
            .select("id, line_id, day_type, first_departure, last_departure, layover_a_min, layover_b_min")
            .in("line_id", lineIds)
            .eq("day_type", dayType as any),
        ]);

        const timetables = ttRes.data ?? [];
        const ttIds = timetables.map((t: any) => t.id);
        const freqRes = ttIds.length
          ? await supabaseAdmin
              .from("line_frequency_windows")
              .select("timetable_id, start_time, end_time, headway_min")
              .in("timetable_id", ttIds)
              .order("start_time")
          : { data: [] as any[] };

        const stopsByLine = new Map<string, any[]>();
        for (const s of (stopsRes.data ?? []) as any[]) {
          const arr = stopsByLine.get(s.line_id) ?? [];
          arr.push({
            position: s.position,
            direction: s.direction,
            travel_time_to_next_min: s.travel_time_to_next_min,
            name: s.stop?.name ?? null,
            code: s.stop?.code ?? null,
          });
          stopsByLine.set(s.line_id, arr);
        }
        const ttByLine = new Map<string, any>();
        for (const t of timetables as any[]) ttByLine.set(t.line_id, t);
        const freqByTt = new Map<string, any[]>();
        for (const f of ((freqRes.data ?? []) as any[])) {
          const arr = freqByTt.get(f.timetable_id) ?? [];
          arr.push({ start_time: f.start_time, end_time: f.end_time, headway_min: f.headway_min });
          freqByTt.set(f.timetable_id, arr);
        }

        const buildLine = (l: any) => {
          const tt = ttByLine.get(l.id) ?? null;
          return {
            line: {
              id: l.id,
              line_number: l.line_number,
              terminus_a: l.terminus_a,
              terminus_b: l.terminus_b,
              depot: l.depot,
            },
            stops: stopsByLine.get(l.id) ?? [],
            timetable: tt
              ? {
                  first_departure: tt.first_departure,
                  last_departure: tt.last_departure,
                  layover_a_min: tt.layover_a_min,
                  layover_b_min: tt.layover_b_min,
                }
              : null,
            frequency_windows: tt ? freqByTt.get(tt.id) ?? [] : [],
          };
        };

        // Single-line response keeps the original flat shape for backward compatibility.
        if (route) {
          const built = buildLine(lines[0]);
          return jsonResponse({
            ok: true,
            day_type: dayType,
            ...built,
            server_time: new Date().toISOString(),
          });
        }

        return jsonResponse({
          ok: true,
          day_type: dayType,
          lines: lines.map(buildLine),
          server_time: new Date().toISOString(),
        });
      },
    },
  },
});
