import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listIncidents, getIncident, updateIncident, addIncidentNote } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/incydenty")({
  ssr: false,
  head: () => ({ meta: [{ title: "Incydenty — STP" }] }),
  component: IncidentsPage,
});

const TYPES: Record<string, string> = {
  collision: "Kolizja", breakdown: "Awaria", blockage: "Blokada", major_delay: "Duże opóźnienie",
  passenger_emergency: "Sytuacja pasażerska", security: "Bezpieczeństwo", infrastructure: "Infrastruktura", other: "Inne",
};
const STATUSES: Record<string, string> = {
  reported: "Zgłoszony", in_progress: "W toku", resolved: "Rozwiązany", closed: "Zamknięty",
};
const priorityVariant = (p: string) => p === "critical" ? "destructive" : p === "high" ? "default" : "secondary";
const PRIORITIES: Record<string, string> = { critical: "Krytyczny", high: "Wysoki", medium: "Normalny", low: "Informacja" };

function IncidentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listIncidents);
  const [openOnly, setOpenOnly] = useState(true);
  const [priority, setPriority] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["incidents", openOnly, priority],
    queryFn: () => listFn({ data: { openOnly, priority: priority as any } }),
    refetchInterval: 20000,
  });
  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Incydenty operacyjne</h1>
        <div className="flex gap-2 items-center">
          <Button variant={openOnly ? "default" : "outline"} size="sm" onClick={() => setOpenOnly(!openOnly)}>
            {openOnly ? "Tylko otwarte" : "Wszystkie"}
          </Button>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie priorytety</SelectItem>
              {Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Kod</th>
              <th className="px-4 py-3 text-left">Priorytet</th>
              <th className="px-4 py-3 text-left">Typ</th>
              <th className="px-4 py-3 text-left">Linia / Pojazd</th>
              <th className="px-4 py-3 text-left">Zgłaszający</th>
              <th className="px-4 py-3 text-left">Czas</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Brak incydentów.</td></tr>}
            {rows.map((i) => (
              <tr key={i.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(i.id)}>
                <td className="px-4 py-2 font-mono text-xs">{i.incident_code}</td>
                <td className="px-4 py-2"><Badge variant={priorityVariant(i.priority)}>{PRIORITIES[i.priority]}</Badge></td>
                <td className="px-4 py-2">{TYPES[i.type] ?? i.type}</td>
                <td className="px-4 py-2 font-mono text-xs">{i.route ?? "—"} / {i.vehicle_label ?? "—"}</td>
                <td className="px-4 py-2">{i.reporter?.full_name ?? "—"}</td>
                <td className="px-4 py-2 text-xs">{new Date(i.created_at).toLocaleString("pl-PL")}</td>
                <td className="px-4 py-2"><Badge variant="secondary">{STATUSES[i.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && <IncidentDialog id={openId} onClose={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["incidents"] }); }} />}
    </div>
  );
}

function IncidentDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const getFn = useServerFn(getIncident);
  const updFn = useServerFn(updateIncident);
  const noteFn = useServerFn(addIncidentNote);
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data } = useQuery({ queryKey: ["incident", id], queryFn: () => getFn({ data: { id } }) });
  const i = (data as any)?.incident;
  const notes = ((data as any)?.notes ?? []) as any[];

  const save = async (patch: any) => {
    try { await updFn({ data: { id, ...patch } }); toast.success("Zapisano"); qc.invalidateQueries({ queryKey: ["incident", id] }); }
    catch (e: any) { toast.error(e?.message ?? "Błąd"); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    try { await noteFn({ data: { incident_id: id, body: note } }); setNote(""); qc.invalidateQueries({ queryKey: ["incident", id] }); }
    catch (e: any) { toast.error(e?.message ?? "Błąd"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{i?.incident_code ?? "Incydent"}</DialogTitle></DialogHeader>
        {!i ? <p className="text-sm text-muted-foreground">Wczytywanie…</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Typ:</span> {TYPES[i.type]}</div>
              <div><span className="text-muted-foreground">Lokalizacja:</span> {i.location ?? "—"}</div>
              <div><span className="text-muted-foreground">Linia:</span> {i.route ?? "—"}</div>
              <div><span className="text-muted-foreground">Pojazd:</span> {i.vehicle_label ?? "—"}</div>
              <div><span className="text-muted-foreground">Zgłaszający:</span> {i.reporter?.full_name}</div>
              <div><span className="text-muted-foreground">Czas:</span> {new Date(i.occurred_at ?? i.created_at).toLocaleString("pl-PL")}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">{i.description}</div>
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={i.priority} onValueChange={(v) => save({ priority: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={i.status} onValueChange={(v) => save({ status: v })}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              {!i.escalated && <Button variant="destructive" size="sm" onClick={() => save({ escalated: true })}>Eskaluj</Button>}
              {i.escalated && <Badge variant="destructive">Eskalowany</Badge>}
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Notatki ({notes.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notes.map((n: any) => (
                  <div key={n.id} className="bg-muted/30 rounded p-2 text-xs">
                    <div className="text-muted-foreground mb-1">{new Date(n.created_at).toLocaleString("pl-PL")}</div>
                    {n.body}
                  </div>
                ))}
              </div>
              <Textarea className="mt-2" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dodaj notatkę operacyjną…" />
              <Button size="sm" className="mt-2" onClick={addNote}>Dodaj notatkę</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
