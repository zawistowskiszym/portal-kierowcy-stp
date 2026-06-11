import { Link, useRouterState } from "@tanstack/react-router";
import stpLogo from "@/assets/stp-logo.png.asset.json";
import {
  LayoutDashboard,
  CalendarRange,
  Megaphone,
  Users,
  ClipboardList,
  Bus,
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
  { title: "Ogłoszenia", url: "/ogloszenia", icon: Megaphone },
];

const adminItems = [
  { title: "Użytkownicy", url: "/admin/uzytkownicy", icon: Users },
  { title: "Planowanie służb", url: "/admin/sluzby", icon: ClipboardList },
  { title: "Ogłoszenia (admin)", url: "/admin/ogloszenia", icon: Bus },
];

export function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 px-4 pt-5 pb-6">
          <img src={stpLogo.url} alt="STP" className="size-9 invert" />
          <div className="leading-tight">
            <div className="font-bold text-sm tracking-tight">Portal Kierowcy</div>
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
              Skuszawyjińsk
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            Kierowca
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {driverItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="data-[active=true]:bg-white/10 data-[active=true]:text-sidebar-foreground hover:bg-white/5 text-sidebar-foreground/70 hover:text-sidebar-foreground"
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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
              Administracja
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="data-[active=true]:bg-white/10 data-[active=true]:text-sidebar-foreground hover:bg-white/5 text-sidebar-foreground/70 hover:text-sidebar-foreground"
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
