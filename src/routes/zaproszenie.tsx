import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { completeInvitation } from "@/lib/portal.functions";

export const Route = createFileRoute("/zaproszenie")({
  ssr: false,
  head: () => ({ meta: [{ title: "Aktywacja konta — STP" }] }),
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const completeFn = useServerFn(completeInvitation);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    employee_id: "",
    depot: "",
    password: "",
    password2: "",
  });

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setError(
          "Link do aktywacji jest nieprawidłowy lub wygasł. Skontaktuj się z administratorem.",
        );
      } else {
        setEmail(data.user.email ?? null);
      }
      setReady(true);
    };
    // Give supabase-js a tick to consume the invite token from the URL hash.
    const sub = supabase.auth.onAuthStateChange(() => check());
    check();
    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Hasło musi mieć co najmniej 8 znaków");
      return;
    }
    if (form.password !== form.password2) {
      toast.error("Hasła nie są identyczne");
      return;
    }
    setSubmitting(true);
    try {
      const { error: pwErr } = await supabase.auth.updateUser({ password: form.password });
      if (pwErr) throw pwErr;
      await completeFn({
        data: {
          full_name: form.full_name,
          employee_id: form.employee_id || null,
          depot: form.depot || null,
        },
      });
      toast.success("Konto aktywowane");
      navigate({ to: "/pulpit" });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">
        Ładowanie…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Nie można aktywować konta</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Aktywacja konta</h1>
          <p className="text-sm text-muted-foreground">
            Witamy{email ? ` (${email})` : ""}. Uzupełnij dane i ustaw hasło, aby zacząć
            korzystać z panelu.
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Imię i nazwisko</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nr służbowy</Label>
              <Input
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Zajezdnia</Label>
              <Input
                value={form.depot}
                onChange={(e) => setForm({ ...form, depot: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Hasło</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Powtórz hasło</Label>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password2}
              onChange={(e) => setForm({ ...form, password2: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Aktywuj konto"}
          </Button>
        </form>
      </div>
    </div>
  );
}
