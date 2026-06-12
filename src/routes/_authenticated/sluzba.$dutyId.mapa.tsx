import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import routeMap from "@/assets/route-map-placeholder.png.asset.json";

export const Route = createFileRoute("/_authenticated/sluzba/$dutyId/mapa")({
  head: () => ({ meta: [{ title: "Mapa trasy — Portal STP" }] }),
  component: MapaPage,
});

function MapaPage() {
  const { dutyId } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/grafik"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" /> Wróć do grafiku</Button></Link>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-brand" />
          <h2 className="text-xl font-bold">Mapa trasy</h2>
        </div>
        <p className="text-sm text-muted-foreground">Służba ID: <span className="font-mono">{dutyId}</span></p>
        <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
          <img
            src={routeMap.url}
            alt="Mapa trasy"
            className="w-full h-auto block"
          />
        </div>
      </div>
    </div>
  );
}

