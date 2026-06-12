import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  listAllPopupAnnouncements,
  createPopupAnnouncement,
  archivePopupAnnouncement,
  unarchivePopupAnnouncement,
} from "@/lib/popup-announcements.functions";

export const Route = createFileRoute("/_authenticated/admin/komunikaty")({
  component: KomunikatyPage,
});

function KomunikatyPage() {
  const list = useServerFn(listAllPopupAnnouncements);
  const create = useServerFn(createPopupAnnouncement);
  const archive = useServerFn(archivePopupAnnouncement);
  const unarchive = useServerFn(unarchivePopupAnnouncement);
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("info");

  const { data = [] } = useQuery({
    queryKey: ["popup-announcements-all"],
    queryFn: () => list(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["popup-announcements-all"] });
    qc.invalidateQueries({ queryKey: ["popup-announcements-active"] });
  };

  const createMut = useMutation({
    mutationFn: () => create({ data: { title, body, severity } }),
    onSuccess: () => {
      toast.success("Komunikat opublikowany");
      setTitle("");
      setBody("");
      setSeverity("info");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Błąd"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => {
      toast.success("Zarchiwizowano");
      invalidate();
    },
  });

  const unarchiveMut = useMutation({
    mutationFn: (id: string) => unarchive({ data: { id } }),
    onSuccess: () => {
      toast.success("Przywrócono");
      invalidate();
    },
  });

  const active = (data as any[]).filter((a) => !a.archived);
  const archived = (data as any[]).filter((a) => a.archived);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display tracking-tight">Komunikaty pop-up</h1>
        <p className="text-sm text-muted-foreground">
          Pojawiają się jako okno na środku ekranu dla wszystkich użytkowników do momentu oznaczenia jako przeczytane lub zarchiwizowania.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nowy komunikat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Tytuł</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Treść</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={4000} />
          </div>
          <div>
            <Label>Poziom</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informacja</SelectItem>
                <SelectItem value="warning">Ostrzeżenie</SelectItem>
                <SelectItem value="critical">Krytyczne</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!title.trim() || !body.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            Opublikuj
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktywne ({active.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active.length === 0 && <p className="text-sm text-muted-foreground">Brak aktywnych komunikatów.</p>}
          {active.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline">{a.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{a.body}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => archiveMut.mutate(a.id)}>
                Archiwizuj
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archiwum ({archived.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {archived.length === 0 && <p className="text-sm text-muted-foreground">Pusto.</p>}
          {archived.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3 opacity-70">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.title}</span>
                  <Badge variant="outline">{a.severity}</Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">{a.body}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => unarchiveMut.mutate(a.id)}>
                Przywróć
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
