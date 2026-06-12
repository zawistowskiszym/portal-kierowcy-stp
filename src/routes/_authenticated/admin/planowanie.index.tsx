import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { planningDashboard } from "@/lib/planning.functions";
import { Waypoints, ClipboardList, Truck, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/planowanie/")({
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(planningDashboard);
  const [lineId, setLineId] = useState<string>("");
  const [dayType, setDayType] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["planning-dashboard", lineId, dayType],
    queryFn: () =>
      fn({
        data: {
          line_id: lineId || undefined,
          day_type: (dayType || undefined) as any,
        },
      }),
  });

  const lines = data?.lines ?? [];
  const tts = data?.timetables ?? [];
  const blocks = data?.blocks ?? [];
  const duties = data?.duties ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Wszystkie linie</option>
          {lines.map((l: any) => (
            <option key={l.id} value={l.id}>
              Linia {l.line_number}
            </option>
          ))}
        </select>
        <select
          value={dayType}
          onChange={(e) => setDayType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Każdy typ dnia</option>
          <option value="weekday">Dzień roboczy</option>
          <option value="saturday">Sobota</option>
          <option value="sunday">Niedziela / święto</option>
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Waypoints} label="Linie" value={lines.length} />
        <Stat icon={ClipboardList} label="Rozkłady" value={tts.length} />
        <Stat icon={Truck} label="Aktywne brygady" value={blocks.length} />
        <Stat icon={Users} label="Pojazdy potrzebne" value={blocks.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Brygady">
          {blocks.length === 0 ? (
            <Empty text="Brak brygad — wygeneruj w zakładce Brygady." />
          ) : (
            <div className="divide-y divide-border">
              {blocks.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono font-bold">
                    {(b.line_numbers as string[]).join("+")}/{b.block_number}
                  </span>
                  <span className="text-muted-foreground">
                    {b.start_time?.slice(0, 5)}–{b.end_time?.slice(0, 5)} · {b.day_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Służby dziś">
          {duties.length === 0 ? (
            <Empty text="Brak służb wygenerowanych na dziś." />
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {duties.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-mono">{d.route}/{d.duty_number}</span>
                  <span className="text-muted-foreground">
                    {d.start_time?.slice(0, 5)}–{d.end_time?.slice(0, 5)} · {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="text-3xl font-bold font-mono mt-1">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-bold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{text}</p>;
}
