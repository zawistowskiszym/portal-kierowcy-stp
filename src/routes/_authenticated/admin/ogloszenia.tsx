import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/admin/ogloszenia")({
  head: () => ({ meta: [{ title: "Ogłoszenia — Admin STP" }] }),
  component: AdminAnnPage,
});

const CATEGORIES = [
  { value: "operations", label: "Operacje" },
  { value: "service_changes", label: "Zmiany w kursowaniu" },
  { value: "events", label: "Wydarzenia" },
  { value: "training", label: "Szkolenia" },
  { value: "general", label: "Ogólne" },
];

function AdminAnnPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAnnouncements);
  const createFn = useServerFn(createAnnouncement);
  const updateFn = useServerFn(updateAnnouncement);
  const delFn = useServerFn(deleteAnnouncement);

  const { data } = useQuery({ queryKey: ["admin", "ann"], queryFn: () => listFn() });
  const list = (data ?? []) as any[];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "ann"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
    qc.invalidateQueries({ queryKey: ["pulpit", "ann"] });
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFn({ data: form as any });
      toast.success("Opublikowano");
      setOpen(false);
      setForm({ title: "", body: "", category: "general" });
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  const onArchive = async (a: any) => {
    try { await updateFn({ data: { id: a.id, archived: !a.archived } }); refresh(); }
    catch (err: any) { toast.error(err?.message); }
  };

  const onDelete = async (a: any) => {
    if (!confirm(`Usunąć ogłoszenie "${a.title}"?`)) return;
    try { await delFn({ data: { id: a.id } }); refresh(); toast.success("Usunięto"); }
    catch (err: any) { toast.error(err?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Ogłoszenia</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button>+ Nowe ogłoszenie</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nowe ogłoszenie</DialogTitle></DialogHeader>
            <form onSubmit={onCreate} className="space-y-3">
              <div className="space-y-1"><Label>Tytuł</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Kategoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Treść</Label><Textarea required rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <DialogFooter><Button type="submit">Opublikuj</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">Brak ogłoszeń.</div>
        )}
        {list.map((a) => (
          <div key={a.id} className={`bg-card border border-border rounded-xl p-4 ${a.archived ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{a.title}</h3>
                  <Badge variant="outline">{CATEGORIES.find(c => c.value === a.category)?.label ?? a.category}</Badge>
                  {a.archived && <Badge variant="secondary">Zarchiwizowane</Badge>}
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-2">{new Date(a.published_at).toLocaleString("pl-PL")}</p>
                <p className="text-sm whitespace-pre-line">{a.body}</p>
              </div>
              <div className="space-y-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => onArchive(a)}>{a.archived ? "Przywróć" : "Archiwizuj"}</Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(a)}>Usuń</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
