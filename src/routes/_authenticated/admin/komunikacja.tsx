import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { sendMessage, listSentMessages, listAllDrivers, listMyInbox, markMessageRead } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/komunikacja")({
  ssr: false,
  head: () => ({ meta: [{ title: "Komunikacja — STP" }] }),
  component: CommsPage,
});

const KINDS: Record<string, string> = {
  announcement: "Ogłoszenie", urgent: "Alert pilny", service_change: "Zmiana w obsłudze", diversion: "Objazd",
};

function CommsPage() {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendMessage);
  const listFn = useServerFn(listSentMessages);
  const driversFn = useServerFn(listAllDrivers);

  const [form, setForm] = useState({
    kind: "announcement", subject: "", body: "",
    audience_kind: "all_drivers", audience: [] as string[], audienceText: "",
  });

  const { data: sent } = useQuery({ queryKey: ["msgs", "sent"], queryFn: () => listFn() });
  const { data: drivers } = useQuery({ queryKey: ["all-drivers"], queryFn: () => driversFn() });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) { toast.error("Temat i treść są wymagane"); return; }
    let audience: string[] = [];
    if (form.audience_kind === "drivers") audience = form.audience;
    else if (["routes", "vehicles", "divisions"].includes(form.audience_kind)) {
      audience = form.audienceText.split(",").map((s) => s.trim()).filter(Boolean);
    }
    try {
      const r = await sendFn({ data: { kind: form.kind as any, subject: form.subject, body: form.body, audience_kind: form.audience_kind as any, audience } });
      toast.success(`Wysłano do ${(r as any).recipientCount} odbiorców`);
      setForm({ kind: "announcement", subject: "", body: "", audience_kind: "all_drivers", audience: [], audienceText: "" });
      qc.invalidateQueries({ queryKey: ["msgs"] });
    } catch (e: any) { toast.error(e?.message ?? "Błąd"); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Komunikacja wewnętrzna</h1>

      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 max-w-3xl">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Typ komunikatu</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Odbiorcy</Label>
            <Select value={form.audience_kind} onValueChange={(v) => setForm({ ...form, audience_kind: v, audience: [], audienceText: "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_drivers">Wszyscy kierowcy</SelectItem>
                <SelectItem value="drivers">Wybrani kierowcy</SelectItem>
                <SelectItem value="routes">Grupy linii</SelectItem>
                <SelectItem value="vehicles">Grupy pojazdów</SelectItem>
                <SelectItem value="divisions">Zajezdnie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.audience_kind === "drivers" && (
          <div className="space-y-1">
            <Label>Wybierz kierowców</Label>
            <select multiple className="w-full border border-input bg-background rounded-md p-2 h-32 text-sm"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
              {((drivers ?? []) as any[]).map((d) => <option key={d.id} value={d.id}>{d.full_name} {d.employee_id ? `(${d.employee_id})` : ""}</option>)}
            </select>
          </div>
        )}
        {["routes", "vehicles", "divisions"].includes(form.audience_kind) && (
          <div className="space-y-1">
            <Label>{form.audience_kind === "routes" ? "Linie (po przecinku)" : form.audience_kind === "vehicles" ? "ID pojazdów (po przecinku)" : "Zajezdnie (po przecinku)"}</Label>
            <Input value={form.audienceText} onChange={(e) => setForm({ ...form, audienceText: e.target.value })} placeholder={form.audience_kind === "routes" ? "1, 7, 14" : ""} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Temat</Label>
          <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Treść</Label>
          <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant={form.kind === "urgent" ? "destructive" : "default"}>Wyślij komunikat</Button>
        </div>
      </form>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2">Historia wysłanych</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Typ</th>
                <th className="px-4 py-3 text-left">Temat</th>
                <th className="px-4 py-3 text-left">Autor</th>
                <th className="px-4 py-3 text-left">Audytorium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {((sent ?? []) as any[]).length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Brak komunikatów.</td></tr>}
              {((sent ?? []) as any[]).map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-xs">{new Date(m.created_at).toLocaleString("pl-PL")}</td>
                  <td className="px-4 py-2"><Badge variant={m.kind === "urgent" ? "destructive" : "secondary"}>{KINDS[m.kind] ?? m.kind}</Badge></td>
                  <td className="px-4 py-2 font-medium">{m.subject}</td>
                  <td className="px-4 py-2">{m.author?.full_name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{m.audience_kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
