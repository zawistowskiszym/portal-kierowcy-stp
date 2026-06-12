import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "dyspozytor" | "driver";

export interface AuthProfile {
  id: string;
  full_name: string;
  employee_id: string | null;
  depot: string | null;
  active: boolean;
  avatar_url?: string | null;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  isAdmin: boolean;
  isDispatcher: boolean;
  isStaff: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadExtras = async (uid: string) => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, employee_id, depot, active").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      if (cancelled) return;
      setProfile((profileRes.data as AuthProfile | null) ?? null);
      setRoles(((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Defer to avoid deadlock
        setTimeout(() => loadExtras(newSession.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadExtras(data.session.user.id).finally(() => !cancelled && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    roles,
    isAdmin: roles.includes("admin"),
    isDispatcher: roles.includes("dyspozytor"),
    isStaff: roles.includes("admin") || roles.includes("dyspozytor"),
  };
}
