import { Moon, Sun, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const Icon = mode === "dark" ? Moon : mode === "light" ? Sun : MonitorSmartphone;
  const label =
    mode === "dark" ? "Tryb ciemny" : mode === "light" ? "Tryb jasny" : "Tryb systemowy";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={label}
      aria-label={label}
      className="rounded-full hover:bg-glass-strong"
    >
      <Icon className="size-4" />
    </Button>
  );
}
