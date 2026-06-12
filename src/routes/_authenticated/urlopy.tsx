import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge as _Badge2 } from "@/components/ui/badge";
import { LEAVE_TYPES, LEAVE_TYPE_LABEL, type LeaveTypeValue } from "@/lib/leave-types";
import {
  listMyVacationRequests,
  createVacationRequest,
  cancelVacationRequest,
} from "@/lib/portal.functions";


export const Route = createFileRoute("/_authenticated/urlopy")({
  head: () => ({ meta: [{ title: "Urlopy — Portal STP" }] }),
  component: VacationsPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Oczekuje",
  approved: "Zatwierdzone",
  rejected: "Odrzucone",
};

function VacationsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyVacationRequests);
  const createFn = useServerFn(createVacationRequest);
  const cancelFn = useServerFn(cancelVacationRequest);

  const { data } = useQuery({ queryKey: ["my-vacations"], queryFn: () => listFn() });
  const list = (data ?? []) as any[];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["my-vacations"] });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({
        data: {
          start_date: form.start_date,
          end_date: form.end_date,
          reason: form.reason || null,
        },
      });
      toast.success("Wniosek złożony");
      setOpen(false);
      setForm({ start_date: "", end_date: "", reason: "" });
      refresh();
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    }
  };

  const onCancel = async (id: string) => {
    if (!confirm("Anulować wniosek?")) return;
    try {
      await cancelFn({ data: { id } });
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Moje wnioski urlopowe</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Nowy wniosek</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nowy wniosek urlopowy</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Od</Label>
                  <Input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Do</Label>
                  <Input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Uzasadnienie (opcjonalnie)</Label>
                <Textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <DialogFooter><Button type="submit">Złóż wniosek</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
            <tr>
              <th className="px-6 py-3">Okres</th>
              <th className="px-6 py-3">Uzasadnienie</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Decyzja</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((v) => (
              <tr key={v.id}>
                <td className="px-6 py-3 font-mono text-xs">{v.start_date} → {v.end_date}</td>
                <td className="px-6 py-3 text-muted-foreground">{v.reason ?? "—"}</td>
                <td className="px-6 py-3">
                  {v.status === "approved" && <Badge className="bg-status-ok text-status-ok-foreground">Zatwierdzone</Badge>}
                  {v.status === "rejected" && <Badge variant="destructive">Odrzucone</Badge>}
                  {v.status === "pending" && <Badge variant="outline">Oczekuje</Badge>}
                </td>
                <td className="px-6 py-3 text-xs text-muted-foreground">
                  {v.decided_at ? new Date(v.decided_at).toLocaleString("pl-PL") : "—"}
                  {v.admin_note && <div className="text-foreground/70 mt-1">{v.admin_note}</div>}
                </td>
                <td className="px-6 py-3 text-right">
                  {v.status === "pending" && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onCancel(v.id)}>Anuluj</Button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Brak wniosków.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
