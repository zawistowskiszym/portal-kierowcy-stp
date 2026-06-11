import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAnnouncements } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/ogloszenia")({
  head: () => ({ meta: [{ title: "Ogłoszenia — Portal STP" }] }),
  component: OgloszeniaPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  operations: "Operacje",
  service_changes: "Zmiany w kursowaniu",
  events: "Wydarzenia",
  training: "Szkolenia",
  general: "Ogólne",
};

function OgloszeniaPage() {
  const fn = useServerFn(listAnnouncements);
  const { data } = useQuery({ queryKey: ["announcements"], queryFn: () => fn() });
  const list = ((data ?? []) as any[]).filter((a) => !a.archived);

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-bold">Ogłoszenia firmowe</h2>
      {list.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Brak ogłoszeń.
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
