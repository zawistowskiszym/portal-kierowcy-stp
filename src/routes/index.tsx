import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    // If Supabase redirected here with an invite/recovery token in the hash,
    // forward to the activation page preserving the hash so supabase-js can
    // consume the token there.
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      if (hash.includes("type=invite") || hash.includes("type=signup")) {
        window.location.replace("/zaproszenie" + hash);
        return;
      }
      if (hash.includes("type=recovery")) {
        window.location.replace("/reset-hasla" + hash);
        return;
      }
    }
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/pulpit" });
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
