import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  Megaphone,
  Menu,
  Users,
  Plane,
  ClipboardList,
  Bus,
  FileBarChart,
  AlertTriangle,
  Activity,
  Map as MapIcon,
  BookOpen,
  Gauge,
  UserCircle,
  Network,
  UserPlus,
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
  { title: "Raporty", url: "/raporty", icon: FileBarChart },
  { title: "Ogłosz.", url: "/ogloszenia", icon: Megaphone },
];

const driverMore: Item[] = [
  { title: "Urlopy", url: "/urlopy", icon: Plane },
  { title: "Raporty i zdarzenia", url: "/raporty", icon: FileBarChart },
  { title: "Mój profil", url: "/profil", icon: UserCircle },
];

const dispatcherMore: Item[] = [
  { title: "Pulpit dyspozytora", url: "/admin/dashboard", icon: Gauge },
  { title: "Planowanie sieci", url: "/admin/planowanie", icon: Network },
  { title: "Kierowcy i tabor", url: "/admin/kierowcy", icon: Users },
  { title: "Planowanie służb", url: "/admin/sluzby", icon: ClipboardList },
  { title: "Mapa operacyjna", url: "/admin/mapa", icon: MapIcon },
  { title: "Dziennik", url: "/admin/dziennik", icon: BookOpen },
  { title: "Ogłoszenia (admin)", url: "/admin/ogloszenia", icon: Megaphone },
  { title: "Komunikaty pop-up", url: "/admin/komunikaty", icon: AlertTriangle },
];

const adminOnlyMore: Item[] = [
  { title: "Kandydaci", url: "/admin/kandydaci", icon: UserPlus },
  { title: "Quizy kandydatów", url: "/admin/quizy", icon: ClipboardList },
  { title: "Użytkownicy", url: "/admin/uzytkownicy", icon: Users },
];

export function BottomTabBar({ isAdmin, isDispatcher }: { isAdmin: boolean; isDispatcher: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const showDispatcher = isAdmin || isDispatcher;

  const renderGroup = (label: string, items: Item[]) => (
    <div>
      <div className="px-1 pb-2 pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
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
    </div>
  );

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
          <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Więcej</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-5">
              {renderGroup("Kierowca", driverMore)}
              {showDispatcher && renderGroup("Dyspozytor", dispatcherMore)}
              {isAdmin && renderGroup("Administracja", adminOnlyMore)}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
