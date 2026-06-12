import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listAllVacationRequests, decideVacationRequest } from "@/lib/portal.functions";
import { LEAVE_TYPE_LABEL } from "@/lib/leave-types";


export const Route = createFileRoute("/_authenticated/admin/urlopy")({
  head: () => ({ meta: [{ title: "Urlopy — Admin STP" }] }),
  component: AdminVacationsPage,
});

function AdminVacationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllVacationRequests);
  const decideFn = useServerFn(decideVacationRequest);

  const { data } = useQuery({ queryKey: ["admin", "vacations"], queryFn: () => listFn() });
  const list = (data ?? []) as any[];

  const [active, setActive] = useState<{ id: string; status: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "vacations"] });

  const submitDecision = async () => {
    if (!active) return;
    try {
      await decideFn({ data: { id: active.id, status: active.status, admin_note: note || null } });
      toast.success(active.status === "approved" ? "Zatwierdzono" : "Odrzucono");
      setActive(null);
      setNote("");
      refresh();
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Wnioski urlopowe</h2>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
            <tr>
              <th className="px-6 py-3">Pracownik</th>
              <th className="px-6 py-3">Rodzaj</th>
              <th className="px-6 py-3">Okres</th>
              <th className="px-6 py-3">Uzasadnienie</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((v) => (
              <tr key={v.id}>
                <td className="px-6 py-3">
                  <div className="font-semibold">{v.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground font-mono">{v.profiles?.employee_id ?? ""}</div>
                </td>
                <td className="px-6 py-3"><Badge variant="secondary">{LEAVE_TYPE_LABEL[v.leave_type] ?? v.leave_type}</Badge></td>
                <td className="px-6 py-3 font-mono text-xs">{v.start_date} → {v.end_date}</td>
                <td className="px-6 py-3 text-muted-foreground max-w-xs">{v.reason ?? "—"}</td>

                <td className="px-6 py-3">
                  {v.status === "approved" && <Badge className="bg-status-ok text-status-ok-foreground">Zatwierdzone</Badge>}
                  {v.status === "rejected" && <Badge variant="destructive">Odrzucone</Badge>}
                  {v.status === "pending" && <Badge variant="outline">Oczekuje</Badge>}
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  {v.status === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => { setActive({ id: v.id, status: "approved" }); setNote(""); }}>Zatwierdź</Button>
                      <Button size="sm" variant="destructive" onClick={() => { setActive({ id: v.id, status: "rejected" }); setNote(""); }}>Odrzuć</Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{v.decided_at ? new Date(v.decided_at).toLocaleDateString("pl-PL") : ""}</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Brak wniosków.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.status === "approved" ? "Zatwierdzenie wniosku" : "Odrzucenie wniosku"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Komentarz (opcjonalnie)</label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Anuluj</Button>
            <Button onClick={submitDecision}>Potwierdź</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
