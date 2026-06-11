import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bootstrapFirstAdmin } from "@/lib/portal.functions";

export const Route = createFileRoute("/auth/bootstrap")({
  ssr: false,
  head: () => ({ meta: [{ title: "Pierwsze uruchomienie — Portal STP" }] }),
  component: BootstrapPage,
});

function BootstrapPage() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapFirstAdmin);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await bootstrap({ data: form });
      toast.success("Konto administratora utworzone", { description: "Możesz się teraz zalogować." });
      navigate({ to: "/auth", replace: true });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message ?? "Spróbuj ponownie" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-brand-surface p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konto administratora</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jednorazowa konfiguracja — utwórz pierwsze konto administratora.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fn">Imię i nazwisko</Label>
            <Input id="fn" required value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em">Adres e-mail</Label>
            <Input id="em" type="email" required value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Hasło (min. 8 znaków)</Label>
            <Input id="pw" type="password" required minLength={8} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Tworzenie…" : "Utwórz administratora"}
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/auth">Powrót do logowania</Link>
          </Button>
        </form>
      </div>
    </div>
  );
}
