import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listLog } from "@/lib/ops.functions";

export const Route = createFileRoute("/_authenticated/admin/dziennik")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dziennik dyspozytorski — STP" }] }),
  component: LogbookPage,
});

function LogbookPage() {
  const fn = useServerFn(listLog);
  const { data } = useQuery({ queryKey: ["dispatcher-log"], queryFn: () => fn({ data: { limit: 300 } }) });
  const rows = (data ?? []) as any[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dziennik dyspozytorski</h1>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Czas</th>
              <th className="px-4 py-3 text-left">Dyspozytor</th>
              <th className="px-4 py-3 text-left">Akcja</th>
              <th className="px-4 py-3 text-left">Cel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Brak wpisów.</td></tr>}
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 text-xs font-mono">{new Date(l.created_at).toLocaleString("pl-PL")}</td>
                <td className="px-4 py-2">{l.actor?.full_name ?? "—"}</td>
                <td className="px-4 py-2">{l.action}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground font-mono">{l.target_label ?? l.target_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
