import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LEAVE_TYPE_VALUES } from "@/lib/leave-types";


const requireAdmin = async (supabase: any, userId: string) => {
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
  notes: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
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
