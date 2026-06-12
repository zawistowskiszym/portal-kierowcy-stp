import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  listLines,
  createLine,
  deleteLine,
  updateLine,
  getLine,
  saveLineStops,
  listStops,
  createStop,
  listInterlinePairs,
  setInterlinePairs,
} from "@/lib/planning.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ChevronRight } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planowanie/linie")({
  component: LinesPage,
});

function LinesPage() {
  const list = useServerFn(listLines);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: lines = [] } = useQuery({ queryKey: ["lines"], queryFn: () => list({}) });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <LineListPanel
        lines={lines}
        selected={selected}
        onSelect={setSelected}
      />
      {selected ? (
        <LineEditor lineId={selected} key={selected} />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Wybierz linię z listy lub dodaj nową.
        </div>
      )}
    </div>
  );
}

function LineListPanel({ lines, selected, onSelect }: { lines: any[]; selected: string | null; onSelect: (id: string) => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createLine);
  const del = useServerFn(deleteLine);
  const [num, setNum] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { line_number: num, terminus_a: a, terminus_b: b } }),
    onSuccess: () => {
      setNum(""); setA(""); setB("");
      qc.invalidateQueries({ queryKey: ["lines"] });
      toast.success("Dodano linię");
    },
    onError: (e: any) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lines"] }),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-3">
      <div className="space-y-2">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nowa linia</div>
        <Input placeholder="Nr linii (np. 178)" value={num} onChange={(e) => setNum(e.target.value)} />
        <Input placeholder="Krańcówka A" value={a} onChange={(e) => setA(e.target.value)} />
        <Input placeholder="Krańcówka B" value={b} onChange={(e) => setB(e.target.value)} />
        <Button size="sm" className="w-full" disabled={!num || !a || !b || createMut.isPending} onClick={() => createMut.mutate()}>
          <Plus className="size-4 mr-1" /> Dodaj linię
        </Button>
      </div>
      <div className="border-t border-border pt-3">
        <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Linie ({lines.length})</div>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {lines.map((l: any) => (
            <div key={l.id} className={`flex items-center gap-2 rounded-md p-2 text-sm ${selected === l.id ? "bg-primary/10" : "hover:bg-muted/40"}`}>
              <button onClick={() => onSelect(l.id)} className="flex-1 text-left">
                <div className="font-mono font-bold">{l.line_number}</div>
                <div className="text-xs text-muted-foreground truncate">{l.terminus_a} → {l.terminus_b}</div>
              </button>
              <button
                onClick={() => { if (confirm("Usunąć linię?")) delMut.mutate(l.id); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LineEditor({ lineId }: { lineId: string }) {
  const qc = useQueryClient();
  const get = useServerFn(getLine);
  const update = useServerFn(updateLine);
  const save = useServerFn(saveLineStops);
  const stopsList = useServerFn(listStops);
  const stopCreate = useServerFn(createStop);
  const listPairs = useServerFn(listInterlinePairs);
  const setPairs = useServerFn(setInterlinePairs);
  const linesFn = useServerFn(listLines);

  const { data, isLoading } = useQuery({
    queryKey: ["line", lineId],
    queryFn: () => get({ data: { id: lineId } }),
  });
  const { data: allStops = [] } = useQuery({ queryKey: ["stops"], queryFn: () => stopsList({}) });
  const { data: lines = [] } = useQuery({ queryKey: ["lines"], queryFn: () => linesFn({}) });
  const { data: pairs = [] } = useQuery({ queryKey: ["pairs"], queryFn: () => listPairs({}) });

  const [ab, setAB] = useState<Array<{ stop_id: string; travel_time_to_next_min: number }>>([]);
  const [ba, setBA] = useState<Array<{ stop_id: string; travel_time_to_next_min: number }>>([]);
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      const stops = data.stops as any[];
      setAB(stops.filter(s => s.direction === "AB").sort((a, b) => a.position - b.position).map(s => ({ stop_id: s.stop_id, travel_time_to_next_min: s.travel_time_to_next_min })));
      setBA(stops.filter(s => s.direction === "BA").sort((a, b) => a.position - b.position).map(s => ({ stop_id: s.stop_id, travel_time_to_next_min: s.travel_time_to_next_min })));
      setLoaded(true);
    }
  }, [data, loaded]);

  const line = data?.line;
  const stopMap = new Map(allStops.map((s: any) => [s.id, s.name]));

  const updateMut = useMutation({
    mutationFn: (patch: any) => update({ data: { id: lineId, patch } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["line", lineId] });
      qc.invalidateQueries({ queryKey: ["lines"] });
    },
  });

  const saveDir = useMutation({
    mutationFn: async () => {
      await save({ data: { line_id: lineId, direction: "AB", stops: ab } });
      // mirror to BA if not custom
      if (!line?.custom_return) {
        const mirrored = [...ab].reverse().map((s, i, arr) => ({
          stop_id: s.stop_id,
          travel_time_to_next_min: i === arr.length - 1 ? 0 : ab[ab.length - 1 - i - 1]?.travel_time_to_next_min ?? 1,
        }));
        await save({ data: { line_id: lineId, direction: "BA", stops: mirrored } });
        setBA(mirrored);
      } else {
        await save({ data: { line_id: lineId, direction: "BA", stops: ba } });
      }
      return true;
    },
    onSuccess: () => {
      toast.success("Zapisano trasę");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["line", lineId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const partnerIds = pairs.filter((p: any) => p.line_a_id === lineId).map((p: any) => p.line_b_id);
  const savePairsMut = useMutation({
    mutationFn: (ids: string[]) => setPairs({ data: { line_id: lineId, partner_ids: ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pairs"] }),
  });

  if (isLoading || !line) return <div className="text-sm text-muted-foreground">Ładowanie…</div>;

  return (
    <div className="space-y-4">
      {/* Settings */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Nr linii</Label>
            <Input defaultValue={line.line_number} onBlur={(e) => e.target.value !== line.line_number && updateMut.mutate({ line_number: e.target.value })} />
          </div>
          <div>
            <Label>Krańcówka A</Label>
            <Input defaultValue={line.terminus_a} onBlur={(e) => e.target.value !== line.terminus_a && updateMut.mutate({ terminus_a: e.target.value })} />
          </div>
          <div>
            <Label>Krańcówka B</Label>
            <Input defaultValue={line.terminus_b} onBlur={(e) => e.target.value !== line.terminus_b && updateMut.mutate({ terminus_b: e.target.value })} />
          </div>
          <div>
            <Label>Zajezdnia</Label>
            <Input defaultValue={line.depot} onBlur={(e) => e.target.value !== line.depot && updateMut.mutate({ depot: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 pt-6">
            <Switch checked={line.custom_return} onCheckedChange={(v) => updateMut.mutate({ custom_return: v })} />
            <span className="text-sm">Niestandardowa trasa powrotna</span>
          </label>
          <label className="flex items-center gap-2 pt-6">
            <Switch checked={line.interlining_enabled} onCheckedChange={(v) => updateMut.mutate({ interlining_enabled: v })} />
            <span className="text-sm">Interlining włączony</span>
          </label>
        </div>
        {line.interlining_enabled && (
          <div className="border-t border-border pt-3 space-y-2">
            <Label>Linie współdzielone (interlining)</Label>
            <div className="flex flex-wrap gap-2">
              {lines.filter((l: any) => l.id !== lineId).map((l: any) => {
                const on = partnerIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      const next = on ? partnerIds.filter((p: string) => p !== l.id) : [...partnerIds, l.id];
                      savePairsMut.mutate(next);
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-mono border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"}`}
                  >
                    {l.line_number}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Min. przerwa między liniami (min)</Label>
              <Input
                type="number" className="w-24"
                defaultValue={line.min_interline_layover_min}
                onBlur={(e) => updateMut.mutate({ min_interline_layover_min: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stops editor */}
      <DirectionEditor
        label={`Kierunek A → B (${line.terminus_a} → ${line.terminus_b})`}
        stops={ab}
        setStops={(s) => { setAB(s); setDirty(true); }}
        allStops={allStops as any}
        stopMap={stopMap as any}
        onCreateStop={async (name) => {
          const s = await stopCreate({ data: { name } });
          qc.invalidateQueries({ queryKey: ["stops"] });
          return s;
        }}
      />
      {line.custom_return && (
        <DirectionEditor
          label={`Kierunek B → A (${line.terminus_b} → ${line.terminus_a})`}
          stops={ba}
          setStops={(s) => { setBA(s); setDirty(true); }}
          allStops={allStops as any}
          stopMap={stopMap as any}
          onCreateStop={async (name) => {
            const s = await stopCreate({ data: { name } });
            qc.invalidateQueries({ queryKey: ["stops"] });
            return s;
          }}
        />
      )}

      <div className="flex items-center justify-end gap-2 sticky bottom-2">
        <Button onClick={() => saveDir.mutate()} disabled={!dirty || saveDir.isPending}>
          {saveDir.isPending ? "Zapisywanie…" : dirty ? "Zapisz trasę" : "Zapisano"}
        </Button>
      </div>
    </div>
  );
}

function DirectionEditor({
  label, stops, setStops, allStops, stopMap, onCreateStop,
}: {
  label: string;
  stops: Array<{ stop_id: string; travel_time_to_next_min: number }>;
  setStops: (s: Array<{ stop_id: string; travel_time_to_next_min: number }>) => void;
  allStops: Array<{ id: string; name: string }>;
  stopMap: Map<string, string>;
  onCreateStop: (name: string) => Promise<{ id: string; name: string }>;
}) {
  const [query, setQuery] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const filtered = allStops.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) && !stops.some(x => x.stop_id === s.id)
  ).slice(0, 8);

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = stops.findIndex(s => s.stop_id === e.active.id);
    const newIdx = stops.findIndex(s => s.stop_id === e.over!.id);
    setStops(arrayMove(stops, oldIdx, newIdx));
  };

  const addStop = (id: string) => {
    setStops([...stops, { stop_id: id, travel_time_to_next_min: 1 }]);
    setQuery("");
  };

  const totalMin = stops.slice(0, -1).reduce((acc, s) => acc + (s.travel_time_to_next_min || 0), 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground">{stops.length} przystanków · {totalMin} min</span>
      </div>

      <div className="mb-3 relative">
        <Input
          placeholder="Szukaj przystanku lub wpisz nowy…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-md shadow-md max-h-64 overflow-y-auto">
            {filtered.map(s => (
              <button key={s.id} onClick={() => addStop(s.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
                {s.name}
              </button>
            ))}
            {!filtered.some(s => s.name.toLowerCase() === query.toLowerCase()) && (
              <button
                onClick={async () => { const s = await onCreateStop(query); addStop(s.id); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-t border-border text-primary"
              >
                + Utwórz przystanek „{query}"
              </button>
            )}
          </div>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map(s => s.stop_id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {stops.map((s, i) => (
              <SortableStop
                key={s.stop_id}
                id={s.stop_id}
                name={stopMap.get(s.stop_id) ?? "?"}
                isLast={i === stops.length - 1}
                travel={s.travel_time_to_next_min}
                onTravelChange={(v) => {
                  const next = [...stops];
                  next[i] = { ...next[i], travel_time_to_next_min: v };
                  setStops(next);
                }}
                onRemove={() => setStops(stops.filter((_, idx) => idx !== i))}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {stops.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">Brak przystanków — dodaj pierwszy powyżej.</p>
      )}
    </div>
  );
}

function SortableStop({ id, name, isLast, travel, onTravelChange, onRemove }: {
  id: string; name: string; isLast: boolean; travel: number;
  onTravelChange: (v: number) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-background border border-border rounded-md p-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="size-4" />
      </button>
      <span className="flex-1 text-sm truncate">{name}</span>
      {!isLast && (
        <div className="flex items-center gap-1 text-xs">
          <Input type="number" min={0} value={travel} onChange={(e) => onTravelChange(Number(e.target.value))} className="h-7 w-16" />
          <span className="text-muted-foreground">min</span>
        </div>
      )}
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
