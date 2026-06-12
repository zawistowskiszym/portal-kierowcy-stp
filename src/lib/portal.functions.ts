import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEAVE_TYPE_VALUES } from "@/lib/leave-types";


// Staff = admin OR dyspozytor. Used for operational tasks (duties, vehicles, vacations decisions, announcements, planning board).
const requireAdmin = async (supabase: any, userId: string) => {
  const [a, d] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "dyspozytor" }),
  ]);
  if (a.error && d.error) throw new Error("Brak uprawnień");
  if (!a.data && !d.data) throw new Error("Brak uprawnień operacyjnych");
};

// Super admin = admin only. For user management & global reports.
const requireSuperAdmin = async (supabase: any, userId: string) => {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Brak uprawnień administratora");
};

// ============ DUTIES ============

export const getMyNextDuty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("duties")
      .select("*")
      .eq("assigned_to", userId)
      .gte("duty_date", todayIso)
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const getMyUpcomingDuties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const todayIso = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("duties")
      .select("*")
      .eq("assigned_to", userId)
      .gte("duty_date", todayIso)
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyDutiesInRange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("duties")
      .select("*")
      .eq("assigned_to", userId)
      .gte("duty_date", data.from)
      .lte("duty_date", data.to)
      .order("duty_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listAllDuties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("duties")
      .select("*, profiles:assigned_to(full_name, employee_id)")
      .order("duty_date", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const dutyInput = z.object({
  duty_number: z.string().min(1),
  duty_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  depot: z.string().min(1),
  route: z.string().min(1),
  vehicle_label: z.string().optional().nullable(),
  vehicle_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  division: z.string().optional().nullable(),
});

export const createDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => dutyInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("duties")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(dutyInput.partial()).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("duties").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("duties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ ANNOUNCEMENTS ============

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const announcementInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  category: z.enum(["operations", "service_changes", "events", "training", "general"]),
});

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => announcementInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert({ ...data, author_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid() }).merge(announcementInput.partial()).merge(z.object({ archived: z.boolean().optional() })).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("announcements").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ USERS / ADMIN ============

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const [profilesRes, rolesRes, vacRes] = await Promise.all([
      context.supabase.from("profiles").select("*").order("full_name", { ascending: true }),
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase
        .from("vacation_requests")
        .select("user_id, leave_type, start_date, end_date, status")
        .gte("start_date", yearStart),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (vacRes.error) throw new Error(vacRes.error.message);

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }

    // Aggregate approved leave days per user per category for the current year
    const leavesByUser = new Map<string, Record<string, number>>();
    for (const v of (vacRes.data ?? []) as any[]) {
      if (v.status !== "approved") continue;
      const s = new Date(v.start_date);
      const e = new Date(v.end_date);
      const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
      const map = leavesByUser.get(v.user_id) ?? {};
      map[v.leave_type] = (map[v.leave_type] ?? 0) + days;
      leavesByUser.set(v.user_id, map);
    }

    return (profilesRes.data ?? []).map((p) => ({
      ...p,
      roles: rolesByUser.get(p.id) ?? [],
      leave_summary: leavesByUser.get(p.id) ?? {},
    }));
  });


const inviteUserInput = z.object({
  email: z.string().email().max(254),
  role: z.enum(["admin", "driver"]),
  redirectTo: z.string().url(),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteUserInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invited, error: inviteErr } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        redirectTo: data.redirectTo,
      });
    if (inviteErr || !invited?.user) {
      throw new Error(inviteErr?.message ?? "Nie udało się wysłać zaproszenia");
    }

    const uid = invited.user.id;

    // Pre-create an inactive profile so the user shows up as "pending" in the admin list.
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: uid, full_name: data.email, active: false },
        { onConflict: "id" },
      );
    if (profileErr) throw new Error(profileErr.message);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    return { id: uid };
  });

const completeInvitationInput = z.object({
  full_name: z.string().trim().min(1).max(120),
  employee_id: z.string().trim().max(40).optional().nullable(),
  depot: z.string().trim().max(80).optional().nullable(),
});

export const completeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => completeInvitationInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: context.userId,
          full_name: data.full_name,
          employee_id: data.employee_id ?? null,
          depot: data.depot ?? null,
          active: true,
        },
        { onConflict: "id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      full_name: z.string().min(1).optional(),
      employee_id: z.string().nullable().optional(),
      depot: z.string().nullable().optional(),
      active: z.boolean().optional(),
      role: z.enum(["admin", "driver"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, role, ...patch } = data;
    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    }
    if (role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: id, role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.id === context.userId) throw new Error("Nie można usunąć własnego konta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDrivers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, employee_id, depot")
      .eq("active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ BOOTSTRAP ============

export const bootstrapStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_any_admin");
  if (error) throw new Error(error.message);
  return { hasAdmin: !!data };
});

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().max(254),
      password: z.string().min(8).max(72),
      full_name: z.string().min(1).max(120),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hasAdmin, error: checkErr } = await supabaseAdmin.rpc("has_any_admin");
    if (checkErr) throw new Error(checkErr.message);
    if (hasAdmin) throw new Error("Administrator został już utworzony");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created?.user) throw new Error(createErr?.message ?? "Błąd tworzenia konta");

    const uid = created.user.id;
    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: uid,
      full_name: data.full_name,
      active: true,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      throw new Error(pErr.message);
    }
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "admin" });
    if (rErr) throw new Error(rErr.message);

    return { ok: true };
  });

// ============ VEHICLES ============

export const listVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vehicles")
      .select("*")
      .order("vehicle_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const vehicleSchema = z.object({
  vehicle_number: z.string().trim().min(1).max(20),
  model: z.string().trim().min(1).max(120),
  fuel: z.enum(["Diesel", "Elektryczny", "Hybrydowy", "Wodorowy"]),
  depot: z.string().trim().min(1).max(80),
  production_year: z.number().int().min(1980).max(2100).nullable().optional(),
  capacity: z.number().int().min(0).max(500).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const createVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vehicleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("vehicles").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).merge(vehicleSchema.partial()).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("vehicles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("vehicles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ AVAILABILITY ============

export const listMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("driver_availability")
      .select("*")
      .eq("user_id", context.userId)
      .gte("day", data.from)
      .lte("day", data.to)
      .order("day", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        day: z.string().min(10).max(10),
        type: z.enum(["unavailable", "preferred"]).nullable(),
        note: z.string().max(200).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.type === null) {
      const { error } = await context.supabase
        .from("driver_availability")
        .delete()
        .eq("user_id", context.userId)
        .eq("day", data.day);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await context.supabase
      .from("driver_availability")
      .upsert(
        { user_id: context.userId, day: data.day, type: data.type, note: data.note ?? null },
        { onConflict: "user_id,day" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ VACATION REQUESTS ============

export const listMyVacationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vacation_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createVacationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        start_date: z.string().min(10).max(10),
        end_date: z.string().min(10).max(10),
        leave_type: z.enum(LEAVE_TYPE_VALUES),
        reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.end_date < data.start_date) throw new Error("Data końca musi być po dacie początku");
    const { error } = await context.supabase.from("vacation_requests").insert({
      user_id: context.userId,
      start_date: data.start_date,
      end_date: data.end_date,
      leave_type: data.leave_type,
      reason: data.reason ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const cancelVacationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vacation_requests")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllVacationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("vacation_requests")
      .select("*, profiles:user_id(full_name, employee_id, depot)")
      .order("status", { ascending: true })
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const decideVacationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected"]),
        admin_note: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("vacation_requests")
      .update({
        status: data.status,
        admin_note: data.admin_note ?? null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ STATS / REPORTS ============

const minutesBetween = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = eh * 60 + em - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60; // overnight
  return diff;
};

export const getMyStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    const { data, error } = await context.supabase
      .from("duties")
      .select("duty_date, start_time, end_time")
      .eq("assigned_to", context.userId)
      .gte("duty_date", yearStart)
      .lte("duty_date", todayIso);
    if (error) throw new Error(error.message);

    let monthCount = 0, monthMin = 0, yearCount = 0, yearMin = 0;
    for (const row of data ?? []) {
      const mins = minutesBetween(row.start_time as string, row.end_time as string);
      yearCount++;
      yearMin += mins;
      if ((row.duty_date as string) >= monthStart) {
        monthCount++;
        monthMin += mins;
      }
    }
    return {
      month: { count: monthCount, minutes: monthMin },
      year: { count: yearCount, minutes: yearMin },
    };
  });

export const getAdminReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    const [dutiesRes, profilesRes, vacRes, vehRes] = await Promise.all([
      context.supabase
        .from("duties")
        .select("duty_date, start_time, end_time, assigned_to, depot")
        .gte("duty_date", monthStart)
        .lte("duty_date", monthEnd),
      context.supabase.from("profiles").select("id, full_name, active"),
      context.supabase
        .from("vacation_requests")
        .select("id, status, start_date, end_date")
        .gte("end_date", todayIso),
      context.supabase.from("vehicles").select("id, active, depot"),
    ]);
    if (dutiesRes.error) throw new Error(dutiesRes.error.message);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (vacRes.error) throw new Error(vacRes.error.message);
    if (vehRes.error) throw new Error(vehRes.error.message);

    const profilesById = new Map(
      (profilesRes.data ?? []).map((p: any) => [p.id, p.full_name as string]),
    );

    const byDriver = new Map<string, { name: string; count: number; minutes: number }>();
    const byDepot = new Map<string, number>();
    let unassigned = 0;

    for (const d of dutiesRes.data ?? []) {
      const mins = minutesBetween(d.start_time as string, d.end_time as string);
      const depot = (d.depot as string) ?? "—";
      byDepot.set(depot, (byDepot.get(depot) ?? 0) + 1);
      if (!d.assigned_to) {
        unassigned++;
        continue;
      }
      const uid = d.assigned_to as string;
      const cur = byDriver.get(uid) ?? {
        name: profilesById.get(uid) ?? "Nieznany",
        count: 0,
        minutes: 0,
      };
      cur.count++;
      cur.minutes += mins;
      byDriver.set(uid, cur);
    }

    return {
      duties: {
        total: (dutiesRes.data ?? []).length,
        unassigned,
        byDepot: Array.from(byDepot, ([depot, count]) => ({ depot, count })),
        topDrivers: Array.from(byDriver.values())
          .sort((a, b) => b.minutes - a.minutes)
          .slice(0, 10),
      },
      drivers: {
        total: (profilesRes.data ?? []).length,
        active: (profilesRes.data ?? []).filter((p: any) => p.active).length,
      },
      vacations: {
        pending: (vacRes.data ?? []).filter((v: any) => v.status === "pending").length,
        upcoming: (vacRes.data ?? []).filter((v: any) => v.status === "approved").length,
      },
      vehicles: {
        total: (vehRes.data ?? []).length,
        active: (vehRes.data ?? []).filter((v: any) => v.active).length,
      },
    };
  });

// ============ PLANNING BOARD ============

const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const toM = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  let aS = toM(aStart), aE = toM(aEnd); if (aE <= aS) aE += 24 * 60;
  let bS = toM(bStart), bE = toM(bEnd); if (bE <= bS) bE += 24 * 60;
  return aS < bE && bS < aE;
};

export const getPlanningBoard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from: string; to: string }) =>
    z.object({ from: z.string(), to: z.string() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [dutiesRes, driversRes, vehiclesRes, monthDutiesRes, availRes, vacRes] = await Promise.all([
      context.supabase.from("duties")
        .select("*, profiles:assigned_to(full_name, employee_id, depot), vehicles:vehicle_id(vehicle_number, model, status)")
        .gte("duty_date", data.from).lte("duty_date", data.to)
        .order("duty_date").order("start_time"),
      context.supabase.from("profiles").select("id, full_name, employee_id, depot, active").eq("active", true).order("full_name"),
      context.supabase.from("vehicles").select("*").order("vehicle_number"),
      context.supabase.from("duties").select("assigned_to, start_time, end_time").gte("duty_date", monthStart).lte("duty_date", monthEnd),
      context.supabase.from("driver_availability").select("*").gte("day", data.from).lte("day", data.to),
      context.supabase.from("vacation_requests").select("user_id, start_date, end_date").eq("status", "approved").lte("start_date", data.to).gte("end_date", data.from),
    ]);
    for (const r of [dutiesRes, driversRes, vehiclesRes, monthDutiesRes, availRes, vacRes]) {
      if (r.error) throw new Error(r.error.message);
    }

    const hoursByDriver = new Map<string, number>();
    for (const d of monthDutiesRes.data ?? []) {
      if (!d.assigned_to) continue;
      const mins = minutesBetween(d.start_time as string, d.end_time as string);
      hoursByDriver.set(d.assigned_to as string, (hoursByDriver.get(d.assigned_to as string) ?? 0) + mins);
    }

    const unavailableByUser = new Map<string, Set<string>>();
    for (const a of availRes.data ?? []) {
      if ((a as any).type !== "unavailable") continue;
      const set = unavailableByUser.get(a.user_id as string) ?? new Set();
      set.add(a.day as string);
      unavailableByUser.set(a.user_id as string, set);
    }
    for (const v of vacRes.data ?? []) {
      const set = unavailableByUser.get(v.user_id as string) ?? new Set();
      const s = new Date(v.start_date as string), e = new Date(v.end_date as string);
      for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) set.add(dt.toISOString().slice(0, 10));
      unavailableByUser.set(v.user_id as string, set);
    }

    const drivers = (driversRes.data ?? []).map((d: any) => {
      const minutes = hoursByDriver.get(d.id) ?? 0;
      const unavailableDays = Array.from(unavailableByUser.get(d.id) ?? []);
      let availability: "available" | "limited" | "unavailable" = "available";
      if (unavailableDays.length >= 5) availability = "unavailable";
      else if (unavailableDays.length > 0 || minutes > 9000) availability = "limited";
      return { ...d, month_minutes: minutes, unavailable_days: unavailableDays, availability };
    });

    return {
      duties: dutiesRes.data ?? [],
      drivers,
      vehicles: vehiclesRes.data ?? [],
    };
  });

const detectConflicts = async (supabase: any, duty: any, driverId: string | null, vehicleId: string | null, excludeId?: string) => {
  const warnings: { kind: string; msg: string }[] = [];
  if (driverId) {
    const { data: dDuties } = await supabase.from("duties")
      .select("id, duty_number, start_time, end_time")
      .eq("assigned_to", driverId).eq("duty_date", duty.duty_date);
    for (const d of dDuties ?? []) {
      if (d.id === excludeId) continue;
      if (timesOverlap(duty.start_time, duty.end_time, d.start_time, d.end_time)) {
        warnings.push({ kind: "driver_overlap", msg: `Kierowca ma już służbę ${d.duty_number} w tym czasie` });
      }
    }
    const { data: vac } = await supabase.from("vacation_requests")
      .select("id, leave_type").eq("user_id", driverId).eq("status", "approved")
      .lte("start_date", duty.duty_date).gte("end_date", duty.duty_date);
    if ((vac ?? []).length) warnings.push({ kind: "driver_on_leave", msg: "Kierowca jest na urlopie w tym dniu" });
    const { data: avail } = await supabase.from("driver_availability")
      .select("type").eq("user_id", driverId).eq("day", duty.duty_date).maybeSingle();
    if (avail?.type === "unavailable") warnings.push({ kind: "driver_unavailable", msg: "Kierowca oznaczył ten dzień jako niedostępny" });
  }
  if (vehicleId) {
    const { data: vDuties } = await supabase.from("duties")
      .select("id, duty_number, start_time, end_time")
      .eq("vehicle_id", vehicleId).eq("duty_date", duty.duty_date);
    for (const d of vDuties ?? []) {
      if (d.id === excludeId) continue;
      if (timesOverlap(duty.start_time, duty.end_time, d.start_time, d.end_time)) {
        warnings.push({ kind: "vehicle_overlap", msg: `Pojazd używany w służbie ${d.duty_number}` });
      }
    }
    const { data: veh } = await supabase.from("vehicles").select("status").eq("id", vehicleId).maybeSingle();
    if (veh?.status === "out_of_service") warnings.push({ kind: "vehicle_oos", msg: "Pojazd wycofany z eksploatacji" });
  }
  return warnings;
};

export const assignDriverToDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ dutyId: z.string().uuid(), driverId: z.string().uuid().nullable(), force: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: duty, error: dErr } = await context.supabase.from("duties").select("*").eq("id", data.dutyId).single();
    if (dErr || !duty) throw new Error(dErr?.message ?? "Brak służby");
    const warnings = data.driverId ? await detectConflicts(context.supabase, duty, data.driverId, null, data.dutyId) : [];
    const blocking = warnings.filter(w => w.kind !== "driver_unavailable");
    if (blocking.length && !data.force) return { ok: false, warnings };
    const { error } = await context.supabase.from("duties").update({ assigned_to: data.driverId }).eq("id", data.dutyId);
    if (error) throw new Error(error.message);
    return { ok: true, warnings };
  });

export const assignVehicleToDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ dutyId: z.string().uuid(), vehicleId: z.string().uuid().nullable(), force: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { data: duty, error: dErr } = await context.supabase.from("duties").select("*").eq("id", data.dutyId).single();
    if (dErr || !duty) throw new Error(dErr?.message ?? "Brak służby");
    const warnings = data.vehicleId ? await detectConflicts(context.supabase, duty, null, data.vehicleId, data.dutyId) : [];
    if (warnings.length && !data.force) return { ok: false, warnings };
    let label: string | null = null;
    if (data.vehicleId) {
      const { data: v } = await context.supabase.from("vehicles").select("vehicle_number").eq("id", data.vehicleId).maybeSingle();
      label = v?.vehicle_number ?? null;
    }
    const { error } = await context.supabase.from("duties")
      .update({ vehicle_id: data.vehicleId, vehicle_label: label }).eq("id", data.dutyId);
    if (error) throw new Error(error.message);
    return { ok: true, warnings };
  });

export const bulkGenerateDuties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      duty_date: z.string().min(10),
      division: z.string().min(1),
      depot: z.string().min(1),
      route: z.string().min(1),
      start_time: z.string().min(1),
      end_time: z.string().min(1),
      count: z.number().int().min(1).max(50),
      priority: z.enum(["low", "normal", "high"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const rows = Array.from({ length: data.count }, (_, i) => ({
      duty_number: `${data.route}/${i + 1}`,
      duty_date: data.duty_date,
      start_time: data.start_time,
      end_time: data.end_time,
      depot: data.depot,
      route: data.route,
      division: data.division,
      priority: data.priority ?? "normal",
      created_by: context.userId,
    }));
    const { error, data: inserted } = await context.supabase.from("duties").insert(rows).select("id");
    if (error) throw new Error(error.message);
    return { ok: true, count: inserted?.length ?? 0 };
  });

export const listUnassignedDuties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ from: z.string().optional(), to: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const today = new Date().toISOString().slice(0, 10);
    let q = context.supabase.from("duties")
      .select("*, vehicles:vehicle_id(vehicle_number)")
      .is("assigned_to", null)
      .gte("duty_date", data.from ?? today)
      .order("priority", { ascending: false })
      .order("duty_date").order("start_time").limit(500);
    if (data.to) q = q.lte("duty_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAdminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const today = data.date ?? new Date().toISOString().slice(0, 10);
    const [duties, drivers, vehicles] = await Promise.all([
      context.supabase.from("duties").select("id, assigned_to, vehicle_id, status, start_time, end_time").eq("duty_date", today),
      context.supabase.from("profiles").select("id, active"),
      context.supabase.from("vehicles").select("id, status, active"),
    ]);
    for (const r of [duties, drivers, vehicles]) if (r.error) throw new Error(r.error.message);
    const total = (duties.data ?? []).length;
    const assigned = (duties.data ?? []).filter((d: any) => d.assigned_to && d.vehicle_id).length;
    const pending = (duties.data ?? []).filter((d: any) => d.status === "pending").length;
    const unassigned = (duties.data ?? []).filter((d: any) => !d.assigned_to).length;
    const activeDrivers = (drivers.data ?? []).filter((d: any) => d.active).length;
    const busyDrivers = new Set((duties.data ?? []).filter((d: any) => d.assigned_to).map((d: any) => d.assigned_to)).size;
    const activeVehicles = (vehicles.data ?? []).filter((v: any) => v.active).length;
    const busyVehicles = new Set((duties.data ?? []).filter((d: any) => d.vehicle_id).map((d: any) => d.vehicle_id)).size;
    return {
      duties: { total, assigned, pending, unassigned },
      drivers: { active: activeDrivers, available: Math.max(0, activeDrivers - busyDrivers), utilization: activeDrivers ? Math.round((busyDrivers / activeDrivers) * 100) : 0 },
      vehicles: { active: activeVehicles, busy: busyVehicles, utilization: activeVehicles ? Math.round((busyVehicles / activeVehicles) * 100) : 0 },
    };
  });

// ============ NOTIFICATIONS ============

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications").select("*")
      .order("created_at", { ascending: false }).limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    let q = context.supabase.from("notifications").update({ read_at: now }).eq("user_id", context.userId).is("read_at", null);
    if (!data.all && data.id) q = q.eq("id", data.id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
