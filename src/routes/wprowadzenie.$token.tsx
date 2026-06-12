import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getIntroByToken, requestQuiz } from "@/lib/recruitment.functions";
import stpLogo from "@/assets/stp-logo.png.asset.json";

export const Route = createFileRoute("/wprowadzenie/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wprowadzenie dla kandydatów — STP" },
      {
        name: "description",
        content:
          "Spersonalizowane materiały wprowadzające dla kandydata STP.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ params }) => {
    const result = await getIntroByToken({ data: { token: params.token } });
    if (!result.found) throw notFound();
    return result;
  },
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
  component: IntroTokenPage,
});

type Lesson = {
  number: number;
  title: string;
  description: string;
  videoUrl?: string;
};

const lessons: Lesson[] = [
  { number: 1, title: "Czym są Skuszawyjice?", description: "Poznaj miasto, w którym działa STP — jego historię, układ i charakter." },
  { number: 2, title: "Czym jest STP", description: "Skuszawyjiński Transport Publiczny — kto za nim stoi, czym się zajmuje i jaką rolę pełni w mieście." },
  { number: 3, title: "Podstawowe wymagania dla kierowców", description: "Co musisz spełniać i wiedzieć zanim zasiądziesz za kierownicą autobusu STP." },
  { number: 4, title: "Korzystanie z portalu kierowcy", description: "Grafik, urlopy, ogłoszenia, raporty — przewodnik po Twoim głównym narzędziu pracy." },
  { number: 5, title: "Zgłaszanie zdarzeń", description: "Jak prawidłowo i sprawnie raportować incydenty oraz sytuacje na trasie." },
];

function VideoSlot({ url, title }: { url?: string; title: string }) {
  if (url) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          src={url}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <div className="aspect-video w-full rounded-2xl border border-dashed border-border bg-glass flex items-center justify-center text-center px-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Film wkrótce</div>
        <div className="mt-1 text-sm text-foreground/80">{title}</div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <Shell>
      <div className="rounded-2xl border border-border/60 bg-glass p-6 text-sm space-y-3">
        <h2 className="font-display text-xl tracking-tight">Link nieaktywny</h2>
        <p className="text-muted-foreground">
          Ten link wprowadzający jest nieprawidłowy lub wygasł. Skontaktuj się
          z rekrutacją lub wypełnij formularz ponownie.
        </p>
        <Link to="/rekrutacja" className="text-primary hover:underline">Przejdź do formularza →</Link>
      </div>
    </Shell>
  );
}

function ErrorPage() {
  return (
    <Shell>
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
        Wystąpił błąd. Spróbuj ponownie za chwilę.
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={stpLogo.url} alt="STP" className="size-9 object-contain" />
            <div className="leading-tight">
              <div className="font-display text-lg tracking-tight">STP</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Portal Kierowcy</div>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-10 md:py-14 space-y-10">{children}</main>
    </div>
  );
}

function IntroTokenPage() {
  const { token } = Route.useParams();
  const intro = Route.useLoaderData();
  const requestQuizFn = useServerFn(requestQuiz);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onAcknowledge = async () => {
    setBusy(true);
    try {
      await requestQuizFn({ data: { introToken: token } });
      setSent(true);
      toast.success("Wysłaliśmy link do quizu");
    } catch (err: any) {
      toast.error(err?.message ?? "Nie udało się wysłać");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <section className="space-y-4">
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">Witaj w STP</h1>
        <p className="text-muted-foreground leading-relaxed">
          Cieszymy się, że chcesz dołączyć do Skuszawyjińskiego Transportu Publicznego.
          Zanim zaczniesz służbę, poświęć chwilę na obejrzenie pięciu krótkich filmów
          wprowadzających.
        </p>
        <p className="text-sm text-muted-foreground">
          Materiały przygotowane dla: <span className="text-foreground font-medium">{intro.candidateEmail}</span>
        </p>
      </section>

      <ol className="space-y-10">
        {lessons.map((lesson) => (
          <li key={lesson.number} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-sm text-primary">
                {String(lesson.number).padStart(2, "0")}
              </span>
              <h2 className="font-display text-xl md:text-2xl tracking-tight">{lesson.title}</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description}</p>
            <VideoSlot url={lesson.videoUrl} title={lesson.title} />
          </li>
        ))}
      </ol>

      <section className="rounded-3xl border border-border/60 bg-glass p-6 md:p-8 space-y-4">
        <h3 className="font-display text-xl tracking-tight">Zapoznałem(-am) się — co dalej?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Po obejrzeniu wszystkich filmów potwierdź zapoznanie się z materiałami.
          Wyślemy quiz (15 pytań otwartych) na Twój adres{" "}
          <span className="text-foreground font-medium">{intro.candidateEmail}</span> —
          nie musisz nigdzie wpisywać go ponownie.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
            <div className="font-semibold text-foreground">Sprawdź skrzynkę {intro.candidateEmail}</div>
            <p className="mt-1 text-muted-foreground">
              Wysłaliśmy link do quizu. Jeśli nie widzisz wiadomości w ciągu kilku
              minut, sprawdź folder <strong>Spam</strong> lub <strong>Oferty</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={onAcknowledge} disabled={busy} className="w-full sm:w-auto">
              {busy ? "Wysyłanie..." : "Zapoznałem(-am) się — wyślij quiz"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Po wysłaniu sprawdź też folder <strong>Spam</strong> — wiadomości
              rekrutacyjne czasem tam trafiają.
            </p>
          </div>
        )}
      </section>
    </Shell>
  );
}
