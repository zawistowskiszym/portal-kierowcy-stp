import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sluzba/$dutyId/rozklad")({
  head: () => ({ meta: [{ title: "Rozkład jazdy — Portal STP" }] }),
  component: RozkladPage,
});

function RozkladPage() {
  const { dutyId } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/grafik"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" /> Wróć do grafiku</Button></Link>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-brand" />
          <h2 className="text-xl font-bold">Rozkład jazdy</h2>
        </div>
        <p className="text-sm text-muted-foreground">Służba ID: <span className="font-mono">{dutyId}</span></p>
        <div className="bg-muted/40 border border-dashed border-border rounded-lg p-10 text-center text-sm text-muted-foreground">
          Tu pojawi się szczegółowy rozkład jazdy dla wybranej służby (lista kursów, przystanków i godzin).
        </div>
      </div>
    </div>
  );
}
