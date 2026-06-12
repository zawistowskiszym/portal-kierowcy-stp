import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireStaff = async (supabase: any, userId: string) => {
  const [a, d] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "dyspozytor" }),
  ]);
  if (!a.data && !d.data) throw new Error("Brak uprawnień dyspozytorskich");
};

const logAction = async (
  supabase: any,
  userId: string,
  action: string,
  targetKind?: string,
  targetId?: string | null,
  targetLabel?: string | null,
  meta: any = {},
) => {
  await supabase.from("dispatcher_log").insert({
    actor_id: userId,
    action,
    target_kind: targetKind ?? null,
    target_id: targetId ?? null,
    target_label: targetLabel ?? null,
    meta,
  });
};

// ============ REPORTS ============

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      duty_id: z.string().uuid().nullable().optional(),
      vehicle_id: z.string().uuid().nullable().optional(),
      vehicle_label: z.string().max(40).nullable().optional(),
      route: z.string().max(40).nullable().optional(),
      duty_number: z.string().max(40).nullable().optional(),
      category: z.enum(["operational", "complaint", "infrastructure", "vehicle", "schedule", "info"]),
      description: z.string().trim().min(3).max(4000),
      attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("driver_reports")
      .insert({
        driver_id: context.userId,
        duty_id: data.duty_id ?? null,
        vehicle_id: data.vehicle_id ?? null,
        vehicle_label: data.vehicle_label ?? null,
        route: data.route ?? null,
        duty_number: data.duty_number ?? null,
        category: data.category,
        description: data.description,
        attachments: data.attachments ?? [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("driver_reports")
      .select("*")
      .eq("driver_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listAllReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.enum(["new", "in_review", "action_taken", "closed", "all"]).optional(),
      category: z.string().optional(),
      includeArchived: z.boolean().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    let q = context.supabase
      .from("driver_reports")
      .select("*, driver:driver_id(full_name, employee_id)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (!data.includeArchived) q = q.eq("archived", false);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if ((data as any).category) q = q.eq("category", (data as any).category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [rRes, cRes] = await Promise.all([
      context.supabase.from("driver_reports").select("*, driver:driver_id(full_name, employee_id, depot)").eq("id", data.id).maybeSingle(),
      context.supabase.from("report_comments").select("*").eq("report_id", data.id).order("created_at"),
    ]);
    if (rRes.error) throw new Error(rRes.error.message);
    if (cRes.error) throw new Error(cRes.error.message);
    return { report: rRes.data, comments: cRes.data ?? [] };
  });

export const updateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["new", "in_review", "action_taken", "closed"]).optional(),
      assigned_dispatcher_id: z.string().uuid().nullable().optional(),
      archived: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { data: prev } = await context.supabase.from("driver_reports").select("report_code, status").eq("id", id).maybeSingle();
    const { error } = await context.supabase.from("driver_reports").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    if (patch.status && prev?.status !== patch.status) {
      await logAction(context.supabase, context.userId, `Raport ${prev?.report_code}: status → ${patch.status}`, "report", id, prev?.report_code);
    }
    if (patch.archived) {
      await logAction(context.supabase, context.userId, `Zarchiwizowano raport ${prev?.report_code}`, "report", id, prev?.report_code);
    }
    if (patch.assigned_dispatcher_id !== undefined) {
      await logAction(context.supabase, context.userId, `Raport ${prev?.report_code} przypisany`, "report", id, prev?.report_code);
    }
    return { ok: true };
  });

export const addReportComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ report_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("report_comments").insert({
      report_id: data.report_id, author_id: context.userId, body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ INCIDENTS ============

export const submitIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      duty_id: z.string().uuid().nullable().optional(),
      vehicle_id: z.string().uuid().nullable().optional(),
      vehicle_label: z.string().max(40).nullable().optional(),
      route: z.string().max(40).nullable().optional(),
      duty_number: z.string().max(40).nullable().optional(),
      type: z.enum(["collision","breakdown","blockage","major_delay","passenger_emergency","security","infrastructure","other"]),
      priority: z.enum(["critical","high","medium","low"]).optional(),
      location: z.string().max(200).nullable().optional(),
      description: z.string().trim().min(3).max(4000),
      occurred_at: z.string().nullable().optional(),
      attachments: z.array(z.object({ name: z.string(), url: z.string() })).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("incidents").insert({
      reporter_id: context.userId,
      duty_id: data.duty_id ?? null,
      vehicle_id: data.vehicle_id ?? null,
      vehicle_label: data.vehicle_label ?? null,
      route: data.route ?? null,
      duty_number: data.duty_number ?? null,
      type: data.type,
      priority: data.priority ?? "medium",
      location: data.location ?? null,
      description: data.description,
      occurred_at: data.occurred_at ?? new Date().toISOString(),
      attachments: data.attachments ?? [],
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listIncidents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      openOnly: z.boolean().optional(),
      priority: z.enum(["critical","high","medium","low","all"]).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    let q = context.supabase
      .from("incidents")
      .select("*, reporter:reporter_id(full_name, employee_id)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.openOnly) q = q.in("status", ["reported","in_progress"]);
    if (data.priority && data.priority !== "all") q = q.eq("priority", data.priority);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [iRes, nRes] = await Promise.all([
      context.supabase.from("incidents").select("*, reporter:reporter_id(full_name, employee_id, depot)").eq("id", data.id).maybeSingle(),
      context.supabase.from("incident_notes").select("*").eq("incident_id", data.id).order("created_at"),
    ]);
    if (iRes.error) throw new Error(iRes.error.message);
    if (nRes.error) throw new Error(nRes.error.message);
    return { incident: iRes.data, notes: nRes.data ?? [] };
  });

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["reported","in_progress","resolved","closed"]).optional(),
      priority: z.enum(["critical","high","medium","low"]).optional(),
      escalated: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { data: prev } = await context.supabase.from("incidents").select("incident_code, status, priority").eq("id", id).maybeSingle();
    const { error } = await context.supabase.from("incidents").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    if (patch.status) await logAction(context.supabase, context.userId, `Incydent ${prev?.incident_code}: status → ${patch.status}`, "incident", id, prev?.incident_code);
    if (patch.priority) await logAction(context.supabase, context.userId, `Incydent ${prev?.incident_code}: priorytet → ${patch.priority}`, "incident", id, prev?.incident_code);
    if (patch.escalated) await logAction(context.supabase, context.userId, `Eskalowano incydent ${prev?.incident_code}`, "incident", id, prev?.incident_code);
    return { ok: true };
  });

export const addIncidentNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ incident_id: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("incident_notes").insert({
      incident_id: data.incident_id, author_id: context.userId, body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ DISPATCHER LOG ============

export const listLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("dispatcher_log")
      .select("*, actor:actor_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============ MESSAGES ============

const messageInput = z.object({
  kind: z.enum(["announcement","urgent","service_change","diversion"]),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  audience_kind: z.enum(["all_drivers","drivers","routes","vehicles","divisions"]),
  audience: z.array(z.string()).default([]),
});

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => messageInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    // Resolve recipients
    let recipientIds: string[] = [];
    if (data.audience_kind === "all_drivers") {
      const { data: drivers } = await context.supabase.from("profiles").select("id").eq("active", true);
      recipientIds = (drivers ?? []).map((d: any) => d.id);
    } else if (data.audience_kind === "drivers") {
      recipientIds = data.audience;
    } else if (data.audience_kind === "routes") {
      const { data: duties } = await context.supabase.from("duties").select("assigned_to").in("route", data.audience).not("assigned_to","is",null);
      recipientIds = [...new Set((duties ?? []).map((d: any) => d.assigned_to))];
    } else if (data.audience_kind === "vehicles") {
      const { data: duties } = await context.supabase.from("duties").select("assigned_to").in("vehicle_id", data.audience).not("assigned_to","is",null);
      recipientIds = [...new Set((duties ?? []).map((d: any) => d.assigned_to))];
    } else if (data.audience_kind === "divisions") {
      const { data: drivers } = await context.supabase.from("profiles").select("id").in("depot", data.audience);
      recipientIds = (drivers ?? []).map((d: any) => d.id);
    }

    const { data: msg, error } = await context.supabase.from("internal_messages").insert({
      author_id: context.userId,
      kind: data.kind,
      subject: data.subject,
      body: data.body,
      audience_kind: data.audience_kind,
      audience: data.audience,
    }).select().single();
    if (error) throw new Error(error.message);

    if (recipientIds.length > 0) {
      const rows = recipientIds.map((uid) => ({ message_id: msg.id, user_id: uid }));
      const { error: rErr } = await context.supabase.from("message_recipients").insert(rows);
      if (rErr) throw new Error(rErr.message);
    }

    await logAction(context.supabase, context.userId, `Wysłano komunikat: ${data.subject}`, "message", msg.id, data.subject, { kind: data.kind, recipients: recipientIds.length });
    return { ok: true, recipientCount: recipientIds.length };
  });

export const listSentMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("internal_messages")
      .select("*, author:author_id(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("message_recipients")
      .select("id, read_at, message:message_id(id, kind, subject, body, created_at, author:author_id(full_name))")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ PRESENCE ============

export const setMyPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      status: z.enum(["active","break","offline","unavailable"]),
      note: z.string().max(200).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("driver_presence").upsert({
      user_id: context.userId,
      status: data.status,
      note: data.note ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyPresence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("driver_presence").select("*").eq("user_id", context.userId).maybeSingle();
    return data;
  });

// ============ DUTY LIVE STATUS ============

export const setMyDutyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      duty_id: z.string().uuid(),
      live_status: z.enum(["on_route","on_break","delayed","vehicle_failure","emergency","completed"]),
      note: z.string().max(200).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("duties").update({
      live_status: data.live_status,
      live_status_updated_at: new Date().toISOString(),
      live_status_note: data.note ?? null,
    }).eq("id", data.duty_id).eq("assigned_to", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ DISPATCHER DASHBOARD ============

export const getDispatcherDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);

    const [dutiesRes, vehiclesRes, presenceRes, incidentsRes, reportsRes, unassignedRes, logRes] = await Promise.all([
      context.supabase.from("duties").select("id, duty_number, route, start_time, end_time, vehicle_label, assigned_to, vehicle_id, live_status, duty_date").eq("duty_date", today),
      context.supabase.from("vehicles").select("id, vehicle_number, status, active"),
      context.supabase.from("driver_presence").select("user_id, status"),
      context.supabase.from("incidents").select("id, incident_code, type, priority, status, created_at, vehicle_label, route").in("status", ["reported","in_progress"]).order("created_at", { ascending: false }).limit(50),
      context.supabase.from("driver_reports").select("id, report_code, category, status, created_at, driver_id").eq("archived", false).in("status", ["new","in_review"]).order("created_at", { ascending: false }).limit(50),
      context.supabase.from("duties").select("id").is("assigned_to", null).gte("duty_date", today),
      context.supabase.from("dispatcher_log").select("id, action, target_label, created_at, actor:actor_id(full_name)").order("created_at", { ascending: false }).limit(10),
    ]);

    const presenceMap = new Map<string, string>();
    for (const p of presenceRes.data ?? []) presenceMap.set(p.user_id as string, p.status as string);

    const activeDuties = (dutiesRes.data ?? []).filter((d: any) => d.live_status && d.live_status !== "completed");
    const onBreak = (dutiesRes.data ?? []).filter((d: any) => d.live_status === "on_break").length;
    const activeDrivers = [...new Set((dutiesRes.data ?? []).filter((d: any) => d.assigned_to && d.live_status === "on_route").map((d: any) => d.assigned_to))].length;
    const activeVehicles = (vehiclesRes.data ?? []).filter((v: any) => v.status === "in_service" || v.status === "assigned").length;
    const vehicleFailures = (incidentsRes.data ?? []).filter((i: any) => i.type === "breakdown").length;

    return {
      stats: {
        activeDuties: activeDuties.length,
        activeDrivers,
        activeVehicles,
        openIncidents: (incidentsRes.data ?? []).length,
        openReports: (reportsRes.data ?? []).length,
        vehicleFailures,
        unassignedDuties: (unassignedRes.data ?? []).length,
        onBreak,
      },
      incidents: incidentsRes.data ?? [],
      reports: reportsRes.data ?? [],
      recentLog: logRes.data ?? [],
    };
  });

// ============ ACTIVE DUTY MONITOR ============

export const getActiveDuties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("duties")
      .select("*, driver:assigned_to(full_name, employee_id), vehicle:vehicle_id(vehicle_number, status)")
      .eq("duty_date", today)
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ VEHICLE OPS ============

export const getVehicleOps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);
    const [vRes, dRes, repRes, incRes, maintRes] = await Promise.all([
      context.supabase.from("vehicles").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("duties").select("*, driver:assigned_to(full_name)").eq("vehicle_id", data.id).eq("duty_date", today).order("start_time"),
      context.supabase.from("driver_reports").select("id, report_code, category, status, created_at").eq("vehicle_id", data.id).eq("archived", false).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("incidents").select("id, incident_code, type, priority, status, created_at").eq("vehicle_id", data.id).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("vehicle_maintenance").select("*").eq("vehicle_id", data.id).order("performed_at", { ascending: false }).limit(50),
    ]);
    if (vRes.error) throw new Error(vRes.error.message);
    return {
      vehicle: vRes.data,
      currentDuties: dRes.data ?? [],
      reports: repRes.data ?? [],
      incidents: incRes.data ?? [],
      maintenance: maintRes.data ?? [],
    };
  });

export const setVehicleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["available","in_service","assigned","reserve","out_of_service","under_repair"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: prev } = await context.supabase.from("vehicles").select("vehicle_number").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("vehicles").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAction(context.supabase, context.userId, `Pojazd ${prev?.vehicle_number}: status → ${data.status}`, "vehicle", data.id, prev?.vehicle_number);
    return { ok: true };
  });

export const addMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      vehicle_id: z.string().uuid(),
      kind: z.string().trim().min(1).max(80),
      description: z.string().max(500).nullable().optional(),
      performed_at: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase.from("vehicle_maintenance").insert({
      vehicle_id: data.vehicle_id,
      kind: data.kind,
      description: data.description ?? null,
      performed_at: data.performed_at ?? new Date().toISOString().slice(0, 10),
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignReplacementVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ duty_id: z.string().uuid(), vehicle_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: veh } = await context.supabase.from("vehicles").select("vehicle_number").eq("id", data.vehicle_id).maybeSingle();
    const { data: duty } = await context.supabase.from("duties").select("duty_number").eq("id", data.duty_id).maybeSingle();
    const { error } = await context.supabase.from("duties").update({
      vehicle_id: data.vehicle_id,
      vehicle_label: veh?.vehicle_number ?? null,
    }).eq("id", data.duty_id);
    if (error) throw new Error(error.message);
    await logAction(context.supabase, context.userId, `Pojazd zastępczy ${veh?.vehicle_number} przydzielony do służby ${duty?.duty_number}`, "duty", data.duty_id, duty?.duty_number);
    return { ok: true };
  });

// ============ DRIVER OPS ============

export const getDriverOps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const today = new Date();
    const weekDay = today.getDay() || 7; // Monday=1
    const monday = new Date(today);
    monday.setDate(today.getDate() - (weekDay - 1));
    const mondayIso = monday.toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);

    const [profilesRes, rolesRes, dutiesRes, weekDutiesRes, presenceRes] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, employee_id, depot, active").eq("active", true).order("full_name"),
      context.supabase.from("user_roles").select("user_id, role").eq("role", "driver"),
      context.supabase.from("duties").select("id, assigned_to, duty_number, route, start_time, end_time, vehicle_label, live_status, duty_date").eq("duty_date", todayIso),
      context.supabase.from("duties").select("assigned_to, start_time, end_time, live_status").gte("duty_date", mondayIso).lte("duty_date", todayIso),
      context.supabase.from("driver_presence").select("*"),
    ]);

    const driverIds = new Set((rolesRes.data ?? []).map((r: any) => r.user_id));
    const drivers = (profilesRes.data ?? []).filter((p: any) => driverIds.has(p.id));

    const todayByDriver = new Map<string, any>();
    for (const d of dutiesRes.data ?? []) {
      if (d.assigned_to) todayByDriver.set(d.assigned_to as string, d);
    }

    const minutesBetween = (s: string, e: string) => {
      const [sh, sm] = s.split(":").map(Number);
      const [eh, em] = e.split(":").map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      return diff;
    };
    const weekMinByDriver = new Map<string, number>();
    for (const d of weekDutiesRes.data ?? []) {
      if (!d.assigned_to || d.live_status !== "completed") continue;
      weekMinByDriver.set(d.assigned_to as string, (weekMinByDriver.get(d.assigned_to as string) ?? 0) + minutesBetween(d.start_time as string, d.end_time as string));
    }

    const presenceMap = new Map<string, any>();
    for (const p of presenceRes.data ?? []) presenceMap.set(p.user_id as string, p);

    return drivers.map((d: any) => ({
      ...d,
      current_duty: todayByDriver.get(d.id) ?? null,
      week_minutes: weekMinByDriver.get(d.id) ?? 0,
      presence: presenceMap.get(d.id) ?? { status: "offline" },
    }));
  });

export const listAllDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: roles } = await context.supabase.from("user_roles").select("user_id, role").eq("role", "driver");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    if (ids.length === 0) return [];
    const { data } = await context.supabase.from("profiles").select("id, full_name, employee_id, depot").in("id", ids).eq("active", true).order("full_name");
    return data ?? [];
  });

export const listChatContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, employee_id, roblox_username")
      .neq("id", context.userId)
      .eq("active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });


export const listChatConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [sentRes, receivedRes] = await Promise.all([
      supabaseAdmin
        .from("internal_messages")
        .select("id, author_id, body, created_at, recipients:message_recipients!inner(user_id, read_at)")
        .eq("kind", "driver_message")
        .eq("audience_kind", "drivers")
        .eq("author_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("internal_messages")
        .select("id, author_id, body, created_at, recipients:message_recipients!inner(user_id, read_at)")
        .eq("kind", "driver_message")
        .eq("audience_kind", "drivers")
        .eq("recipients.user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (sentRes.error) throw new Error(sentRes.error.message);
    if (receivedRes.error) throw new Error(receivedRes.error.message);

    const conversations = new Map<string, { peer_id: string; last_message: string; created_at: string; unread_count: number }>();

    for (const message of (sentRes.data ?? []) as any[]) {
      const peerId = message.recipients?.[0]?.user_id as string | undefined;
      if (!peerId) continue;
      const existing = conversations.get(peerId);
      if (!existing || new Date(message.created_at).getTime() > new Date(existing.created_at).getTime()) {
        conversations.set(peerId, {
          peer_id: peerId,
          last_message: message.body,
          created_at: message.created_at,
          unread_count: existing?.unread_count ?? 0,
        });
      }
    }

    for (const message of (receivedRes.data ?? []) as any[]) {
      const peerId = message.author_id as string;
      const unread = message.recipients?.some((recipient: any) => recipient.user_id === context.userId && !recipient.read_at) ? 1 : 0;
      const existing = conversations.get(peerId);
      if (!existing || new Date(message.created_at).getTime() > new Date(existing.created_at).getTime()) {
        conversations.set(peerId, {
          peer_id: peerId,
          last_message: message.body,
          created_at: message.created_at,
          unread_count: (existing?.unread_count ?? 0) + unread,
        });
      } else if (unread) {
        existing.unread_count += unread;
      }
    }

    return [...conversations.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  });

export const listChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ peerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [sentRes, receivedRes] = await Promise.all([
      supabaseAdmin
        .from("internal_messages")
        .select("id, author_id, body, created_at, recipients:message_recipients!inner(user_id)")
        .eq("kind", "driver_message")
        .eq("audience_kind", "drivers")
        .eq("author_id", context.userId)
        .eq("recipients.user_id", data.peerId)
        .order("created_at", { ascending: true })
        .limit(100),
      supabaseAdmin
        .from("internal_messages")
        .select("id, author_id, body, created_at, recipients:message_recipients!inner(user_id, read_at)")
        .eq("kind", "driver_message")
        .eq("audience_kind", "drivers")
        .eq("author_id", data.peerId)
        .eq("recipients.user_id", context.userId)
        .order("created_at", { ascending: true })
        .limit(100),
    ]);

    if (sentRes.error) throw new Error(sentRes.error.message);
    if (receivedRes.error) throw new Error(receivedRes.error.message);

    return [...((sentRes.data ?? []) as any[]), ...((receivedRes.data ?? []) as any[])]
      .map((message) => ({
        id: message.id,
        author_id: message.author_id,
        body: message.body,
        created_at: message.created_at,
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });

export const markChatThreadRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ peerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("internal_messages")
      .select("id, recipients:message_recipients!inner(user_id, read_at)")
      .eq("kind", "driver_message")
      .eq("audience_kind", "drivers")
      .eq("author_id", data.peerId)
      .eq("recipients.user_id", context.userId)
      .is("recipients.read_at", null)
      .limit(100);

    if (error) throw new Error(error.message);

    const unreadIds = (rows ?? []).map((row: any) => row.id);
    if (unreadIds.length === 0) return { ok: true, count: 0 };

    const { error: updateError } = await supabaseAdmin
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .in("message_id", unreadIds)
      .is("read_at", null);

    if (updateError) throw new Error(updateError.message);
    return { ok: true, count: unreadIds.length };
  });

export const sendDirectMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ recipient_id: z.string().uuid(), body: z.string().trim().min(1).max(5000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.recipient_id === context.userId) throw new Error("Nie możesz wysłać wiadomości do siebie");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: recipient, error: recipientError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", data.recipient_id)
      .maybeSingle();

    if (recipientError) throw new Error(recipientError.message);
    if (!recipient) throw new Error("Wybrany użytkownik nie istnieje");

    const messageId = crypto.randomUUID();
    const subject = data.body.replace(/\s+/g, " ").trim().slice(0, 80) || "Wiadomość";

    const { error } = await supabaseAdmin.from("internal_messages").insert({
      id: messageId,
      author_id: context.userId,
      kind: "driver_message" as any,
      subject,
      body: data.body,
      audience_kind: "drivers" as any,
      audience: [data.recipient_id],
    });
    if (error) throw new Error(error.message);

    const { error: recipientInsertError } = await supabaseAdmin.from("message_recipients").insert({
      message_id: messageId,
      user_id: data.recipient_id,
    });
    if (recipientInsertError) throw new Error(recipientInsertError.message);

    return { ok: true, id: messageId };
  });

// ============ DRIVER → DISPATCH MESSAGES ============

export const sendDriverMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subject: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(5000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const messageId = crypto.randomUUID();

    // Resolve all dispatcher + admin recipient ids
    const { data: roles, error: rErr } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "dyspozytor"]);
    if (rErr) throw new Error(rErr.message);
    const recipientIds = [...new Set((roles ?? []).map((r: any) => r.user_id as string))];

    const { error } = await context.supabase
      .from("internal_messages")
      .insert({
        id: messageId,
        author_id: context.userId,
        kind: "driver_message" as any,
        subject: data.subject,
        body: data.body,
        audience_kind: "dispatchers" as any,
        audience: [],
      });
    if (error) throw new Error(error.message);

    if (recipientIds.length > 0) {
      const rows = recipientIds.map((uid) => ({ message_id: messageId, user_id: uid }));
      const { error: iErr } = await context.supabase.from("message_recipients").insert(rows);
      if (iErr) throw new Error(iErr.message);
    }
    return { ok: true, recipientCount: recipientIds.length };
  });

export const listMyOutbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("internal_messages")
      .select("id, kind, subject, body, audience_kind, created_at")
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
