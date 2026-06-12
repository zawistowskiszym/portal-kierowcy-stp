import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type Status = "new" | "reviewing" | "accepted" | "rejected";

type Application = {
  id: string;
  email: string;
  roblox_username: string;
  discord_username: string | null;
  motivation: string;
  experience: string | null;
  status: Status;
  reviewer_notes: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Status, string> = {
  new: "Nowe",
  reviewing: "W trakcie",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
};

const STATUS_VARIANT: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  reviewing: "secondary",
  accepted: "outline",
  rejected: "destructive",
};

export const Route = createFileRoute("/_authenticated/admin/kandydaci")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const allowed = (roles ?? []).some(
      (r: any) => r.role === "admin" || r.role === "dyspozytor",
    );
    if (!allowed) throw redirect({ to: "/pulpit" });
  },
  head: () => ({ meta: [{ title: "Kandydaci — Admin STP" }] }),
  component: AdminCandidatesPage,
});

function AdminCandidatesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Application | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("new");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "recruitment", filter],
    queryFn: async () => {
      let q = supabase
        .from("recruitment_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "recruitment"] });

  const openDetails = (app: Application) => {
    setSelected(app);
    setNotes(app.reviewer_notes ?? "");
    setStatus(app.status);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("recruitment_applications")
      .update({
        status,
        reviewer_notes: notes || null,
        reviewed_by: u.user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("Nie udało się zapisać");
      return;
    }
    toast.success("Zapisano");
    setSelected(null);
    refresh();
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm("Usunąć to zgłoszenie?")) return;
    const { error } = await supabase
      .from("recruitment_applications")
      .delete()
      .eq("id", selected.id);
    if (error) {
      toast.error("Brak uprawnień lub błąd");
      return;
    }
    toast.success("Usunięto");
    setSelected(null);
    refresh();
  };

  const apps = data ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Kandydaci</h1>
          <p className="text-sm text-muted-foreground">
            Zgłoszenia rekrutacyjne z formularza publicznego.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="new">Nowe</SelectItem>
            <SelectItem value="reviewing">W trakcie</SelectItem>
            <SelectItem value="accepted">Zaakceptowane</SelectItem>
            <SelectItem value="rejected">Odrzucone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-x-auto">
        {apps.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Brak zgłoszeń.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Roblox</th>
                <th className="text-left p-3">Discord</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="p-3">{a.email}</td>
                  <td className="p-3">{a.roblox_username}</td>
                  <td className="p-3 text-muted-foreground">{a.discord_username ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[a.status]}>{STATUS_LABEL[a.status]}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openDetails(a)}>
                      Szczegóły
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Zgłoszenie kandydata</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" value={selected.email} />
                <Field label="Roblox" value={selected.roblox_username} />
                <Field label="Discord" value={selected.discord_username ?? "—"} />
                <Field
                  label="Data zgłoszenia"
                  value={new Date(selected.created_at).toLocaleString("pl-PL")}
                />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Dlaczego chce dołączyć
                </div>
                <div className="rounded-lg bg-muted/30 p-3 whitespace-pre-wrap">
                  {selected.motivation}
                </div>
              </div>

              {selected.experience && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Doświadczenie
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3 whitespace-pre-wrap">
                    {selected.experience}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Status
                  </div>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nowe</SelectItem>
                      <SelectItem value="reviewing">W trakcie</SelectItem>
                      <SelectItem value="accepted">Zaakceptowane</SelectItem>
                      <SelectItem value="rejected">Odrzucone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Notatki rekrutera
                </div>
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={remove}>Usuń</Button>
            <Button variant="outline" onClick={() => setSelected(null)}>Anuluj</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
