import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitReport } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/sluzba/$dutyId/raport")({
  head: () => ({ meta: [{ title: "Złóż raport — Portal STP" }] }),
  component: RaportPage,
});

const CATS = [
  { v: "operational", l: "Operacyjny" },
  { v: "complaint", l: "Skarga / pasażerowie" },
  { v: "vehicle", l: "Usterka pojazdu" },
  { v: "infrastructure", l: "Infrastruktura / przystanek" },
  { v: "schedule", l: "Rozkład / opóźnienie" },
  { v: "info", l: "Informacja" },
];

function RaportPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const submitFn = useServerFn(submitReport);
  const dutyFn = useServerFn(getDuty);
  const { data: duty } = useQuery({ queryKey: ["duty", dutyId], queryFn: () => dutyFn({ data: { id: dutyId } }) });
  const [category, setCategory] = useState("operational");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { toast.error("Treść raportu jest wymagana"); return; }
    setBusy(true);
    try {
      const d = duty as any;
      await submitFn({ data: {
        duty_id: dutyId,
        vehicle_id: d?.vehicle_id ?? null,
        vehicle_label: d?.vehicle_label ?? null,
        route: d?.route ?? null,
        duty_number: d?.duty_number ?? null,
        category: category as any,
        description: body,
      } });
      toast.success("Raport został przekazany do dyspozytora");
      navigate({ to: "/grafik" });
    } catch (err: any) { toast.error("Błąd", { description: err?.message }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/grafik"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" /> Wróć do grafiku</Button></Link>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="size-5 text-brand" />
          <h2 className="text-xl font-bold">Złóż raport ze służby</h2>
        </div>
        <p className="text-sm text-muted-foreground">Służba: <span className="font-mono">{(duty as any)?.duty_number ?? dutyId}</span></p>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Treść raportu</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Opisz przebieg służby, ewentualne nieprawidłowości..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/grafik" })}>Anuluj</Button>
            <Button type="submit" disabled={busy}>{busy ? "Wysyłanie…" : "Wyślij raport"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
