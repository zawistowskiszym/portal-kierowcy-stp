import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listAllReports, getReport, updateReport, addReportComment } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/raporty")({
  ssr: false,
  head: () => ({ meta: [{ title: "Centrum raportów — STP" }] }),
  component: ReportsCenter,
});

const CATS: Record<string, string> = {
  operational: "Operacyjny", complaint: "Skarga", infrastructure: "Infrastruktura",
  vehicle: "Pojazd", schedule: "Rozkład", info: "Informacja",
};
const STATUSES: Record<string, string> = {
  new: "Nowy", in_review: "W analizie", action_taken: "Działanie podjęte", closed: "Zamknięty",
};

function ReportsCenter() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllReports);
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["reports", status, category],
    queryFn: () => listFn({ data: { status: status as any, category: category === "all" ? undefined : category } }),
  });
  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Centrum raportów</h1>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie statusy</SelectItem>
              {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie kategorie</SelectItem>
              {Object.entries(CATS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Kod</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Kierowca</th>
              <th className="px-4 py-3 text-left">Kategoria</th>
              <th className="px-4 py-3 text-left">Linia / Pojazd</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Brak raportów.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setOpenId(r.id)}>
                <td className="px-4 py-2 font-mono text-xs">{r.report_code}</td>
                <td className="px-4 py-2">{new Date(r.created_at).toLocaleString("pl-PL")}</td>
                <td className="px-4 py-2">{r.driver?.full_name ?? "—"}</td>
                <td className="px-4 py-2">{CATS[r.category] ?? r.category}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.route ?? "—"} / {r.vehicle_label ?? "—"}</td>
                <td className="px-4 py-2"><Badge variant={r.status === "new" ? "destructive" : "secondary"}>{STATUSES[r.status] ?? r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && <ReportDialog id={openId} onClose={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["reports"] }); }} />}
    </div>
  );
}

function ReportDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const getFn = useServerFn(getReport);
  const updFn = useServerFn(updateReport);
  const commentFn = useServerFn(addReportComment);
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data } = useQuery({ queryKey: ["report", id], queryFn: () => getFn({ data: { id } }) });
  const r = (data as any)?.report;
  const comments = ((data as any)?.comments ?? []) as any[];

  const save = async (patch: any) => {
    try {
      await updFn({ data: { id, ...patch } });
      toast.success("Zapisano");
      qc.invalidateQueries({ queryKey: ["report", id] });
    } catch (e: any) { toast.error(e?.message ?? "Błąd"); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    try {
      await commentFn({ data: { report_id: id, body: comment } });
      setComment("");
      qc.invalidateQueries({ queryKey: ["report", id] });
    } catch (e: any) { toast.error(e?.message ?? "Błąd"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{r?.report_code ?? "Raport"}</DialogTitle></DialogHeader>
        {!r ? <p className="text-sm text-muted-foreground">Wczytywanie…</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Kierowca:</span> {r.driver?.full_name}</div>
              <div><span className="text-muted-foreground">Zajezdnia:</span> {r.driver?.depot ?? "—"}</div>
              <div><span className="text-muted-foreground">Linia:</span> {r.route ?? "—"}</div>
              <div><span className="text-muted-foreground">Pojazd:</span> {r.vehicle_label ?? "—"}</div>
              <div><span className="text-muted-foreground">Kategoria:</span> {CATS[r.category]}</div>
              <div><span className="text-muted-foreground">Utworzono:</span> {new Date(r.created_at).toLocaleString("pl-PL")}</div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">{r.description}</div>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">Status:</span>
              <Select value={r.status} onValueChange={(v) => save({ status: v })}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => save({ archived: true })}>Archiwizuj</Button>
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Komentarze ({comments.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-muted/30 rounded p-2 text-xs">
                    <div className="text-muted-foreground mb-1">{new Date(c.created_at).toLocaleString("pl-PL")}</div>
                    {c.body}
                  </div>
                ))}
              </div>
              <Textarea className="mt-2" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Dodaj komentarz wewnętrzny…" />
              <Button size="sm" className="mt-2" onClick={addComment}>Dodaj komentarz</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
