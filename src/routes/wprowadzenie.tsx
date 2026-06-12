import { createFileRoute, Link } from "@tanstack/react-router";
import stpLogo from "@/assets/stp-logo.png.asset.json";

export const Route = createFileRoute("/wprowadzenie")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Wprowadzenie dla kandydatów — STP" },
      {
        name: "description",
        content:
          "Materiały wprowadzające dla nowych kandydatów STP: Skuszawyjice, STP, wymagania, portal kierowcy i zgłaszanie zdarzeń.",
      },
      { property: "og:title", content: "Wprowadzenie dla kandydatów — STP" },
      {
        property: "og:description",
        content:
          "Pięć krótkich filmów, które wprowadzą Cię w świat STP zanim zaczniesz służbę.",
      },
    ],
  }),
  component: IntroPage,
});

type Lesson = {
  number: number;
  title: string;
  description: string;
  videoUrl?: string;
};

const lessons: Lesson[] = [
  {
    number: 1,
    title: "Czym są Skuszawyjice?",
    description:
      "Poznaj miasto, w którym działa STP — jego historię, układ i charakter.",
  },
  {
    number: 2,
    title: "Czym jest STP",
    description:
      "Skuszawyjickie Towarzystwo Przewozowe — kto za nim stoi, czym się zajmuje i jaką rolę pełni w mieście.",
  },
  {
    number: 3,
    title: "Podstawowe wymagania dla kierowców",
    description:
      "Co musisz spełniać i wiedzieć zanim zasiądziesz za kierownicą autobusu STP.",
  },
  {
    number: 4,
    title: "Korzystanie z portalu kierowcy",
    description:
      "Grafik, urlopy, ogłoszenia, raporty — przewodnik po Twoim głównym narzędziu pracy.",
  },
  {
    number: 5,
    title: "Zgłaszanie zdarzeń",
    description:
      "Jak prawidłowo i sprawnie raportować incydenty oraz sytuacje na trasie.",
  },
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
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Film wkrótce
        </div>
        <div className="mt-1 text-sm text-foreground/80">{title}</div>
      </div>
    </div>
  );
}

function IntroPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={stpLogo.url}
              alt="STP"
              className="size-9 object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-lg tracking-tight">STP</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Portal Kierowcy
              </div>
            </div>
          </Link>
          <Link
            to="/rekrutacja"
            className="text-sm text-primary hover:underline"
          >
            Formularz rekrutacyjny
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 md:px-6 py-10 md:py-14 space-y-10">
        <section className="space-y-4">
          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            Witaj w STP
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Cieszymy się, że chcesz dołączyć do Skuszawyjickiego Towarzystwa
            Przewozowego. Zanim zaczniesz służbę, poświęć chwilę na obejrzenie
            pięciu krótkich filmów wprowadzających. Dowiesz się z nich, czym
            jest nasze miasto, jak działa STP, czego od Ciebie oczekujemy
            oraz jak korzystać z portalu kierowcy.
          </p>
        </section>

        <ol className="space-y-10">
          {lessons.map((lesson) => (
            <li key={lesson.number} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-sm text-primary">
                  {String(lesson.number).padStart(2, "0")}
                </span>
                <h2 className="font-display text-xl md:text-2xl tracking-tight">
                  {lesson.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lesson.description}
              </p>
              <VideoSlot url={lesson.videoUrl} title={lesson.title} />
            </li>
          ))}
        </ol>

        <section className="rounded-3xl border border-border/60 bg-glass p-6 md:p-8 space-y-3">
          <h3 className="font-display text-xl tracking-tight">Co dalej?</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Po obejrzeniu wszystkich filmów wróć do wiadomości rekrutacyjnej
            lub skontaktuj się z dyspozytorem. Po akceptacji zgłoszenia
            otrzymasz dostęp do portalu kierowcy.
          </p>
          <div className="pt-2">
            <Link
              to="/rekrutacja"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Przejdź do rekrutacji
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 text-xs text-muted-foreground">
          © STP — Skuszawyjickie Towarzystwo Przewozowe
        </div>
      </footer>
    </div>
  );
}
