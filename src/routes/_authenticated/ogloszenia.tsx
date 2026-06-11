import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAnnouncements } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ogloszenia")({
  head: () => ({ meta: [{ title: "Ogłoszenia — Portal STP" }] }),
  component: OgloszeniaPage,
});

const CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "operations", label: "Operacje" },
  { value: "service_changes", label: "Zmiany w kursowaniu" },
  { value: "events", label: "Wydarzenia" },
  { value: "training", label: "Szkolenia" },
  { value: "general", label: "Ogólne" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.filter((c) => c.value !== "all").map((c) => [c.value, c.label]),
);

function OgloszeniaPage() {
  const fn = useServerFn(listAnnouncements);
  const { data } = useQuery({ queryKey: ["announcements"], queryFn: () => fn() });
  const [filter, setFilter] = useState<string>("all");

  const list = useMemo(() => {
    const base = ((data ?? []) as any[]).filter((a) => !a.archived);
    return filter === "all" ? base : base.filter((a) => a.category === filter);
  }, [data, filter]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Ogłoszenia firmowe</h2>
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setFilter(c.value)}
              className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border transition ${
                filter === c.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Brak ogłoszeń w wybranej kategorii.
        </div>
      )}
      {list.map((a) => (
        <article key={a.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-bold text-base">{a.title}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {new Date(a.published_at).toLocaleString("pl-PL")}
              </p>
            </div>
            <Badge variant="outline">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{a.body}</p>
        </article>
      ))}
    </div>
  );
}
