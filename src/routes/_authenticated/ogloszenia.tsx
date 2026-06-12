import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAnnouncements,
  listAnnouncementComments,
  addAnnouncementComment,
  deleteAnnouncementComment,
} from "@/lib/portal.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, MessageSquare, Trash2, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  const [openId, setOpenId] = useState<string | null>(null);

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

      {list.map((a) => {
        const isOpen = openId === a.id;
        return (
          <article key={a.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : a.id)}
              className="w-full text-left p-5 hover:bg-muted/30 transition"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="font-bold text-base">{a.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {new Date(a.published_at).toLocaleString("pl-PL")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{CATEGORY_LABELS[a.category] ?? a.category}</Badge>
                  {isOpen ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">{a.body}</p>
            </button>

            {isOpen && <CommentsSection announcementId={a.id} />}
          </article>
        );
      })}
    </div>
  );
}

function CommentsSection({ announcementId }: { announcementId: string }) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const listFn = useServerFn(listAnnouncementComments);
  const addFn = useServerFn(addAnnouncementComment);
  const delFn = useServerFn(deleteAnnouncementComment);

  const { data } = useQuery({
    queryKey: ["ann-comments", announcementId],
    queryFn: () => listFn({ data: { announcement_id: announcementId } }),
  });

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const comments = (data ?? []) as any[];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addFn({ data: { announcement_id: announcementId, body } });
      setBody("");
      qc.invalidateQueries({ queryKey: ["ann-comments", announcementId] });
    } catch (err: any) {
      toast.error("Nie udało się dodać komentarza", { description: err?.message });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Usunąć komentarz?")) return;
    try {
      await delFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["ann-comments", announcementId] });
    } catch (err: any) {
      toast.error(err?.message ?? "Błąd");
    }
  };

  return (
    <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <MessageSquare className="size-3.5" />
        Komentarze ({comments.length})
      </div>

      <div className="space-y-2">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Brak komentarzy. Bądź pierwszy!</p>
        )}
        {comments.map((c) => {
          const mine = c.author_id === profile?.id;
          return (
            <div key={c.id} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs font-bold">
                  {c.author?.full_name ?? "—"}
                  {c.author?.employee_id && (
                    <span className="ml-2 font-mono font-normal text-muted-foreground">
                      {c.author.employee_id}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(c.created_at).toLocaleString("pl-PL")}
                  </span>
                  {mine && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Usuń komentarz"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="space-y-2">
        <Textarea
          rows={2}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Napisz komentarz…"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={busy || !body.trim()} className="gap-2">
            <Send className="size-3.5" />
            {busy ? "Wysyłanie…" : "Wyślij"}
          </Button>
        </div>
      </form>
    </div>
  );
}
