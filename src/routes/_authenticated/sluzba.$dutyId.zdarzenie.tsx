import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/sluzba/$dutyId/zdarzenie")({
  head: () => ({ meta: [{ title: "Zgłoszenie zdarzenia drogowego — Portal STP" }] }),
  component: ZdarzeniePage,
});

function ZdarzeniePage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    severity: "kolizja", location: "", occurred_at: "", participants: "1", description: "", injured: "nie",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim() || !form.description.trim()) {
      toast.error("Lokalizacja i opis zdarzenia są wymagane");
      return;
    }
    toast.success("Zdarzenie zostało zgłoszone — dyspozytor został powiadomiony");
    navigate({ to: "/grafik" });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Link to="/grafik"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" /> Wróć do grafiku</Button></Link>
      <div className="bg-card border border-destructive/40 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" />
          <h2 className="text-xl font-bold">Zgłoszenie zdarzenia drogowego</h2>
        </div>
        <p className="text-sm text-muted-foreground">Służba ID: <span className="font-mono">{dutyId}</span></p>

        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
          W przypadku zagrożenia życia lub zdrowia natychmiast zadzwoń pod <strong>112</strong>.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Rodzaj zdarzenia</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kolizja">Kolizja</SelectItem>
                  <SelectItem value="wypadek">Wypadek</SelectItem>
                  <SelectItem value="potracenie">Potrącenie pieszego</SelectItem>
                  <SelectItem value="szkoda">Szkoda parkingowa</SelectItem>
                  <SelectItem value="inne">Inne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Poszkodowani</Label>
              <Select value={form.injured} onValueChange={(v) => setForm({ ...form, injured: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nie">Brak</SelectItem>
                  <SelectItem value="lekko">Lekko ranni</SelectItem>
                  <SelectItem value="ciezko">Ciężko ranni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Czas zdarzenia</Label>
              <Input type="datetime-local" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Liczba uczestników</Label>
              <Input type="number" min={1} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Lokalizacja</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ulica, skrzyżowanie, miasto" />
          </div>
          <div className="space-y-1">
            <Label>Opis zdarzenia</Label>
            <Textarea rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Przebieg zdarzenia, warunki drogowe, świadkowie..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/grafik" })}>Anuluj</Button>
            <Button type="submit" variant="destructive">Zgłoś zdarzenie</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
