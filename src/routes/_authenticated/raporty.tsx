import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitReport, listMyReports } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/raporty")({
  ssr: false,
  head: () => ({ meta: [{ title: "Moje raporty — Portal STP" }] }),
  component: RaportyPage,
});

const CATS = [
  { v: "operational", l: "Operacyjny" },
  { v: "complaint", l: "Skarga / pasażerowie" },
  { v: "vehicle", l: "Usterka pojazdu" },
  { v: "infrastructure", l: "Infrastruktura / przystanek" },
  { v: "schedule", l: "Rozkład / opóźnienie" },
  { v: "info", l: "Informacja" },
];

const STATUS: Record<string, string> = {
  new: "Nowy",
  in_review: "W trakcie",
  action_taken: "Podjęto działania",
  closed: "Zamknięty",
};

function RaportyPage() {
  const qc = useQueryClient();
  const submitFn = useServerFn(submitReport);
  const listFn = useServerFn(listMyReports);
  const { data } = useQuery({ queryKey: ["my-reports"], queryFn: () => listFn() });
  const list = (data ?? []) as any[];

  const [form, setForm] = useState({
    category: "operational",
    route: "",
    duty_number: "",
    vehicle_label: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      toast.error("Treść raportu jest wymagana");
      return;
    }
    setBusy(true);
    try {
      await submitFn({
        data: {
          category: form.category as any,
          description: form.description,
          route: form.route || null,
          duty_number: form.duty_number || null,
          vehicle_label: form.vehicle_label || null,
        },
      });
      toast.success("Raport wysłany");
      setForm({ category: "operational", route: "", duty_number: "", vehicle_label: "", description: "" });
      qc.invalidateQueries({ queryKey: ["my-reports"] });
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Moje raporty</h1>
        <p className="text-sm text-muted-foreground">
          Złóż raport ze służby. Pola opcjonalne pomagają dyspozytorowi szybciej zlokalizować zdarzenie.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-brand" />
          <h2 className="text-lg font-bold">Nowy raport</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label>Kategoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATS.map((c) => (
                  <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Linia (opcj.)</Label>
            <Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Nr służby (opcj.)</Label>
            <Input value={form.duty_number} onChange={(e) => setForm({ ...form, duty_number: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Pojazd (opcj.)</Label>
            <Input value={form.vehicle_label} onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Treść raportu</Label>
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Opisz przebieg służby, nieprawidłowości, uwagi…"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Wysyłanie…" : "Wyślij raport"}</Button>
        </div>
      </form>

      <div className="space-y-2">
        <h2 className="text-lg font-bold">Historia</h2>
        {list.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
            Brak raportów.
          </div>
        )}
        {list.map((r) => (
          <article key={r.id} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline">{r.report_code}</Badge>
              <Badge variant="secondary">{CATS.find((c) => c.v === r.category)?.l ?? r.category}</Badge>
              <Badge>{STATUS[r.status] ?? r.status}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(r.created_at).toLocaleString("pl-PL")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{r.description}</p>
            {(r.route || r.duty_number || r.vehicle_label) && (
              <div className="text-xs text-muted-foreground mt-2">
                {r.route && <>Linia {r.route} · </>}
                {r.duty_number && <>służba {r.duty_number} · </>}
                {r.vehicle_label && <>pojazd {r.vehicle_label}</>}
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Zgłoszenie zdarzenia drogowego (kolizja, wypadek): <Link to="/zdarzenie" className="underline">zdarzenie drogowe</Link>.
      </p>
    </div>
  );
}
