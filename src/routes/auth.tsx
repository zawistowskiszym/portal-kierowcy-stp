import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapStatus, bootstrapFirstAdmin } from "@/lib/portal.functions";
import stpLogo from "@/assets/stp-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Logowanie — Portal Kierowcy STP" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    // Forward invite/recovery tokens that landed here by accident.
    const hash = window.location.hash || "";
    if (hash.includes("type=invite") || hash.includes("type=signup")) {
      window.location.replace("/zaproszenie" + hash);
      return;
    }
    if (hash.includes("type=recovery")) {
      window.location.replace("/reset-hasla" + hash);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pulpit", replace: true });
    });
    bootstrapStatus()
      .then((r) => setNeedsBootstrap(!r.hasAdmin))
      .catch(() => {});
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się zalogować", { description: "Sprawdź adres e-mail i hasło." });
      return;
    }
    navigate({ to: "/pulpit", replace: true });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-brand-surface">
      <div className="hidden lg:flex flex-col justify-between bg-brand text-brand-foreground p-12">
        <div className="flex items-center gap-3">
          <img src={stpLogo.url} alt="STP" className="size-10 invert" />
          <div>
            <div className="font-bold tracking-tight">Portal Kierowcy</div>
            <div className="text-[11px] uppercase tracking-widest text-brand-foreground/50">
              Skuszawyjińsk Transport Publiczny
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight max-w-md">
            System dyspozytorski dla kierowców i administracji STP.
          </h2>
          <p className="text-brand-foreground/60 max-w-md text-sm leading-relaxed">
            Dostęp wyłącznie dla pracowników. Konta są tworzone i zarządzane przez dyspozytora.
            W przypadku problemów z logowaniem skontaktuj się z administratorem.
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-brand-foreground/30 font-mono">
          v1.0 &middot; Centrum Operacyjne STP
        </div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={stpLogo.url} alt="STP" className="size-9" />
            <span className="font-bold tracking-tight">Portal Kierowcy</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Logowanie</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Wprowadź swoje dane służbowe, aby kontynuować.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kierowca@stp.pl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Logowanie…" : "Zaloguj się"}
            </Button>
          </form>

          {needsBootstrap && (
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Brak administratora w systemie.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/bootstrap">Utwórz pierwsze konto administratora</Link>
              </Button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            Rejestracja jest wyłączona. Konta zakłada wyłącznie administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
