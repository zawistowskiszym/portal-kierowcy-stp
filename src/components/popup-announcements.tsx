import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  listActivePopupAnnouncements,
  dismissPopupAnnouncement,
} from "@/lib/popup-announcements.functions";

const severityMeta = {
  info: { icon: Info, label: "Informacja", color: "text-primary" },
  warning: { icon: AlertTriangle, label: "Ostrzeżenie", color: "text-amber-500" },
  critical: { icon: AlertOctagon, label: "Krytyczne", color: "text-destructive" },
} as const;

export function PopupAnnouncements() {
  const list = useServerFn(listActivePopupAnnouncements);
  const dismiss = useServerFn(dismissPopupAnnouncement);
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);

  const { data = [] } = useQuery({
    queryKey: ["popup-announcements-active"],
    queryFn: () => list(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const dismissMut = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["popup-announcements-active"] }),
  });

  useEffect(() => {
    if (index >= data.length) setIndex(0);
  }, [data.length, index]);

  useEffect(() => {
    const channel = supabase
      .channel("popup-announcements-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "popup_announcements" },
        () => qc.invalidateQueries({ queryKey: ["popup-announcements-active"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  if (!data.length) return null;
  const current: any = data[Math.min(index, data.length - 1)];
  if (!current) return null;

  const meta = severityMeta[current.severity as keyof typeof severityMeta] ?? severityMeta.info;
  const Icon = meta.icon;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className={`flex items-center gap-2 text-xs uppercase tracking-widest ${meta.color}`}>
            <Icon className="size-4" />
            <span>{meta.label}</span>
            {data.length > 1 && (
              <span className="ml-auto text-muted-foreground normal-case tracking-normal">
                {Math.min(index, data.length - 1) + 1} / {data.length}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{current.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-sm text-foreground/80">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          {data.length > 1 && index < data.length - 1 && (
            <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>
              Pokaż następne
            </Button>
          )}
          <Button
            disabled={dismissMut.isPending}
            onClick={() => dismissMut.mutate(current.id)}
          >
            Oznacz jako przeczytane
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
