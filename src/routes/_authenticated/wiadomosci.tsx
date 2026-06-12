import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  listMyInbox,
  markMessageRead,
  getMyPresence,
  setMyPresence,
  sendDriverMessage,
  listMyOutbox,
} from "@/lib/ops.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/wiadomosci")({
  ssr: false,
  head: () => ({ meta: [{ title: "Komunikacja — Portal STP" }] }),
  component: InboxPage,
});

const KINDS: Record<string, string> = {
  announcement: "Ogłoszenie",
  urgent: "Pilne",
  service_change: "Zmiana",
  diversion: "Objazd",
  driver_message: "Od kierowcy",
};
const PRES: Record<string, string> = {
  active: "Aktywny",
  break: "Przerwa",
  unavailable: "Niedostępny",
  offline: "Offline",
};

function InboxPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyInbox);
  const readFn = useServerFn(markMessageRead);
  const presFn = useServerFn(getMyPresence);
  const setPresFn = useServerFn(setMyPresence);
  const sendFn = useServerFn(sendDriverMessage);
  const outboxFn = useServerFn(listMyOutbox);

  const { data } = useQuery({
    queryKey: ["inbox"],
    queryFn: () => listFn(),
    refetchInterval: 30000,
  });
  const { data: presence } = useQuery({
    queryKey: ["my-presence"],
    queryFn: () => presFn(),
  });
  const { data: outbox } = useQuery({
    queryKey: ["my-outbox"],
    queryFn: () => outboxFn(),
  });
  const rows = (data ?? []) as any[];
  const sent = (outbox ?? []) as any[];

  const [compose, setCompose] = useState({ subject: "", body: "" });
  const [sending, setSending] = useState(false);

  const mark = async (id: string) => {
    await readFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["inbox"] });
  };
  const setStatus = async (status: string) => {
    await setPresFn({ data: { status: status as any } });
    qc.invalidateQueries({ queryKey: ["my-presence"] });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compose.subject.trim() || !compose.body.trim()) {
      toast.error("Temat i treść są wymagane");
      return;
    }
    setSending(true);
    try {
      const r = (await sendFn({ data: compose })) as any;
      toast.success(`Wysłano do ${r.recipientCount} dyspozytorów`);
      setCompose({ subject: "", body: "" });
      qc.invalidateQueries({ queryKey: ["my-outbox"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Błąd wysyłki");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
            Mój status
          </h2>
          <p className="text-sm mt-1">Widoczny dla dyspozytora.</p>
        </div>
        <Select
          value={(presence as any)?.status ?? "offline"}
          onValueChange={setStatus}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRES).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h1 className="text-2xl font-bold">Komunikacja</h1>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">Odebrane ({rows.length})</TabsTrigger>
          <TabsTrigger value="compose">Napisz do dyspozytora</TabsTrigger>
          <TabsTrigger value="sent">Wysłane ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-2 mt-4">
          {rows.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
              Brak wiadomości.
            </div>
          )}
          {rows.map((r) => {
            const m = r.message;
            if (!m) return null;
            return (
              <article
                key={r.id}
                className={
                  "bg-card border rounded-xl p-4 shadow-sm " +
                  (r.read_at ? "border-border opacity-70" : "border-primary/40")
                }
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={m.kind === "urgent" ? "destructive" : "secondary"}>
                    {KINDS[m.kind] ?? m.kind}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pl-PL")}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    od {m.author?.full_name ?? "—"}
                  </span>
                </div>
                <h3 className="font-bold mb-1">{m.subject}</h3>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {m.body}
                </p>
                {!r.read_at && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => mark(r.id)}
                  >
                    Oznacz jako przeczytane
                  </Button>
                )}
              </article>
            );
          })}
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <form
            onSubmit={submit}
            className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Wiadomość trafi do wszystkich dyspozytorów na służbie.
            </p>
            <div className="space-y-1">
              <Label>Temat</Label>
              <Input
                value={compose.subject}
                onChange={(e) =>
                  setCompose({ ...compose, subject: e.target.value })
                }
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label>Treść</Label>
              <Textarea
                rows={6}
                value={compose.body}
                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                maxLength={5000}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={sending}>
                {sending ? "Wysyłanie…" : "Wyślij"}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="sent" className="space-y-2 mt-4">
          {sent.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-sm text-muted-foreground">
              Brak wysłanych wiadomości.
            </div>
          )}
          {sent.map((m) => (
            <article
              key={m.id}
              className="bg-card border border-border rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary">{KINDS[m.kind] ?? m.kind}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("pl-PL")}
                </span>
              </div>
              <h3 className="font-bold mb-1">{m.subject}</h3>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {m.body}
              </p>
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
