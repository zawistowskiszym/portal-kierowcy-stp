import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPlanningBoard,
  createDuty,
  updateDuty,
  deleteDuty,
  assignDriverToDuty,
  assignVehicleToDuty,
  bulkGenerateDuties,
} from "@/lib/portal.functions";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  Search,
  Clock,
  Bus,
  Building2,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  GripVertical,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sluzby")({
  head: () => ({ meta: [{ title: "Planowanie służb — Admin STP" }] }),
  component: PlanningBoardPage,
});

// ---------- helpers ----------
const PL_DOW = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const PL_MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtH = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

function startOfWeek(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - dow);
  return x;
}

type View = "day" | "week" | "month";

// ---------- main page ----------
function PlanningBoardPage() {
  const qc = useQueryClient();
  const boardFn = useServerFn(getPlanningBoard);
  const assignDriverFn = useServerFn(assignDriverToDuty);
  const assignVehicleFn = useServerFn(assignVehicleToDuty);
  const createFn = useServerFn(createDuty);
  const updateFn = useServerFn(updateDuty);
  const deleteFn = useServerFn(deleteDuty);
  const bulkFn = useServerFn(bulkGenerateDuties);

  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [depotFilter, setDepotFilter] = useState<string>("all");
  const [availOnly, setAvailOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDutyId, setSelectedDutyId] = useState<string | null>(null);
  const [activeDriver, setActiveDriver] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const { from, to, days } = useMemo(() => {
    if (view === "day") return { from: isoDate(anchor), to: isoDate(anchor), days: [new Date(anchor)] };
    if (view === "week") {
      const s = startOfWeek(anchor);
      const ds = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
      return { from: isoDate(ds[0]), to: isoDate(ds[6]), days: ds };
    }
    const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const e = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    const ds: Date[] = [];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) ds.push(new Date(d));
    return { from: isoDate(s), to: isoDate(e), days: ds };
  }, [view, anchor]);

  const { data } = useQuery({
    queryKey: ["planning-board", from, to],
    queryFn: () => boardFn({ data: { from, to } }),
  });
  const board = (data ?? { duties: [], drivers: [], vehicles: [] }) as any;
  const refresh = () => qc.invalidateQueries({ queryKey: ["planning-board"] });

  const depots = Array.from(new Set<string>([...(board.drivers ?? []).map((d: any) => d.depot).filter(Boolean), ...(board.duties ?? []).map((d: any) => d.depot).filter(Boolean)]));

  const filteredDrivers = (board.drivers ?? []).filter((d: any) => {
    if (depotFilter !== "all" && d.depot !== depotFilter) return false;
    if (availOnly && d.availability !== "available") return false;
    if (search && !`${d.full_name} ${d.employee_id ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const dutiesByDay = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const d of board.duties ?? []) {
      if (depotFilter !== "all" && d.depot !== depotFilter) continue;
      const arr = m.get(d.duty_date) ?? []; arr.push(d); m.set(d.duty_date, arr);
    }
    return m;
  }, [board.duties, depotFilter]);

  const selectedDuty = (board.duties ?? []).find((d: any) => d.id === selectedDutyId) ?? null;

  // DnD
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const onDragStart = (e: DragStartEvent) => {
    const d = (board.drivers ?? []).find((x: any) => x.id === e.active.id);
    setActiveDriver(d ?? null);
  };
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveDriver(null);
    if (!e.over) return;
    const driverId = e.active.id as string;
    const dutyId = String(e.over.id).replace(/^duty:/, "");
    try {
      const res: any = await assignDriverFn({ data: { dutyId, driverId } });
      if (!res?.ok) {
        const msgs = (res?.warnings ?? []).map((w: any) => w.msg).join("\n");
        if (confirm(`Wykryto konflikty:\n\n${msgs}\n\nPrzydzielić mimo to?`)) {
          await assignDriverFn({ data: { dutyId, driverId, force: true } });
          toast.success("Przydzielono (z konfliktem)");
        } else { return; }
      } else {
        toast.success("Przydzielono kierowcę");
        if (res.warnings?.length) toast.warning(res.warnings[0].msg);
      }
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  const stepAnchor = (dir: 1 | -1) => {
    const d = new Date(anchor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(d);
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => stepAnchor(-1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" onClick={() => setAnchor(new Date(new Date().setHours(0,0,0,0)))}>Dziś</Button>
            <Button size="icon" variant="outline" onClick={() => stepAnchor(1)}><ChevronRight className="size-4" /></Button>
            <div className="ml-2 font-bold font-mono text-sm">
              {view === "month"
                ? `${PL_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
                : `${days[0].getDate()} ${PL_MONTHS[days[0].getMonth()]} — ${days[days.length-1].getDate()} ${PL_MONTHS[days[days.length-1].getMonth()]} ${days[days.length-1].getFullYear()}`}
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="day">Dzień</TabsTrigger>
              <TabsTrigger value="week">Tydzień</TabsTrigger>
              <TabsTrigger value="month">Miesiąc</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={depotFilter} onValueChange={setDepotFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Wszystkie zajezdnie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie zajezdnie</SelectItem>
                {depots.map((d) => <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setBulkOpen(true)}><Zap className="size-4 mr-1" />Generator</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="size-4 mr-1" />Nowa służba</Button>
          </div>
        </div>

        {/* 3-pane board */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Drivers */}
          <aside className="col-span-12 lg:col-span-3 bg-card border border-border rounded-xl shadow-sm flex flex-col max-h-[calc(100vh-220px)]">
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kierowcy ({filteredDrivers.length})</div>
                <button onClick={() => setAvailOnly(!availOnly)} className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${availOnly ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground"}`}>Dostępni</button>
              </div>
              <div className="relative">
                <Search className="size-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj..." className="h-8 pl-7 text-xs" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredDrivers.map((d: any) => <DriverCard key={d.id} driver={d} />)}
              {filteredDrivers.length === 0 && <div className="text-xs text-muted-foreground text-center py-8">Brak kierowców</div>}
            </div>
          </aside>

          {/* Center: schedule */}
          <section className="col-span-12 lg:col-span-6 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {view !== "month" ? (
              <div className={`grid ${view === "day" ? "grid-cols-1" : "grid-cols-7"} divide-x divide-border min-h-[calc(100vh-220px)]`}>
                {days.map((day) => (
                  <DayColumn
                    key={isoDate(day)}
                    day={day}
                    duties={dutiesByDay.get(isoDate(day)) ?? []}
                    selectedId={selectedDutyId}
                    onSelect={setSelectedDutyId}
                  />
                ))}
              </div>
            ) : (
              <MonthGrid days={days} dutiesByDay={dutiesByDay} selectedId={selectedDutyId} onSelect={setSelectedDutyId} anchor={anchor} />
            )}
          </section>

          {/* Right: details */}
          <aside className="col-span-12 lg:col-span-3 bg-card border border-border rounded-xl shadow-sm max-h-[calc(100vh-220px)] overflow-y-auto">
            <DutyDetailsPanel
              duty={selectedDuty}
              vehicles={board.vehicles ?? []}
              drivers={board.drivers ?? []}
              onAssignDriver={async (driverId, force) => {
                if (!selectedDuty) return;
                const res: any = await assignDriverFn({ data: { dutyId: selectedDuty.id, driverId, force } });
                if (!res?.ok && res?.warnings?.length) {
                  const msgs = res.warnings.map((w: any) => w.msg).join("\n");
                  if (confirm(`Konflikty:\n${msgs}\n\nKontynuować?`)) {
                    await assignDriverFn({ data: { dutyId: selectedDuty.id, driverId, force: true } });
                  } else return;
                }
                toast.success(driverId ? "Przydzielono" : "Usunięto przydział");
                refresh();
              }}
              onAssignVehicle={async (vehicleId, force) => {
                if (!selectedDuty) return;
                const res: any = await assignVehicleFn({ data: { dutyId: selectedDuty.id, vehicleId, force } });
                if (!res?.ok && res?.warnings?.length) {
                  const msgs = res.warnings.map((w: any) => w.msg).join("\n");
                  if (confirm(`Konflikty:\n${msgs}\n\nKontynuować?`)) {
                    await assignVehicleFn({ data: { dutyId: selectedDuty.id, vehicleId, force: true } });
                  } else return;
                }
                toast.success("Zaktualizowano pojazd");
                refresh();
              }}
              onUpdate={async (patch) => {
                if (!selectedDuty) return;
                await updateFn({ data: { id: selectedDuty.id, ...patch } });
                toast.success("Zapisano");
                refresh();
              }}
              onDelete={async () => {
                if (!selectedDuty || !confirm(`Usunąć służbę ${selectedDuty.duty_number}?`)) return;
                await deleteFn({ data: { id: selectedDuty.id } });
                setSelectedDutyId(null);
                toast.success("Usunięto");
                refresh();
              }}
            />
          </aside>
        </div>
      </div>

      <DragOverlay>
        {activeDriver && (
          <div className="bg-brand text-brand-foreground rounded-lg px-3 py-2 text-xs font-semibold shadow-2xl flex items-center gap-2">
            <User className="size-3.5" /> {activeDriver.full_name}
          </div>
        )}
      </DragOverlay>

      <CreateDutyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        vehicles={board.vehicles ?? []}
        onSubmit={async (form) => {
          await createFn({ data: form });
          toast.success("Utworzono służbę");
          setCreateOpen(false);
          refresh();
        }}
      />
      <BulkGeneratorDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        defaultDate={isoDate(anchor)}
        depots={depots as string[]}
        onSubmit={async (form) => {
          const res: any = await bulkFn({ data: form });
          toast.success(`Wygenerowano ${res.count} służb`);
          setBulkOpen(false);
          refresh();
        }}
      />
    </DndContext>
  );
}

// ---------- driver card (draggable) ----------
function DriverCard({ driver }: { driver: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: driver.id });
  const color =
    driver.availability === "available" ? "bg-emerald-500" :
    driver.availability === "limited" ? "bg-amber-500" : "bg-destructive";
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group bg-background border border-border rounded-lg p-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-brand/50 hover:shadow-sm transition-all ${isDragging ? "opacity-30" : ""}`}
    >
      <GripVertical className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
      <span className={`size-2 rounded-full ${color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate">{driver.full_name}</div>
        <div className="text-[10px] text-muted-foreground font-mono flex gap-2">
          <span>{driver.employee_id ?? "—"}</span>
          <span>·</span>
          <span className="truncate">{driver.depot ?? "—"}</span>
        </div>
      </div>
      <div className="text-[10px] font-bold font-mono text-muted-foreground shrink-0">{fmtH(driver.month_minutes ?? 0)}</div>
    </div>
  );
}

// ---------- day column ----------
function DayColumn({ day, duties, selectedId, onSelect }: { day: Date; duties: any[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const iso = isoDate(day);
  const today = isoDate(new Date());
  return (
    <div className="flex flex-col min-w-0">
      <div className={`px-2 py-2 border-b border-border text-center ${iso === today ? "bg-brand/5" : ""}`}>
        <div className="text-[10px] font-bold uppercase text-muted-foreground">{PL_DOW[day.getDay()]}</div>
        <div className={`text-base font-bold font-mono ${iso === today ? "text-brand" : ""}`}>{day.getDate()}</div>
      </div>
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
        {duties.map((d) => (
          <DutyCard key={d.id} duty={d} selected={d.id === selectedId} onSelect={() => onSelect(d.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------- duty card (droppable) ----------
function DutyCard({ duty, selected, onSelect }: { duty: any; selected: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `duty:${duty.id}` });
  const statusBar =
    duty.status === "assigned" ? "bg-emerald-500" :
    duty.status === "pending" ? "bg-amber-500" : "bg-destructive";
  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className={`relative bg-background border rounded-md p-2 cursor-pointer transition-all overflow-hidden ${
        selected ? "border-brand ring-2 ring-brand/30" : "border-border hover:border-brand/40"
      } ${isOver ? "ring-2 ring-brand bg-brand/5" : ""}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusBar}`} />
      <div className="pl-1.5 space-y-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[11px] font-bold font-mono truncate">{duty.duty_number}</span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">{duty.start_time?.slice(0,5)}</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-mono">{duty.route}</div>
        {duty.vehicle_label && <div className="text-[10px] text-muted-foreground font-mono">#{duty.vehicle_label}</div>}
        <div className="text-[10px] truncate">
          {duty.profiles?.full_name ? (
            <span className="text-foreground">{duty.profiles.full_name}</span>
          ) : (
            <span className="text-destructive font-semibold">Nieprzydzielona</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- month grid ----------
function MonthGrid({ days, dutiesByDay, selectedId, onSelect, anchor }: any) {
  const first = days[0] as Date;
  const leadEmpty = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array(leadEmpty).fill(null).concat(days);
  while (cells.length % 7 !== 0) cells.push(null);
  const today = isoDate(new Date());
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {["Pn","Wt","Śr","Cz","Pt","Sb","Nd"].map((d) => (
          <div key={d} className="text-[10px] uppercase font-bold text-muted-foreground text-center py-2 border-r border-border last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => (
          <div key={i} className="min-h-28 border-r border-b border-border last:border-r-0 p-1.5">
            {day && (
              <>
                <div className={`text-xs font-bold font-mono mb-1 ${isoDate(day) === today ? "text-brand" : day.getMonth() !== anchor.getMonth() ? "text-muted-foreground/40" : ""}`}>{day.getDate()}</div>
                <div className="space-y-1">
                  {(dutiesByDay.get(isoDate(day)) ?? []).slice(0, 3).map((d: any) => (
                    <DutyCard key={d.id} duty={d} selected={d.id === selectedId} onSelect={() => onSelect(d.id)} />
                  ))}
                  {(dutiesByDay.get(isoDate(day)) ?? []).length > 3 && (
                    <div className="text-[10px] text-muted-foreground font-mono pl-1">+{(dutiesByDay.get(isoDate(day))!).length - 3} więcej</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- details panel ----------
function DutyDetailsPanel({ duty, vehicles, drivers, onAssignDriver, onAssignVehicle, onUpdate, onDelete }: any) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(duty?.notes ?? "");
  if (!duty) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Wybierz służbę z planu, aby zobaczyć szczegóły.
      </div>
    );
  }
  const statusIcon =
    duty.status === "assigned" ? <CheckCircle2 className="size-4 text-emerald-500" /> :
    duty.status === "pending" ? <AlertTriangle className="size-4 text-amber-500" /> :
    <XCircle className="size-4 text-destructive" />;

  return (
    <div className="divide-y divide-border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Badge variant="outline" className="font-mono">{duty.duty_number}</Badge>
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold">
            {statusIcon}
            {duty.status === "assigned" ? "Przydzielona" : duty.status === "pending" ? "Częściowa" : "Nieprzydzielona"}
          </div>
        </div>
        <div className="text-lg font-bold">{duty.duty_date}</div>
        <div className="text-sm text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
          <Clock className="size-3" /> {duty.start_time?.slice(0,5)} → {duty.end_time?.slice(0,5)}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <Row icon={Building2} label="Zajezdnia" value={duty.depot} />
        <Row icon={Bus} label="Linia / trasa" value={duty.route} mono />
        {duty.notes && <Row icon={Clock} label="Uwagi" value={duty.notes} />}
      </div>

      <div className="p-4 space-y-3">
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Kierowca</Label>
          <Select value={duty.assigned_to ?? "none"} onValueChange={(v) => onAssignDriver(v === "none" ? null : v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Brak —</SelectItem>
              {drivers.map((d: any) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.full_name} {d.employee_id ? `(${d.employee_id})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Pojazd</Label>
          <Select value={duty.vehicle_id ?? "none"} onValueChange={(v) => onAssignVehicle(v === "none" ? null : v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Wybierz pojazd" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Brak —</SelectItem>
              {vehicles.map((v: any) => (
                <SelectItem key={v.id} value={v.id} disabled={v.status === "out_of_service"}>
                  #{v.vehicle_number} — {v.model} {v.status === "out_of_service" ? "(OOS)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {editing ? (
          <>
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Uwagi</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <div className="flex gap-2">
              <Button size="sm" onClick={async () => { await onUpdate({ notes }); setEditing(false); }}>Zapisz</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setNotes(duty.notes ?? ""); }}>Anuluj</Button>
            </div>
          </>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => { setNotes(duty.notes ?? ""); setEditing(true); }}>Edytuj uwagi</Button>
        )}
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-4 mr-1" /> Usuń służbę
        </Button>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono }: any) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</div>
        <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

// ---------- create dialog ----------
function CreateDutyDialog({ open, onOpenChange, vehicles, onSubmit }: any) {
  const [form, setForm] = useState({
    duty_number: "", duty_date: "", start_time: "", end_time: "",
    depot: "", route: "", vehicle_id: "", notes: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nowa służba</DialogTitle></DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); try {
          await onSubmit({ ...form, vehicle_id: form.vehicle_id || null, vehicle_label: vehicles.find((v: any) => v.id === form.vehicle_id)?.vehicle_number ?? null, notes: form.notes || null });
          setForm({ duty_number: "", duty_date: "", start_time: "", end_time: "", depot: "", route: "", vehicle_id: "", notes: "" });
        } catch (err: any) { toast.error(err?.message); } }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Nr służby</Label><Input required value={form.duty_number} onChange={(e) => setForm({ ...form, duty_number: e.target.value })} placeholder="151/1" /></div>
            <div className="space-y-1"><Label>Data</Label><Input type="date" required value={form.duty_date} onChange={(e) => setForm({ ...form, duty_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Start</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Koniec</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Zajezdnia</Label><Input required value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })} /></div>
            <div className="space-y-1"><Label>Linia / trasy</Label><Input required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="151+190" /></div>
            <div className="space-y-1 col-span-2">
              <Label>Pojazd</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={(v) => setForm({ ...form, vehicle_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Bez pojazdu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Bez pojazdu —</SelectItem>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>#{v.vehicle_number} — {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1"><Label>Uwagi</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {form.start_time && form.end_time && (
            <div className="text-xs text-muted-foreground font-mono">
              Czas służby: {(() => {
                const [sh, sm] = form.start_time.split(":").map(Number);
                const [eh, em] = form.end_time.split(":").map(Number);
                let m = eh * 60 + em - sh * 60 - sm; if (m < 0) m += 1440;
                return `${Math.floor(m/60)}h ${m%60}m`;
              })()}
            </div>
          )}
          <DialogFooter><Button type="submit">Utwórz</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- bulk generator dialog ----------
function BulkGeneratorDialog({ open, onOpenChange, defaultDate, depots, onSubmit }: any) {
  const [form, setForm] = useState({ duty_date: defaultDate, division: "", depot: "", route: "", start_time: "06:00", end_time: "14:00", count: 5, priority: "normal" as "low"|"normal"|"high" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generator zbiorczy</DialogTitle>
          <DialogDescription>Utworzy N służb o numerach <span className="font-mono">linia/1</span> … <span className="font-mono">linia/N</span>.</DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); try { await onSubmit({ ...form, count: Number(form.count) }); } catch (err: any) { toast.error(err?.message); } }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Data</Label><Input type="date" required value={form.duty_date} onChange={(e) => setForm({ ...form, duty_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dywizja</Label><Input required value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} placeholder="A" /></div>
            <div className="space-y-1"><Label>Zajezdnia</Label>
              <Select value={form.depot} onValueChange={(v) => setForm({ ...form, depot: v })}>
                <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>{depots.map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Linia / trasy</Label><Input required value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="151+190" /></div>
            <div className="space-y-1"><Label>Start</Label><Input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Koniec</Label><Input type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Liczba służb</Label><Input type="number" min={1} max={50} required value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>Priorytet</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niski</SelectItem>
                  <SelectItem value="normal">Normalny</SelectItem>
                  <SelectItem value="high">Wysoki</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.route && form.count > 0 && (
            <div className="text-xs text-muted-foreground font-mono bg-muted/30 rounded p-2">
              Podgląd: {Array.from({ length: Math.min(3, form.count) }, (_, i) => `${form.route}/${i+1}`).join(", ")}{form.count > 3 ? `, … ${form.route}/${form.count}` : ""}
            </div>
          )}
          <DialogFooter><Button type="submit"><Zap className="size-4 mr-1" />Generuj</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
