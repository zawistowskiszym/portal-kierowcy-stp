import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LINE_PRESETS, parseRouteLines, buildSchedule, getLinePreset } from "@/lib/line-presets";
import { z } from "zod";

const searchSchema = z.object({
  route: z.string().optional(),
  start: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/sluzba/$dutyId/rozklad")({
  head: () => ({ meta: [{ title: "Rozkład jazdy — Portal STP" }] }),
  validateSearch: searchSchema,
  component: RozkladPage,
});

function RozkladPage() {
  const { dutyId } = Route.useParams();
  const { route, start } = Route.useSearch();

  const lines = route ? parseRouteLines(route).filter((l) => getLinePreset(l)) : [];
  const hasContext = lines.length > 0 && !!start;

  return (
    <div className="space-y-4">
      <Link to="/grafik"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" /> Wróć do grafiku</Button></Link>
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-brand" />
          <h2 className="text-xl font-bold">Rozkład jazdy</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Służba ID: <span className="font-mono">{dutyId}</span>
          {route && <> · Linia: <span className="font-mono">{route}</span></>}
          {start && <> · Start: <span className="font-mono">{start}</span></>}
        </p>

        {hasContext ? (
          <div className="space-y-6">
            {lines.map((line) => {
              const schedule = buildSchedule(line, start!);
              if (!schedule) return null;
              return (
                <div key={line} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center min-w-12 px-2 h-7 rounded-md bg-brand text-brand-foreground font-bold text-sm">{line}</span>
                    <span className="text-xs text-muted-foreground">{schedule.length} przystanków · ~{schedule.length - 1} min</span>
                  </div>
                  <ol className="border border-border rounded-lg divide-y divide-border overflow-hidden">
                    {schedule.map((s, i) => (
                      <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="font-mono text-muted-foreground w-12">{s.time}</span>
                        <MapPin className="size-3.5 text-brand shrink-0" />
                        <span className="truncate">{s.stop}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted/40 border border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground">
              Aby wyświetlić rozkład jazdy dla tej służby, otwórz ją z grafiku — parametry <span className="font-mono">?route=…&amp;start=HH:MM</span> wczytają przystanki z presetu linii.
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">Dostępne linie</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {LINE_PRESETS.map((p) => (
                  <div key={p.line} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center min-w-10 px-2 h-6 rounded-md bg-brand text-brand-foreground font-bold text-xs">{p.line}</span>
                      <span className="text-xs text-muted-foreground">{p.stops.length} przystanków</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{p.stops[0]} → {p.stops[p.stops.length - 1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
