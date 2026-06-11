import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAllDuties, createDuty, deleteDuty, listDrivers } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin/sluzby")({
  head: () => ({ meta: [{ title: "Planowanie służb — Admin STP" }] }),
  component: AdminDutiesPage,
});

function AdminDutiesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllDuties);
  const driversFn = useServerFn(listDrivers);
  const createFn = useServerFn(createDuty);
  const delFn = useServerFn(deleteDuty);

  const { data } = useQuery({ queryKey: ["admin", "duties"], queryFn: () => listFn() });
  const drivers = useQuery({ queryKey: ["admin", "drivers"], queryFn: () => driversFn() });

  const duties = (data ?? []) as any[];
  const driverList = (drivers.data ?? []) as any[];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    duty_number: "", duty_date: "", start_time: "", end_time: "",
    depot: "", route: "", vehicle_label: "", notes: "", assigned_to: "",
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "duties"] });

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({
        data: { ...form, assigned_to: form.assigned_to || null, vehicle_label: form.vehicle_label || null, notes: form.notes || null },
      });
      toast.success("Służba utworzona");
      setOpen(false);
      setForm({ duty_number: "", duty_date: "", start_time: "", end_time: "", depot: "", route: "", vehicle_label: "", notes: "", assigned_to: "" });
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  const onDelete = async (d: any) => {
    if (!confirm(`Usunąć służbę ${d.duty_number}?`)) return;
    try { await delFn({ data: { id: d.id } }); refresh(); toast.success("Usunięto"); }
    catch (err: any) { toast.error(err?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Planowanie służb</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Nowa służba</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nowa służba</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Nr służby</Label><Input required value={form.duty_number} onChange={(e) => setForm({ ...form, duty_number: e.target.value })} /></div>
                <div className="space-y-1"><Label>Data</Label><Input type="date" required value={form.duty_date} onChange={(e) => setForm({ ...form, duty_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Start</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="space-y-1"><Label>Koniec</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
                <div className="space-y-1"><Label>Zajezdnia</Label><Input required value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })} /></div>
                <div className="space-y-1"><Label>Linia / trasa</Label><Input required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} /></div>
                <div className="space-y-1"><Label>Pojazd</Label><Input value={form.vehicle_label} onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Kierowca</Label>
                  <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger><SelectValue placeholder="Nieprzydzielona" /></SelectTrigger>
                    <SelectContent>
                      {driverList.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name} {d.employee_id ? `(${d.employee_id})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Uwagi</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <DialogFooter><Button type="submit">Utwórz</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Nr</th>
              <th className="px-6 py-3">Godziny</th>
              <th className="px-6 py-3">Linia</th>
              <th className="px-6 py-3">Pojazd</th>
              <th className="px-6 py-3">Kierowca</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {duties.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-3 font-medium">{d.duty_date}</td>
                <td className="px-6 py-3 font-mono text-xs">{d.duty_number}</td>
                <td className="px-6 py-3 font-mono">{d.start_time?.slice(0,5)} — {d.end_time?.slice(0,5)}</td>
                <td className="px-6 py-3">{d.route}</td>
                <td className="px-6 py-3 font-mono text-xs">{d.vehicle_label ?? "—"}</td>
                <td className="px-6 py-3">{d.profiles?.full_name ?? <span className="text-muted-foreground italic">nieprzydzielona</span>}</td>
                <td className="px-6 py-3 text-right">
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(d)}>Usuń</Button>
                </td>
              </tr>
            ))}
            {duties.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">Brak służb.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
