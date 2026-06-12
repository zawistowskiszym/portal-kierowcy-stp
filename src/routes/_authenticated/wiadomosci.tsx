import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyInbox, markMessageRead, getMyPresence, setMyPresence } from "@/lib/ops.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/wiadomosci")({
  ssr: false,
  head: () => ({ meta: [{ title: "Wiadomości — Portal STP" }] }),
  component: InboxPage,
});

const KINDS: Record<string, string> = {
  announcement: "Ogłoszenie", urgent: "Pilne", service_change: "Zmiana", diversion: "Objazd",
};
const PRES: Record<string, string> = { active: "Aktywny", break: "Przerwa", unavailable: "Niedostępny", offline: "Offline" };

function InboxPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyInbox);
  const readFn = useServerFn(markMessageRead);
  const presFn = useServerFn(getMyPresence);
  const setPresFn = useServerFn(setMyPresence);

  const { data } = useQuery({ queryKey: ["inbox"], queryFn: () => listFn(), refetchInterval: 30000 });
  const { data: presence } = useQuery({ queryKey: ["my-presence"], queryFn: () => presFn() });
  const rows = (data ?? []) as any[];

  const mark = async (id: string) => {
    await readFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };
  const setStatus = async (status: string) => {
    await setPresFn({ data: { status: status as any } });
    qc.invalidateQueries({ queryKey: ["my-presence"] });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Mój status</h2>
          <p className="text-sm mt-1">Widoczny dla dyspozytora.</p>
        </div>
        <Select value={(presence as any)?.status ?? "offline"} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(PRES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <h1 className="text-2xl font-bold mb-3">Wiadomości</h1>
        <div className="space-y-2">
          {rows.length === 0 && <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">Brak wiadomości.</div>}
          {rows.map((r) => {
            const m = r.message;
            return (
              <article key={r.id} className={"bg-card border rounded-xl p-4 shadow-sm " + (r.read_at ? "border-border opacity-70" : "border-primary/40")}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={m.kind === "urgent" ? "destructive" : "secondary"}>{KINDS[m.kind] ?? m.kind}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("pl-PL")}</span>
                  <span className="text-xs text-muted-foreground ml-auto">od {m.author?.full_name ?? "—"}</span>
                </div>
                <h3 className="font-bold mb-1">{m.subject}</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{m.body}</p>
                {!r.read_at && <Button size="sm" variant="outline" className="mt-3" onClick={() => mark(r.id)}>Oznacz jako przeczytane</Button>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
