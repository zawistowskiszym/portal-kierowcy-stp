import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  Megaphone,
  CalendarCheck2,
  Menu,
  Users,
  Plane,
  BarChart3,
  ClipboardList,
  Bus,
  FileBarChart,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const driverPrimary: Item[] = [
  { title: "Pulpit", url: "/pulpit", icon: LayoutDashboard },
  { title: "Grafik", url: "/grafik", icon: CalendarRange },
  { title: "Dyspo.", url: "/dyspozycyjnosc", icon: CalendarCheck2 },
  { title: "Ogłosz.", url: "/ogloszenia", icon: Megaphone },
];

const driverMore: Item[] = [
  { title: "Urlopy", url: "/urlopy", icon: Plane },
  { title: "Moje statystyki", url: "/statystyki", icon: BarChart3 },
];

const dispatcherMore: Item[] = [
  { title: "Planowanie służb", url: "/admin/sluzby", icon: ClipboardList },
  { title: "Nieprzydzielone", url: "/admin/nieprzydzielone", icon: AlertTriangle },
  { title: "Tabor", url: "/admin/pojazdy", icon: Bus },
  { title: "Wnioski urlopowe", url: "/admin/urlopy", icon: Plane },
  { title: "Ogłoszenia (admin)", url: "/admin/ogloszenia", icon: Megaphone },
];

const adminOnlyMore: Item[] = [
  { title: "Użytkownicy", url: "/admin/uzytkownicy", icon: Users },
  { title: "Raporty", url: "/admin/raporty", icon: FileBarChart },
];

export function BottomTabBar({ isAdmin, isDispatcher }: { isAdmin: boolean; isDispatcher: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const moreItems = [
    ...driverMore,
    ...((isAdmin || isDispatcher) ? dispatcherMore : []),
    ...(isAdmin ? adminOnlyMore : []),
  ];

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 pb-safe px-3 pt-2 pointer-events-none"
      aria-label="Nawigacja"
    >
      <div className="glass-strong pointer-events-auto mx-auto flex max-w-md items-stretch justify-between rounded-3xl px-1 py-1">
        {driverPrimary.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 transition-colors",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-semibold tracking-tight">{item.title}</span>
            </Link>
          );
        })}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex-1 flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-muted-foreground hover:text-foreground"
              aria-label="Więcej"
            >
              <Menu className="size-5" />
              <span className="text-[10px] font-semibold tracking-tight">Więcej</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-8">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Więcej</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpen(false)}
                    className={[
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-glass text-foreground hover:bg-glass-strong",
                    ].join(" ")}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
