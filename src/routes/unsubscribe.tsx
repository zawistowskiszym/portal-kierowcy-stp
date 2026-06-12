import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/unsubscribe")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Wypisz się — Portal STP" }] }),
  component: UnsubscribePage,
});

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "done" }
  | { kind: "error"; message: string };

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) {
          setState({ kind: "invalid" });
        } else if (json.valid) {
          setState({ kind: "valid" });
        } else if (json.reason === "already_unsubscribed") {
          setState({ kind: "already" });
        } else {
          setState({ kind: "invalid" });
        }
      } catch (e: any) {
        setState({ kind: "error", message: e?.message ?? "Błąd połączenia" });
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/email/unsubscribe`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.ok && json.success) setState({ kind: "done" });
      else if (json.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: json.error ?? "Nie udało się wypisać" });
    } catch (e: any) {
      setState({ kind: "error", message: e?.message ?? "Błąd połączenia" });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-bold">Powiadomienia e-mail STP</h1>
        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Sprawdzanie…</p>
        )}
        {state.kind === "valid" && (
          <>
            <p className="text-sm text-muted-foreground">
              Czy na pewno chcesz wypisać się z powiadomień e-mail Portalu STP?
              Nadal będziesz otrzymywać wiadomości w aplikacji.
            </p>
            <Button onClick={confirm} variant="destructive">
              Potwierdź wypisanie
            </Button>
          </>
        )}
        {state.kind === "already" && (
          <p className="text-sm text-muted-foreground">
            Ten adres został już wcześniej wypisany z powiadomień.
          </p>
        )}
        {state.kind === "done" && (
          <p className="text-sm text-emerald-600">
            Gotowe — nie będziemy wysyłać dalszych e-maili powiadomień na ten adres.
          </p>
        )}
        {state.kind === "invalid" && (
          <p className="text-sm text-destructive">Link jest nieprawidłowy lub wygasł.</p>
        )}
        {state.kind === "error" && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
      </div>
    </div>
  );
}
