import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitIncident } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/zdarzenie")({
  ssr: false,
  head: () => ({ meta: [{ title: "Zgłoszenie zdarzenia — Portal STP" }] }),
  component: ZdarzeniePage,
});

const TYPE_MAP: Record<string, string> = {
  kolizja: "collision",
  wypadek: "collision",
  potracenie: "passenger_emergency",
  szkoda: "collision",
  awaria: "breakdown",
  blokada: "blockage",
  inne: "other",
};

function ZdarzeniePage() {
  const navigate = useNavigate();
  const submitFn = useServerFn(submitIncident);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    severity: "kolizja",
    location: "",
    occurred_at: "",
    route: "",
    duty_number: "",
    vehicle_label: "",
    description: "",
    injured: "nie",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim() || !form.description.trim()) {
      toast.error("Lokalizacja i opis zdarzenia są wymagane");
      return;
    }
    setBusy(true);
    try {
      const priority =
        form.injured === "ciezko" ? "critical" : form.injured === "lekko" ? "high" : "medium";
      await submitFn({
        data: {
          type: (TYPE_MAP[form.severity] ?? "other") as any,
          priority: priority as any,
          location: form.location,
          route: form.route || null,
          duty_number: form.duty_number || null,
          vehicle_label: form.vehicle_label || null,
          description: `${form.description}\n\nPoszkodowani: ${form.injured}`,
          occurred_at: form.occurred_at ? new Date(form.occurred_at).toISOString() : null,
        },
      });
      toast.success("Zdarzenie zgłoszone — dyspozytor powiadomiony");
      navigate({ to: "/pulpit" });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-destructive/40 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <h2 className="text-xl font-bold">Zgłoszenie zdarzenia</h2>
        </div>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
          W przypadku zagrożenia życia lub zdrowia natychmiast zadzwoń pod <strong>112</strong>.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Rodzaj</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kolizja">Kolizja</SelectItem>
                  <SelectItem value="wypadek">Wypadek</SelectItem>
                  <SelectItem value="potracenie">Potrącenie pieszego</SelectItem>
                  <SelectItem value="szkoda">Szkoda parkingowa</SelectItem>
                  <SelectItem value="awaria">Awaria pojazdu</SelectItem>
                  <SelectItem value="blokada">Blokada drogi</SelectItem>
                  <SelectItem value="inne">Inne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Poszkodowani</Label>
              <Select value={form.injured} onValueChange={(v) => setForm({ ...form, injured: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nie">Brak</SelectItem>
                  <SelectItem value="lekko">Lekko ranni</SelectItem>
                  <SelectItem value="ciezko">Ciężko ranni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Czas</Label>
              <Input
                type="datetime-local"
                value={form.occurred_at}
                onChange={(e) => setForm({ ...form, occurred_at: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Linia (opcj.)</Label>
              <Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nr służby (opcj.)</Label>
              <Input value={form.duty_number} onChange={(e) => setForm({ ...form, duty_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Pojazd (opcj.)</Label>
              <Input value={form.vehicle_label} onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Lokalizacja</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ulica, skrzyżowanie, miasto"
            />
          </div>
          <div className="space-y-1">
            <Label>Opis</Label>
            <Textarea
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Przebieg zdarzenia, warunki, świadkowie…"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? "Wysyłanie…" : "Zgłoś zdarzenie"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
