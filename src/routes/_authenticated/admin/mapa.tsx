import { createFileRoute } from "@tanstack/react-router";
import { Map } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/mapa")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mapa operacyjna — STP" }] }),
  component: MapPage,
});

function MapPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Mapa operacyjna</h1>
      <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
        <Map className="size-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-bold mb-1">Wkrótce dostępna</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Interaktywna mapa z pozycjami pojazdów, incydentami i blokadami zostanie dodana w następnym etapie.
          Wymaga integracji z systemem geolokalizacji pojazdów.
        </p>
      </div>
    </div>
  );
}
