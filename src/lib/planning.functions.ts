import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireStaff = async (supabase: any, userId: string) => {
  const [a, d] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "dyspozytor" }),
  ]);
  if (!a.data && !d.data) throw new Error("Brak uprawnień operacyjnych");
};

// ============== STOPS ==============

export const listStops = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stops")
      .select("id,name")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createStop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => z.object({ name: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("stops").insert({ name: data.name }).select("id,name").single();
    if (error) throw new Error(error.message);
    return row;
  });

// ============== LINES ==============

export const listLines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lines")
      .select("*")
      .order("line_number");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLine = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: line, error } = await context.supabase
      .from("lines").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);

    const { data: stops } = await context.supabase
      .from("line_stops")
      .select("id,direction,position,stop_id,travel_time_to_next_min,stops(id,name)")
      .eq("line_id", data.id)
      .order("position");

    return { line, stops: stops ?? [] };
  });

export const createLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { line_number: string; terminus_a: string; terminus_b: string; depot?: string }) =>
    z.object({
      line_number: z.string().trim().min(1).max(20),
      terminus_a: z.string().trim().min(1).max(120),
      terminus_b: z.string().trim().min(1).max(120),
      depot: z.string().trim().min(1).max(120).optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("lines").insert({
        line_number: data.line_number,
        terminus_a: data.terminus_a,
        terminus_b: data.terminus_b,
        depot: data.depot ?? "Zajezdnia Główna",
      }).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    patch: z.object({
      line_number: z.string().min(1).optional(),
      terminus_a: z.string().min(1).optional(),
      terminus_b: z.string().min(1).optional(),
      depot: z.string().min(1).optional(),
      custom_return: z.boolean().optional(),
      interlining_enabled: z.boolean().optional(),
      min_interline_layover_min: z.number().int().min(0).max(180).optional(),
      active: z.boolean().optional(),
    }),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("lines").update(data.patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("lines").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== LINE STOPS ==============

const stopRowSchema = z.object({
  stop_id: z.string().uuid(),
  travel_time_to_next_min: z.number().int().min(0).max(180),
});

export const saveLineStops = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid(),
    direction: z.enum(["AB", "BA"]),
    stops: z.array(stopRowSchema),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    await context.supabase.from("line_stops").delete()
      .eq("line_id", data.line_id).eq("direction", data.direction);
    if (data.stops.length === 0) return { ok: true };
    const rows = data.stops.map((s, i) => ({
      line_id: data.line_id,
      direction: data.direction,
      position: i,
      stop_id: s.stop_id,
      travel_time_to_next_min: s.travel_time_to_next_min,
    }));
    const { error } = await context.supabase.from("line_stops").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============== TIMETABLES ==============

export const getTimetables = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { line_id: string }) => z.object({ line_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: tts } = await context.supabase
      .from("line_timetables").select("*").eq("line_id", data.line_id);
    const { data: wins } = await context.supabase
      .from("line_frequency_windows").select("*")
      .in("timetable_id", (tts ?? []).map((t: any) => t.id).length ? (tts ?? []).map((t: any) => t.id) : ["00000000-0000-0000-0000-000000000000"])
      .order("start_time");
    return { timetables: tts ?? [], windows: wins ?? [] };
  });

export const upsertTimetable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid(),
    day_type: z.enum(["weekday", "saturday", "sunday"]),
    first_departure: z.string(),
    last_departure: z.string(),
    layover_a_min: z.number().int().min(0).max(60),
    layover_b_min: z.number().int().min(0).max(60),
    windows: z.array(z.object({
      start_time: z.string(),
      end_time: z.string(),
      headway_min: z.number().int().min(1).max(180),
    })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: tt, error } = await context.supabase.from("line_timetables").upsert({
      line_id: data.line_id,
      day_type: data.day_type,
      first_departure: data.first_departure,
      last_departure: data.last_departure,
      layover_a_min: data.layover_a_min,
      layover_b_min: data.layover_b_min,
    }, { onConflict: "line_id,day_type" }).select("*").single();
    if (error) throw new Error(error.message);
    await context.supabase.from("line_frequency_windows").delete().eq("timetable_id", tt.id);
    if (data.windows.length) {
      await context.supabase.from("line_frequency_windows").insert(
        data.windows.map((w) => ({ ...w, timetable_id: tt.id }))
      );
    }
    return tt;
  });

// ============== INTERLINE PAIRS ==============

export const listInterlinePairs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("line_interline_pairs").select("*");
    return data ?? [];
  });

export const setInterlinePairs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid(),
    partner_ids: z.array(z.string().uuid()),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    await context.supabase.from("line_interline_pairs").delete()
      .or(`line_a_id.eq.${data.line_id},line_b_id.eq.${data.line_id}`);
    if (data.partner_ids.length) {
      await context.supabase.from("line_interline_pairs").insert(
        data.partner_ids.map((pid) => ({ line_a_id: data.line_id, line_b_id: pid }))
      );
    }
    return { ok: true };
  });

// ============== BLOCK GENERATION ==============

type Trip = {
  line_id: string;
  line_number: string;
  direction: "AB" | "BA";
  departure_time: string; // HH:MM
  arrival_time: string;
  duration_min: number;
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function toTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`;
}
function toHHMM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export const generateBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid(),
    day_type: z.enum(["weekday", "saturday", "sunday"]),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);

    // Load line + stops + timetable + windows
    const { data: line } = await context.supabase.from("lines").select("*").eq("id", data.line_id).single();
    if (!line) throw new Error("Linia nie znaleziona");
    const { data: stops } = await context.supabase.from("line_stops").select("*")
      .eq("line_id", data.line_id);
    if (!stops || stops.length === 0) throw new Error("Brak przystanków na linii");

    const tripDuration = (dir: "AB" | "BA") => {
      const dirStops = stops.filter((s: any) => s.direction === dir).sort((a: any, b: any) => a.position - b.position);
      if (dirStops.length < 2) return 0;
      // sum travel_time except last stop
      return dirStops.slice(0, -1).reduce((acc: number, s: any) => acc + (s.travel_time_to_next_min || 1), 0);
    };
    let durAB = tripDuration("AB");
    let durBA = tripDuration("BA");
    if (durAB === 0 && durBA === 0) throw new Error("Nie zdefiniowano kierunków");
    if (durAB === 0) durAB = durBA;
    if (durBA === 0) durBA = durAB;

    const { data: tt } = await context.supabase.from("line_timetables").select("*")
      .eq("line_id", data.line_id).eq("day_type", data.day_type).single();
    if (!tt) throw new Error("Brak rozkładu dla wybranego typu dnia");

    const { data: wins } = await context.supabase.from("line_frequency_windows").select("*")
      .eq("timetable_id", tt.id).order("start_time");
    if (!wins || wins.length === 0) throw new Error("Brak okien częstotliwości");

    // Generate trips alternating AB/BA from terminal A
    const first = toMin(tt.first_departure);
    const last = toMin(tt.last_departure);
    const layoverA = tt.layover_a_min ?? 5;
    const layoverB = tt.layover_b_min ?? 5;

    function headwayAt(minute: number): number | null {
      for (const w of wins!) {
        const s = toMin(w.start_time);
        const e = toMin(w.end_time);
        if (minute >= s && minute < e) return w.headway_min;
      }
      return null;
    }

    // Departures from A
    const depsA: number[] = [];
    let t = first;
    while (t <= last) {
      depsA.push(t);
      const h = headwayAt(t);
      if (!h) break;
      t += h;
    }

    // Build trip pool: each AB trip + a returning BA trip
    const trips: Trip[] = [];
    for (const d of depsA) {
      trips.push({
        line_id: line.id, line_number: line.line_number, direction: "AB",
        departure_time: toHHMM(d), arrival_time: toHHMM(d + durAB), duration_min: durAB,
      });
      trips.push({
        line_id: line.id, line_number: line.line_number, direction: "BA",
        departure_time: toHHMM(d + durAB + layoverB),
        arrival_time: toHHMM(d + durAB + layoverB + durBA),
        duration_min: durBA,
      });
    }
    trips.sort((a, b) => toMin(a.departure_time) - toMin(b.departure_time));

    // Greedy assignment into blocks
    type Block = { trips: Trip[]; busyUntil: number; lastTerm: "A" | "B" };
    const blocks: Block[] = [];
    for (const trip of trips) {
      const dep = toMin(trip.departure_time);
      const needTerm = trip.direction === "AB" ? "A" : "B";
      const reqLayover = needTerm === "A" ? layoverA : layoverB;
      // find block whose lastTerm matches needTerm and busyUntil + layover <= dep
      let chosen = -1;
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.lastTerm === needTerm && b.busyUntil + reqLayover <= dep) {
          if (chosen === -1 || blocks[chosen].busyUntil < b.busyUntil) chosen = i;
        }
      }
      if (chosen === -1) {
        blocks.push({ trips: [trip], busyUntil: toMin(trip.arrival_time), lastTerm: trip.direction === "AB" ? "B" : "A" });
      } else {
        blocks[chosen].trips.push(trip);
        blocks[chosen].busyUntil = toMin(trip.arrival_time);
        blocks[chosen].lastTerm = trip.direction === "AB" ? "B" : "A";
      }
    }

    // Delete prior blocks for this line+day_type
    await context.supabase.from("vehicle_blocks").delete()
      .contains("line_ids", [line.id]).eq("day_type", data.day_type);

    // Persist
    let blockNo = 0;
    const out: any[] = [];
    for (const b of blocks) {
      blockNo += 1;
      const startT = b.trips[0].departure_time;
      const endT = b.trips[b.trips.length - 1].arrival_time;
      const { data: blk, error: blkErr } = await context.supabase.from("vehicle_blocks").insert({
        line_ids: [line.id],
        line_numbers: [line.line_number],
        block_number: blockNo,
        day_type: data.day_type,
        start_time: toTime(toMin(startT)),
        end_time: toTime(toMin(endT)),
        depot: line.depot,
      }).select("*").single();
      if (blkErr) throw new Error(blkErr.message);
      await context.supabase.from("vehicle_block_trips").insert(
        b.trips.map((t, i) => ({
          block_id: blk.id, line_id: t.line_id, line_number: t.line_number,
          direction: t.direction,
          departure_time: toTime(toMin(t.departure_time)),
          arrival_time: toTime(toMin(t.arrival_time)),
          trip_order: i,
        })),
      );
      out.push(blk);
    }
    return { blocks: out, count: blocks.length, round_trip_min: durAB + durBA + layoverA + layoverB };
  });

export const listBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid().optional(),
    day_type: z.enum(["weekday", "saturday", "sunday"]).optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase.from("vehicle_blocks").select("*").order("day_type").order("block_number");
    if (data.day_type) q = q.eq("day_type", data.day_type);
    if (data.line_id) q = q.contains("line_ids", [data.line_id]);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const getBlockTrips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ block_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: rows } = await context.supabase.from("vehicle_block_trips").select("*")
      .eq("block_id", data.block_id).order("trip_order");
    return rows ?? [];
  });

// ============== DUTIES GENERATION (push to existing duties table) ==============

export const generateDutiesFromBlocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    day_type: z.enum(["weekday", "saturday", "sunday"]),
    date_from: z.string(), // YYYY-MM-DD
    date_to: z.string(),
    replace_existing: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: blocks } = await context.supabase.from("vehicle_blocks").select("*").eq("day_type", data.day_type);
    if (!blocks || blocks.length === 0) return { inserted: 0 };

    const start = new Date(data.date_from + "T00:00:00");
    const end = new Date(data.date_to + "T00:00:00");
    const dayMatches = (d: Date) => {
      const dow = d.getDay(); // 0 Sun, 6 Sat
      if (data.day_type === "saturday") return dow === 6;
      if (data.day_type === "sunday") return dow === 0;
      return dow >= 1 && dow <= 5;
    };

    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (dayMatches(d)) dates.push(d.toISOString().slice(0, 10));
    }

    if (data.replace_existing && dates.length) {
      await context.supabase.from("duties").delete()
        .gte("duty_date", dates[0]).lte("duty_date", dates[dates.length - 1]);
    }

    const rows: any[] = [];
    for (const date of dates) {
      for (const b of blocks) {
        rows.push({
          duty_number: String(b.block_number),
          duty_date: date,
          start_time: b.start_time,
          end_time: b.end_time,
          depot: b.depot,
          route: (b.line_numbers as string[]).join("+"),
          created_by: context.userId,
        });
      }
    }
    if (!rows.length) return { inserted: 0 };
    // chunked insert
    const chunk = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error } = await context.supabase.from("duties").insert(slice);
      if (error) throw new Error(error.message);
      inserted += slice.length;
    }
    return { inserted };
  });

// ============== PLANNING DASHBOARD ==============

export const planningDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    line_id: z.string().uuid().optional(),
    day_type: z.enum(["weekday", "saturday", "sunday"]).optional(),
  }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    const [lines, tts, blocksRes] = await Promise.all([
      context.supabase.from("lines").select("*").order("line_number"),
      context.supabase.from("line_timetables").select("*"),
      (async () => {
        let q = context.supabase.from("vehicle_blocks").select("*");
        if (data.day_type) q = q.eq("day_type", data.day_type);
        if (data.line_id) q = q.contains("line_ids", [data.line_id]);
        return q;
      })(),
    ]);
    const blocks = blocksRes.data ?? [];
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data: todayDuties } = await context.supabase
      .from("duties").select("id,duty_number,route,start_time,end_time,assigned_to,status")
      .eq("duty_date", todayIso).order("start_time");
    return {
      lines: lines.data ?? [],
      timetables: tts.data ?? [],
      blocks,
      duties: todayDuties ?? [],
      vehicles_required: blocks.length,
    };
  });
