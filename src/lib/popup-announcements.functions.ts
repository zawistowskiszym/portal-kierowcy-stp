import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireStaff = async (supabase: any, userId: string) => {
  const [a, d] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("has_role", { _user_id: userId, _role: "dyspozytor" }),
  ]);
  if (!a.data && !d.data) throw new Error("Brak uprawnień");
};

export const listActivePopupAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [annRes, readRes] = await Promise.all([
      context.supabase
        .from("popup_announcements")
        .select("id, title, body, severity, author_id, created_at")
        .eq("archived", false)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("popup_announcement_reads")
        .select("announcement_id")
        .eq("user_id", context.userId),
    ]);
    if (annRes.error) throw new Error(annRes.error.message);
    const readSet = new Set((readRes.data ?? []).map((r: any) => r.announcement_id));
    return (annRes.data ?? []).filter((a: any) => !readSet.has(a.id));
  });

export const listAllPopupAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("popup_announcements")
      .select("id, title, body, severity, author_id, archived, archived_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPopupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      title: z.string().trim().min(1).max(200),
      body: z.string().trim().min(1).max(4000),
      severity: z.enum(["info", "warning", "critical"]).default("info"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("popup_announcements")
      .insert({
        title: data.title,
        body: data.body,
        severity: data.severity,
        author_id: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const archivePopupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("popup_announcements")
      .update({ archived: true, archived_at: new Date().toISOString(), archived_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unarchivePopupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireStaff(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("popup_announcements")
      .update({ archived: false, archived_at: null, archived_by: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const dismissPopupAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("popup_announcement_reads")
      .upsert({ announcement_id: data.id, user_id: context.userId }, { onConflict: "announcement_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
