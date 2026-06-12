import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { getQuizAttempt, submitQuiz } from "@/lib/recruitment.functions";
import stpLogo from "@/assets/stp-logo.png.asset.json";

export const Route = createFileRoute("/quiz/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Quiz wprowadzający — STP" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: QuizPage,
});

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "done"; submittedAt: string | null }
  | { kind: "ready"; email: string; questions: string[] };

function QuizPage() {
  const { token } = Route.useParams();
  const getAttempt = useServerFn(getQuizAttempt);
  const submitFn = useServerFn(submitQuiz);

  const [state, setState] = useState<State>({ kind: "loading" });
  const [answers, setAnswers] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getAttempt({ data: { token } });
        if (cancelled) return;
        if (!res.found) {
          setState({ kind: "missing" });
          return;
        }
        if (res.status === "submitted") {
          setState({ kind: "done", submittedAt: res.submittedAt });
          return;
        }
        setState({
          kind: "ready",
          email: res.candidateEmail,
          questions: res.questions,
        });
        setAnswers(new Array(res.questions.length).fill(""));
      } catch {
        setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, getAttempt]);

  if (state.kind === "loading") {
    return <Shell><p className="text-muted-foreground">Ładowanie quizu…</p></Shell>;
  }

  if (state.kind === "missing") {
    return (
      <Shell>
        <h1 className="font-display text-2xl">Nie znaleziono quizu</h1>
        <p className="text-muted-foreground">
          Link jest nieprawidłowy lub wygasł. Wróć na stronę wprowadzającą i
          wygeneruj nowy link.
        </p>
        <Link to="/wprowadzenie" className="text-primary hover:underline">
          ← Wróć do wprowadzenia
        </Link>
      </Shell>
    );
  }

  if (state.kind === "done") {
    return (
      <Shell>
        <h1 className="font-display text-2xl">Quiz wysłany ✓</h1>
        <p className="text-muted-foreground">
          Dziękujemy! Twoje odpowiedzi zostały zapisane
          {state.submittedAt
            ? ` (${new Date(state.submittedAt).toLocaleString("pl-PL")})`
            : ""}. Skontaktujemy się z Tobą po ocenie — sprawdzaj również
          folder <strong>Spam</strong>.
        </p>
        <Link to="/" className="text-primary hover:underline">← Strona główna</Link>
      </Shell>
    );
  }

  const { questions, email } = state;
  const total = questions.length;
  const answered = answers.filter((a) => a.trim().length > 0).length;
  const progress = Math.round((answered / total) * 100);
  const current = questions[index];

  const setAnswer = (val: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const onSubmit = async () => {
    if (answers.some((a) => !a.trim())) {
      toast.error("Odpowiedz na wszystkie pytania");
      return;
    }
    setSubmitting(true);
    try {
      await submitFn({ data: { token, answers } });
      setState({ kind: "done", submittedAt: new Date().toISOString() });
    } catch (err: any) {
      toast.error(err?.message ?? "Błąd wysyłki");
    } finally {
      setSubmitting(false);
    }
  };

  const isLast = index === total - 1;

  return (
    <Shell>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
          <span>Quiz STP · {email}</span>
          <span>{answered} / {total}</span>
        </div>
        <Progress value={progress} />
        <div className="text-xs text-muted-foreground">
          Pytanie {index + 1} z {total}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-xl md:text-2xl tracking-tight">
          {current}
        </h2>
        <Textarea
          rows={6}
          value={answers[index] ?? ""}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Twoja odpowiedź…"
          maxLength={4000}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Button
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          ← Wstecz
        </Button>
        {isLast ? (
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Wysyłanie…" : "Wyślij odpowiedzi"}
          </Button>
        ) : (
          <Button
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          >
            Dalej →
          </Button>
        )}
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 pt-2">
        {questions.map((_, i) => {
          const filled = (answers[i] ?? "").trim().length > 0;
          const isCurrent = i === index;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-9 rounded-lg text-xs font-mono border transition ${
                isCurrent
                  ? "border-primary bg-primary/15 text-foreground"
                  : filled
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-5 flex items-center gap-3">
          <img src={stpLogo.url} alt="STP" className="size-9 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg tracking-tight">STP</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Quiz rekrutacyjny
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12 space-y-6">
        {children}
      </main>
    </div>
  );
}
