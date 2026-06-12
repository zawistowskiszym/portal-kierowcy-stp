import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listUnassignedDuties, listDrivers, assignDriverToDuty } from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/nieprzydzielone")({
  head: () => ({ meta: [{ title: "Nieprzydzielone służby — Admin STP" }] }),
  component: UnassignedPage,
});

function UnassignedPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUnassignedDuties);
  const driversFn = useServerFn(listDrivers);
  const assignFn = useServerFn(assignDriverToDuty);

  const { data: duties } = useQuery({ queryKey: ["unassigned"], queryFn: () => listFn({ data: {} }) });
  const { data: drivers } = useQuery({ queryKey: ["drivers-active"], queryFn: () => driversFn() });

  const [pending, setPending] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["unassigned"] });

  const assign = async (dutyId: string, driverId: string) => {
    setPending(dutyId);
    try {
      const res: any = await assignFn({ data: { dutyId, driverId } });
      if (!res?.ok) {
        const msgs = (res?.warnings ?? []).map((w: any) => w.msg).join("\n");
        if (confirm(`Konflikty:\n${msgs}\n\nPrzydzielić mimo to?`)) {
          await assignFn({ data: { dutyId, driverId, force: true } });
        } else { return; }
      }
      toast.success("Przydzielono");
      refresh();
    } catch (err: any) { toast.error(err?.message); }
    finally { setPending(null); }
  };

  const rows = (duties ?? []) as any[];
  const drvs = (drivers ?? []) as any[];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="size-5 text-destructive" /> Nieprzydzielone służby</h2>
        <p className="text-sm text-muted-foreground">Służby od dziś bez przypisanego kierowcy. Wybierz osobę, aby błyskawicznie przydzielić.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] font-bold">
            <tr>
              <th className="px-4 py-3 text-left">Nr</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Godziny</th>
              <th className="px-4 py-3 text-left">Linia</th>
              <th className="px-4 py-3 text-left">Zajezdnia</th>
              <th className="px-4 py-3 text-left">Priorytet</th>
              <th className="px-4 py-3 text-right">Przydziel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-mono text-xs font-bold">{d.duty_number}</td>
                <td className="px-4 py-3 font-mono">{d.duty_date}</td>
                <td className="px-4 py-3 font-mono">{d.start_time?.slice(0,5)} — {d.end_time?.slice(0,5)}</td>
                <td className="px-4 py-3">{d.route}</td>
                <td className="px-4 py-3">{d.depot}</td>
                <td className="px-4 py-3">
                  <Badge variant={d.priority === "high" ? "destructive" : d.priority === "low" ? "secondary" : "outline"}>
                    {d.priority === "high" ? "Wysoki" : d.priority === "low" ? "Niski" : "Normalny"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Select disabled={pending === d.id} onValueChange={(v) => assign(d.id, v)}>
                    <SelectTrigger className="w-48 inline-flex"><SelectValue placeholder="Wybierz kierowcę..." /></SelectTrigger>
                    <SelectContent>
                      {drvs.map((dr) => (
                        <SelectItem key={dr.id} value={dr.id}>{dr.full_name} {dr.employee_id ? `(${dr.employee_id})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Brak nieprzydzielonych służb. 🎉</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
