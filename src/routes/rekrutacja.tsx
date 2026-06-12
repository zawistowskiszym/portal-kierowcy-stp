import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import stpLogo from "@/assets/stp-logo.png.asset.json";

export const Route = createFileRoute("/rekrutacja")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rekrutacja — STP" },
      { name: "description", content: "Dołącz do zespołu STP. Wypełnij formularz rekrutacyjny." },
      { property: "og:title", content: "Rekrutacja — STP" },
      { property: "og:description", content: "Dołącz do zespołu STP. Wypełnij formularz rekrutacyjny." },
    ],
  }),
  component: RecruitmentPage,
});

const schema = z.object({
  email: z.string().trim().email("Nieprawidłowy email").max(255),
  roblox_username: z.string().trim().min(3, "Min. 3 znaki").max(50),
  discord_username: z.string().trim().max(50).optional().or(z.literal("")),
  motivation: z.string().trim().min(20, "Napisz co najmniej 20 znaków").max(2000),
  experience: z.string().trim().max(2000).optional().or(z.literal("")),
});

function RecruitmentPage() {
  const [form, setForm] = useState({
    email: "",
    roblox_username: "",
    discord_username: "",
    motivation: "",
    experience: "",
  });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Sprawdź formularz");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("recruitment_applications").insert({
      email: parsed.data.email,
      roblox_username: parsed.data.roblox_username,
      discord_username: parsed.data.discord_username || null,
      motivation: parsed.data.motivation,
      experience: parsed.data.experience || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Nie udało się wysłać zgłoszenia");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={stpLogo.url} alt="STP" className="size-9 object-contain" />
            <div className="leading-tight">
              <div className="font-display text-lg">STP</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Skuszawyjice Transit Planning
              </div>
            </div>
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Zaloguj się
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">Dołącz do STP</h1>
          <p className="mt-3 text-muted-foreground">
            Szukamy kierowców, dyspozytorów i pasjonatów transportu publicznego. Wypełnij
            formularz — odezwiemy się przez Discord lub email.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center space-y-3">
            <h2 className="font-display text-2xl">Dziękujemy!</h2>
            <p className="text-muted-foreground">
              Twoje zgłoszenie zostało wysłane. Skontaktujemy się w ciągu kilku dni
              — odpowiedź przyjdzie na podany adres email.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Sprawdzaj folder Spam</strong> — wiadomości rekrutacyjne czasem
              tam trafiają.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border/60 bg-card p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roblox">Nazwa użytkownika Roblox *</Label>
              <Input
                id="roblox"
                required
                maxLength={50}
                value={form.roblox_username}
                onChange={(e) => setForm({ ...form, roblox_username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord">Nazwa użytkownika Discord</Label>
              <Input
                id="discord"
                maxLength={50}
                placeholder="opcjonalne"
                value={form.discord_username}
                onChange={(e) => setForm({ ...form, discord_username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivation">Dlaczego chcesz dołączyć do STP? *</Label>
              <Textarea
                id="motivation"
                required
                rows={5}
                maxLength={2000}
                value={form.motivation}
                onChange={(e) => setForm({ ...form, motivation: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Wcześniejsze doświadczenie</Label>
              <Textarea
                id="experience"
                rows={4}
                maxLength={2000}
                placeholder="opcjonalne — inne projekty, role, umiejętności"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              />
            </div>

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Wysyłanie..." : "Wyślij zgłoszenie"}
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
