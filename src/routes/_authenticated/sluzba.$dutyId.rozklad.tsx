import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, ArrowRight, Clock, Bus, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LINE_PRESETS, parseRouteLines, buildSchedule, getLinePreset } from "@/lib/line-presets";
import { getDutyTimetable } from "@/lib/planning.functions";
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

const DAY_LABEL: Record<string, string> = {
  weekday: "Dzień roboczy",
  saturday: "Sobota",
  sunday: "Niedziela / święto",
};

function RozkladPage() {
  const { dutyId } = Route.useParams();
  const { route, start } = Route.useSearch();

  const fn = useServerFn(getDutyTimetable);
  const { data, isLoading } = useQuery({
    queryKey: ["duty-timetable", dutyId],
    queryFn: () => fn({ data: { duty_id: dutyId } }),
  });

  const trips = (data?.trips ?? []) as any[];
  const lines = (data?.lines ?? []) as any[];
  const block = data?.block;
  const lineById = new Map(lines.map((l) => [l.id, l]));

  const presetLines = route ? parseRouteLines(route).filter((l) => getLinePreset(l)) : [];
  const showPreset = trips.length === 0 && presetLines.length > 0 && !!start;

  return (
    <div className="space-y-4">
      <Link to="/grafik">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="size-4 mr-1" /> Wróć do grafiku
        </Button>
      </Link>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-brand" />
            <h2 className="text-xl font-bold">Rozkład jazdy</h2>
          </div>
          {data?.dayType && (
            <Badge variant="secondary" className="text-xs">{DAY_LABEL[data.dayType]}</Badge>
          )}
        </div>

        {data?.duty && (
          <p className="text-sm text-muted-foreground">
            Służba <span className="font-mono font-bold">{data.duty.route}/{data.duty.duty_number}</span>
            {" · "}
            {data.duty.duty_date}
            {" · "}
            <span className="font-mono">
              {data.duty.start_time?.slice(0, 5)}–{data.duty.end_time?.slice(0, 5)}
            </span>
          </p>
        )}

        {isLoading && (
          <div className="text-sm text-muted-foreground py-8 text-center">Ładowanie rozkładu…</div>
        )}

        {/* Real generated trips */}
        {trips.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bus className="size-3.5" />
              <span>{trips.length} kursów w brygadzie</span>
              {block && (
                <span className="font-mono">
                  · {block.start_time?.slice(0, 5)}–{block.end_time?.slice(0, 5)}
                </span>
              )}
            </div>
            <ol className="border border-border rounded-lg divide-y divide-border overflow-hidden">
              {trips.map((t) => {
                const line = lineById.get(t.line_id);
                const from = line ? (t.direction === "AB" ? line.terminus_a : line.terminus_b) : "?";
                const to = line ? (t.direction === "AB" ? line.terminus_b : line.terminus_a) : "?";
                return (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="inline-flex items-center justify-center min-w-10 px-2 h-6 rounded-md bg-brand text-brand-foreground font-bold text-xs">
                      {t.line_number}
                    </span>
                    <span className="font-mono text-muted-foreground w-12 tabular-nums">
                      {String(t.departure_time).slice(0, 5)}
                    </span>
                    <span className="truncate flex-1">{from}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{to}</span>
                    <span className="font-mono text-muted-foreground w-12 tabular-nums text-right hidden sm:inline">
                      {String(t.arrival_time).slice(0, 5)}
                    </span>
                    <Clock className="size-3.5 text-muted-foreground hidden sm:inline" />
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Fallback: preset schedule from line-presets */}
        {!isLoading && trips.length === 0 && showPreset && (
          <div className="space-y-6">
            <div className="bg-muted/40 border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground">
              Brak wygenerowanego rozkładu dla tej brygady — pokazujemy szablon przystanków linii.
            </div>
            {presetLines.map((line) => {
              const schedule = buildSchedule(line, start!);
              if (!schedule) return null;
              return (
                <div key={line} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center min-w-12 px-2 h-7 rounded-md bg-brand text-brand-foreground font-bold text-sm">{line}</span>
                    <span className="text-xs text-muted-foreground">
                      {schedule.length} przystanków · ~{schedule.length - 1} min
                    </span>
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
        )}

        {/* Nothing at all */}
        {!isLoading && trips.length === 0 && !showPreset && (
          <div className="space-y-3">
            <div className="bg-muted/40 border border-dashed border-border rounded-lg p-4 text-sm text-muted-foreground">
              Brak rozkładu dla tej służby. Dyspozytor może wygenerować brygady w
              panelu <span className="font-mono">Planowanie sieci → Brygady</span>,
              a następnie utworzyć z nich służby.
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
                Dostępne linie (szablony)
              </div>
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
