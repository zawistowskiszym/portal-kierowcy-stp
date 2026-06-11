import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMyDutiesInRange } from "@/lib/portal.functions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/grafik")({
  head: () => ({ meta: [{ title: "Mój grafik — Portal STP" }] }),
  component: GrafikPage,
});

const PL_MONTHS = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];
const PL_DOW = ["Pn","Wt","Śr","Cz","Pt","Sb","Nd"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function isoDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

function GrafikPage() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const { from, to } = monthRange(cursor.y, cursor.m);
  const fn = useServerFn(getMyDutiesInRange);
  const { data } = useQuery({
    queryKey: ["grafik", from, to],
    queryFn: () => fn({ data: { from, to } }),
  });
  const duties = (data ?? []) as any[];
  const byDate = new Map<string, any[]>();
  for (const d of duties) {
    const arr = byDate.get(d.duty_date) ?? [];
    arr.push(d);
    byDate.set(d.duty_date, arr);
  }

  const firstDay = new Date(cursor.y, cursor.m, 1);
  // Monday-first index
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: { date: Date | null; iso?: string }[] = [];
  for (let i = 0; i < startOffset; i++) cells.push({ date: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(cursor.y, cursor.m, day);
    cells.push({ date: d, iso: isoDate(d) });
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="kalendarz" className="w-full">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="kalendarz">Kalendarz</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })}>
              <ChevronLeft className="size-4" />
            </Button>
            <div className="text-sm font-semibold w-44 text-center">
              {PL_MONTHS[cursor.m]} {cursor.y}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="kalendarz" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {PL_DOW.map((d) => (
                <div key={d} className="text-[10px] font-bold uppercase text-muted-foreground text-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {cells.map((c, idx) => {
                if (!c.date) return <div key={idx} className="aspect-square" />;
                const items = c.iso ? byDate.get(c.iso) ?? [] : [];
                const isToday = isoDate(new Date()) === c.iso;
                return (
                  <div key={idx} className={`aspect-square border border-border rounded-md p-1.5 flex flex-col gap-1 ${isToday ? "ring-2 ring-brand-accent" : ""}`}>
                    <div className="text-xs font-mono font-semibold">{c.date.getDate()}</div>
                    {items.slice(0, 2).map((d) => (
                      <div key={d.id} className="text-[10px] bg-brand/10 text-brand rounded px-1 py-0.5 truncate font-mono">
                        {d.start_time.slice(0,5)} {d.route}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{items.length - 2}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Nr</th>
                  <th className="px-6 py-3">Godziny</th>
                  <th className="px-6 py-3">Linia</th>
                  <th className="px-6 py-3">Pojazd</th>
                  <th className="px-6 py-3">Zajezdnia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {duties.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Brak służb w tym miesiącu.</td></tr>
                )}
                {duties.map((d) => (
                  <tr key={d.id}>
                    <td className="px-6 py-3 font-medium">{d.duty_date}</td>
                    <td className="px-6 py-3 font-mono text-xs">{d.duty_number}</td>
                    <td className="px-6 py-3 font-mono">{d.start_time.slice(0,5)} — {d.end_time.slice(0,5)}</td>
                    <td className="px-6 py-3">{d.route}</td>
                    <td className="px-6 py-3 font-mono text-xs">{d.vehicle_label ?? "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground">{d.depot}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
