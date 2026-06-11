import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin/pojazdy")({
  head: () => ({ meta: [{ title: "Tabor — Admin STP" }] }),
  component: VehiclesPage,
});

const FUELS = ["Diesel", "Elektryczny", "Hybrydowy", "Wodorowy"] as const;
const DEPOTS = ["Kijowska", "Królewska", "Partyzantów", "Franklina"] as const;

type Vehicle = {
  id: string;
  vehicle_number: string;
  model: string;
  fuel: typeof FUELS[number];
  depot: string;
  production_year: number | null;
  capacity: number | null;
  active: boolean;
  notes: string | null;
};

const empty = {
  vehicle_number: "", model: "", fuel: "Diesel" as typeof FUELS[number],
  depot: "Kijowska", production_year: "", capacity: "", active: true, notes: "",
};

function VehiclesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listVehicles);
  const createFn = useServerFn(createVehicle);
  const updateFn = useServerFn(updateVehicle);
  const deleteFn = useServerFn(deleteVehicle);

  const { data } = useQuery({ queryKey: ["admin", "vehicles"], queryFn: () => listFn() });
  const vehicles = (data ?? []) as Vehicle[];

  const [search, setSearch] = useState("");
  const [depotFilter, setDepotFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) =>
      (depotFilter === "all" || v.depot === depotFilter) &&
      (fuelFilter === "all" || v.fuel === fuelFilter) &&
      (!q || v.vehicle_number.toLowerCase().includes(q) || v.model.toLowerCase().includes(q))
    );
  }, [vehicles, search, depotFilter, fuelFilter]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "vehicles"] });

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setForm({
      vehicle_number: v.vehicle_number, model: v.model, fuel: v.fuel, depot: v.depot,
      production_year: v.production_year?.toString() ?? "",
      capacity: v.capacity?.toString() ?? "",
      active: v.active, notes: v.notes ?? "",
    });
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      vehicle_number: form.vehicle_number.trim(),
      model: form.model.trim(),
      fuel: form.fuel,
      depot: form.depot.trim(),
      production_year: form.production_year ? parseInt(form.production_year, 10) : null,
      capacity: form.capacity ? parseInt(form.capacity, 10) : null,
      active: form.active,
      notes: form.notes.trim() || null,
    };
    try {
      if (editing) await updateFn({ data: { id: editing.id, ...payload } });
      else await createFn({ data: payload });
      toast.success(editing ? "Zaktualizowano pojazd" : "Dodano pojazd");
      setOpen(false); refresh();
    } catch (err: any) { toast.error(err?.message ?? "Błąd zapisu"); }
  };

  const onDelete = async (v: Vehicle) => {
    if (!confirm(`Usunąć pojazd ${v.vehicle_number}?`)) return;
    try { await deleteFn({ data: { id: v.id } }); toast.success("Usunięto"); refresh(); }
    catch (err: any) { toast.error(err?.message ?? "Błąd usuwania"); }
  };

  const fuelVariant = (f: string) => f === "Elektryczny" ? "default" : f === "Wodorowy" ? "secondary" : f === "Hybrydowy" ? "outline" : "outline";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tabor</h2>
          <p className="text-sm text-muted-foreground">{vehicles.length} pojazdów w ewidencji</p>
        </div>
        <Button onClick={openCreate}>+ Nowy pojazd</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input placeholder="Szukaj numeru lub modelu…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={depotFilter} onValueChange={setDepotFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Zajezdnia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie zajezdnie</SelectItem>
            {DEPOTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fuelFilter} onValueChange={setFuelFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Napęd" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Każdy napęd</SelectItem>
            {FUELS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] uppercase tracking-widest text-muted-foreground border-b">
          <div className="col-span-2">Nr</div>
          <div className="col-span-5">Model</div>
          <div className="col-span-2">Napęd</div>
          <div className="col-span-2">Zajezdnia</div>
          <div className="col-span-1 text-right">Akcje</div>
        </div>
        <div className="max-h-[60vh] overflow-auto divide-y">
          {filtered.map((v) => (
            <div key={v.id} className="grid grid-cols-12 gap-2 px-4 py-2 items-center text-sm hover:bg-muted/40">
              <div className="col-span-2 font-mono font-semibold">{v.vehicle_number}{!v.active && <span className="ml-2 text-xs text-muted-foreground">(wycofany)</span>}</div>
              <div className="col-span-5">{v.model}</div>
              <div className="col-span-2"><Badge variant={fuelVariant(v.fuel) as any}>{v.fuel}</Badge></div>
              <div className="col-span-2">{v.depot}</div>
              <div className="col-span-1 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>Edytuj</Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(v)}>Usuń</Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted-foreground">Brak pojazdów spełniających kryteria.</div>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Edytuj pojazd ${editing.vehicle_number}` : "Nowy pojazd"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Numer taborowy</Label><Input required value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
              <div className="space-y-1"><Label>Model</Label><Input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Napęd</Label>
                <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUELS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Zajezdnia</Label>
                <Select value={form.depot} onValueChange={(v) => setForm({ ...form, depot: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPOTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Rok produkcji</Label><Input type="number" value={form.production_year} onChange={(e) => setForm({ ...form, production_year: e.target.value })} /></div>
              <div className="space-y-1"><Label>Pojemność (miejsc)</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Uwagi</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Pojazd aktywny w ewidencji
            </label>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Anuluj</Button>
              <Button type="submit">{editing ? "Zapisz" : "Dodaj"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
