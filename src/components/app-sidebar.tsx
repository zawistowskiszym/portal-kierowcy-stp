import { Link, useRouterState } from "@tanstack/react-router";
import stpLogo from "@/assets/stp-logo.png.asset.json";
import {
  LayoutDashboard,
  CalendarRange,
  Megaphone,
  Users,
  ClipboardList,
  Bus,
  CalendarCheck2,
  Plane,
  BarChart3,
  FileBarChart,
  AlertTriangle,
  Activity,
  Radio,
  BookOpen,
  Map as MapIcon,
  Inbox,
  Gauge,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const driverItems = [
  { title: "Pulpit", url: "/pulpit", icon: LayoutDashboard },
  { title: "Mój grafik", url: "/grafik", icon: CalendarRange },
  { title: "Wiadomości", url: "/wiadomosci", icon: Inbox },
  { title: "Dyspozycyjność", url: "/dyspozycyjnosc", icon: CalendarCheck2 },
  { title: "Urlopy", url: "/urlopy", icon: Plane },
  { title: "Moje statystyki", url: "/statystyki", icon: BarChart3 },
  { title: "Ogłoszenia", url: "/ogloszenia", icon: Megaphone },
];

const dispatcherItems = [
  { title: "Pulpit dyspozytora", url: "/admin/dashboard", icon: Gauge },
  { title: "Monitor służb", url: "/admin/monitor", icon: Activity },
  { title: "Incydenty", url: "/admin/incydenty", icon: AlertTriangle },
  { title: "Centrum raportów", url: "/admin/raporty", icon: FileBarChart },
  { title: "Kierowcy", url: "/admin/kierowcy", icon: Users },
  { title: "Planowanie służb", url: "/admin/sluzby", icon: ClipboardList },
  { title: "Nieprzydzielone", url: "/admin/nieprzydzielone", icon: AlertTriangle },
  { title: "Tabor", url: "/admin/pojazdy", icon: Bus },
  { title: "Komunikacja", url: "/admin/komunikacja", icon: Radio },
  { title: "Mapa operacyjna", url: "/admin/mapa", icon: MapIcon },
  { title: "Dziennik", url: "/admin/dziennik", icon: BookOpen },
  { title: "Wnioski urlopowe", url: "/admin/urlopy", icon: Plane },
  { title: "Ogłoszenia (admin)", url: "/admin/ogloszenia", icon: Megaphone },
];

const adminOnlyItems = [
  { title: "Użytkownicy", url: "/admin/uzytkownicy", icon: Users },
];

export function AppSidebar({ isAdmin, isDispatcher }: { isAdmin: boolean; isDispatcher: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");
  const showDispatcher = isAdmin || isDispatcher;

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-transparent">
      <SidebarContent
        className="m-3 rounded-3xl glass-strong text-sidebar-foreground"
      >
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <div
            className="size-10 rounded-2xl grid place-items-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-primary), color-mix(in oklab, var(--color-primary) 55%, var(--color-brand-accent)))",
            }}
          >
            <img src={stpLogo.url} alt="STP" className="size-6 brightness-0 invert" />
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-display text-lg tracking-tight truncate">Portal STP</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Skuszawyjińsk
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
            Kierowca
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {driverItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="rounded-xl data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-glass text-foreground/70 hover:text-foreground"
                  >
                    <Link to={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showDispatcher && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Dyspozytor
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dispatcherItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="rounded-xl data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-glass text-foreground/70 hover:text-foreground"
                    >
                      <Link to={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Administracja
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminOnlyItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="rounded-xl data-[active=true]:bg-primary/12 data-[active=true]:text-primary data-[active=true]:font-semibold hover:bg-glass text-foreground/70 hover:text-foreground"
                    >
                      <Link to={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
