import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, AlertOctagon, Bell } from "lucide-react";
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
import { cn } from "@/lib/utils";

const severityMeta = {
  info: { icon: Info, label: "Informacja", color: "text-primary" },
  warning: { icon: AlertTriangle, label: "Ostrzeżenie", color: "text-amber-500" },
  critical: { icon: AlertOctagon, label: "Krytyczne", color: "text-destructive" },
} as const;

type Ann = {
  id: string;
  title: string;
  body: string;
  severity: keyof typeof severityMeta;
  read: boolean;
  created_at: string;
};

const computeDelay = (body: string) =>
  Math.max(4, Math.min(15, Math.ceil((body?.length ?? 0) / 80)));

function useActiveAnnouncements() {
  const list = useServerFn(listActivePopupAnnouncements);
  const qc = useQueryClient();
  const query = useQuery<Ann[]>({
    queryKey: ["popup-announcements-active"],
    queryFn: () => list() as any,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    const channel = supabase
      .channel(`popup-announcements-rt-${Math.random().toString(36).slice(2)}`)
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
  return query;
}

export function PopupAnnouncements() {
  const dismiss = useServerFn(dismissPopupAnnouncement);
  const qc = useQueryClient();
  const { data = [] } = useActiveAnnouncements();

  const unread = useMemo(() => data.filter((a) => !a.read), [data]);
  const [index, setIndex] = useState(0);
  const current = unread[Math.min(index, Math.max(unread.length - 1, 0))];

  useEffect(() => {
    if (index >= unread.length) setIndex(0);
  }, [unread.length, index]);

  // Countdown gating dismissal
  const delay = useMemo(() => computeDelay(current?.body ?? ""), [current?.id]);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    if (!current) return;
    setElapsed(0);
    startRef.current = performance.now();
    let raf = 0;
    const tick = () => {
      const e = (performance.now() - startRef.current) / 1000;
      setElapsed(Math.min(e, delay));
      if (e < delay) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current?.id, delay]);

  const dismissMut = useMutation({
    mutationFn: (id: string) => dismiss({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["popup-announcements-active"] }),
  });

  if (!current) return null;

  const meta = severityMeta[current.severity] ?? severityMeta.info;
  const Icon = meta.icon;
  const ready = elapsed >= delay;
  const progress = Math.min(elapsed / delay, 1);
  const remaining = Math.max(0, Math.ceil(delay - elapsed));

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
            {unread.length > 1 && (
              <span className="ml-auto text-muted-foreground normal-case tracking-normal">
                {Math.min(index, unread.length - 1) + 1} / {unread.length}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{current.title}</DialogTitle>
          <DialogDescription className="whitespace-pre-wrap text-sm text-foreground/80">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          {unread.length > 1 && index < unread.length - 1 && (
            <Button variant="outline" onClick={() => setIndex((i) => i + 1)}>
              Pokaż następne
            </Button>
          )}
          <Button
            disabled={!ready || dismissMut.isPending}
            onClick={() => dismissMut.mutate(current.id)}
            className="relative overflow-hidden"
          >
            {!ready && (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-primary-foreground/15 transition-[width] duration-100 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            )}
            <span className="relative">
              {ready ? "Oznacz jako przeczytane" : `Poczekaj ${remaining}s…`}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PopupAnnouncementsBanner() {
  const { data = [] } = useActiveAnnouncements();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!data.length) return null;

  const opened = data.find((a) => a.id === openId);
  const meta = opened ? severityMeta[opened.severity] ?? severityMeta.info : null;
  const OpenedIcon = meta?.icon;

  return (
    <>
      <div className="px-3 md:px-6 pt-3">
        <div className="glass rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap text-xs">
          <Bell className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Aktywne komunikaty:</span>
          {data.map((a) => {
            const m = severityMeta[a.severity] ?? severityMeta.info;
            const Icon = m.icon;
            return (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 hover:bg-accent transition-colors",
                  !a.read && "font-medium",
                )}
              >
                <Icon className={cn("size-3", m.color)} />
                <span className="max-w-[200px] truncate">{a.title}</span>
                {!a.read && <span className="size-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!opened} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-w-lg">
          {opened && meta && OpenedIcon && (
            <DialogHeader>
              <div className={`flex items-center gap-2 text-xs uppercase tracking-widest ${meta.color}`}>
                <OpenedIcon className="size-4" />
                <span>{meta.label}</span>
              </div>
              <DialogTitle className="text-xl">{opened.title}</DialogTitle>
              <DialogDescription className="whitespace-pre-wrap text-sm text-foreground/80">
                {opened.body}
              </DialogDescription>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
