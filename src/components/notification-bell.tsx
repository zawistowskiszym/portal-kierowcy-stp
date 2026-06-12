import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { listMyNotifications, markNotificationRead } from "@/lib/portal.functions";

export function NotificationBell() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationRead);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });
  const items = (data ?? []) as any[];
  const unread = items.filter((n) => !n.read_at).length;

  const refresh = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Powiadomienia">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Powiadomienia</div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={async () => { await markFn({ data: { all: true } }); refresh(); }}>
              <Check className="size-3 mr-1" /> Oznacz przeczytane
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">Brak powiadomień</div>
          ) : items.map((n) => (
            <button
              key={n.id}
              onClick={async () => { if (!n.read_at) { await markFn({ data: { id: n.id } }); refresh(); } }}
              className={`w-full text-left px-3 py-2.5 hover:bg-muted/40 ${!n.read_at ? "bg-brand/5" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.read_at && <span className="size-2 rounded-full bg-brand mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold">{n.title}</div>
                  {n.body && <div className="text-[11px] text-muted-foreground mt-0.5">{n.body}</div>}
                  <div className="text-[10px] text-muted-foreground/70 font-mono mt-1">{new Date(n.created_at).toLocaleString("pl-PL")}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
