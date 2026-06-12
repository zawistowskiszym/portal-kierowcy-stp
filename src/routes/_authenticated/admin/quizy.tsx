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

type Status = "pending" | "submitted";

type Attempt = {
  id: string;
  token: string;
  candidate_email: string;
  questions: string[];
  answers: string[] | null;
  status: Status;
  started_at: string;
  submitted_at: string | null;
  reviewer_notes: string | null;
};

export const Route = createFileRoute("/_authenticated/admin/quizy")({
  ssr: false,
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin");
    if (!allowed) throw redirect({ to: "/pulpit" });
  },
  head: () => ({ meta: [{ title: "Quizy kandydatów — Admin STP" }] }),
  component: AdminQuizzesPage,
});

function AdminQuizzesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("submitted");
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["admin", "quiz-attempts", filter],
    queryFn: async () => {
      let q = supabase
        .from("quiz_attempts")
        .select(
          "id, token, candidate_email, questions, answers, status, started_at, submitted_at, reviewer_notes",
        )
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Attempt[];
    },
  });

  const open = (a: Attempt) => {
    setSelected(a);
    setNotes(a.reviewer_notes ?? "");
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("quiz_attempts")
      .update({
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
    qc.invalidateQueries({ queryKey: ["admin", "quiz-attempts"] });
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirm("Usunąć tę próbę?")) return;
    const { error } = await supabase
      .from("quiz_attempts")
      .delete()
      .eq("id", selected.id);
    if (error) {
      toast.error("Brak uprawnień lub błąd");
      return;
    }
    toast.success("Usunięto");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["admin", "quiz-attempts"] });
  };

  const items = data ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Quizy kandydatów</h1>
          <p className="text-sm text-muted-foreground">
            Otwarte odpowiedzi z quizu wprowadzającego (15 pytań losowo z puli).
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Status | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="pending">Wysłane, nieukończone</SelectItem>
            <SelectItem value="submitted">Ukończone</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Brak prób.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Rozpoczęto</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Ukończono</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3 text-muted-foreground">
                    {new Date(a.started_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="p-3">{a.candidate_email}</td>
                  <td className="p-3">
                    <Badge variant={a.status === "submitted" ? "outline" : "secondary"}>
                      {a.status === "submitted" ? "Ukończony" : "Oczekuje"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {a.submitted_at
                      ? new Date(a.submitted_at).toLocaleString("pl-PL")
                      : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => open(a)}
                      disabled={a.status !== "submitted"}
                    >
                      Odpowiedzi
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Odpowiedzi — {selected?.candidate_email}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="text-xs text-muted-foreground">
                Ukończono:{" "}
                {selected.submitted_at
                  ? new Date(selected.submitted_at).toLocaleString("pl-PL")
                  : "—"}
              </div>
              <ol className="space-y-4">
                {selected.questions.map((q, i) => (
                  <li key={i} className="space-y-1.5">
                    <div className="font-medium">
                      {i + 1}. {q}
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 whitespace-pre-wrap text-muted-foreground">
                      {selected.answers?.[i] || "—"}
                    </div>
                  </li>
                ))}
              </ol>
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
              {saving ? "Zapisywanie..." : "Zapisz notatki"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
