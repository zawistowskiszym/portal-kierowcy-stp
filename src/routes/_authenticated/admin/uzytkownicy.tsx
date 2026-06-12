import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsers, inviteUser, updateUser, resetUserPassword, deleteUser } from "@/lib/portal.functions";
import { LEAVE_TYPE_LABEL } from "@/lib/leave-types";


export const Route = createFileRoute("/_authenticated/admin/uzytkownicy")({
  head: () => ({ meta: [{ title: "Użytkownicy — Admin STP" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUsers);
  const inviteFn = useServerFn(inviteUser);
  const updateFn = useServerFn(updateUser);
  const resetFn = useServerFn(resetUserPassword);
  const delFn = useServerFn(deleteUser);

  const { data } = useQuery({ queryKey: ["admin", "users"], queryFn: () => listFn() });
  const users = (data ?? []) as any[];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "driver" as "admin" | "driver" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteFn({
        data: {
          email: form.email,
          role: form.role,
          redirectTo: `${window.location.origin}/zaproszenie`,
        },
      });
      toast.success("Zaproszenie wysłane", {
        description: `Wiadomość trafi na adres ${form.email}.`,
      });
      setOpen(false);
      setForm({ email: "", role: "driver" });
      refresh();
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    }
  };

  const onToggleActive = async (u: any) => {
    try {
      await updateFn({ data: { id: u.id, active: !u.active } });
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  const onResetPassword = async (u: any) => {
    const pw = prompt(`Nowe hasło dla ${u.full_name} (min. 8 znaków):`);
    if (!pw || pw.length < 8) return;
    try {
      await resetFn({ data: { id: u.id, password: pw } });
      toast.success("Hasło zresetowane");
    } catch (err: any) { toast.error(err?.message); }
  };

  const onDelete = async (u: any) => {
    if (!confirm(`Usunąć konto ${u.full_name}?`)) return;
    try {
      await delFn({ data: { id: u.id } });
      toast.success("Konto usunięte");
      refresh();
    } catch (err: any) { toast.error(err?.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Zarządzanie użytkownikami</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ Zaproś pracownika</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zaproś nowego pracownika</DialogTitle>
            </DialogHeader>
            <form onSubmit={onInvite} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Wyślemy na podany adres link do założenia konta. Pracownik sam ustawi hasło
                oraz uzupełni dane osobowe.
              </p>
              <div className="space-y-1">
                <Label>Adres e-mail</Label>
                <Input
                  type="email"
                  required
                  autoFocus
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Rola</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">Kierowca</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Wyślij zaproszenie</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase text-[10px]">
            <tr>
              <th className="px-6 py-3">Pracownik</th>
              <th className="px-6 py-3">Nr służbowy</th>
              <th className="px-6 py-3">Zajezdnia</th>
              <th className="px-6 py-3">Rola</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-3 font-semibold">{u.full_name}</td>
                <td className="px-6 py-3 font-mono text-xs">{u.employee_id ?? "—"}</td>
                <td className="px-6 py-3 text-muted-foreground">{u.depot ?? "—"}</td>
                <td className="px-6 py-3">
                  {u.roles.map((r: string) => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="mr-1">
                      {r === "admin" ? "Administrator" : "Kierowca"}
                    </Badge>
                  ))}
                </td>
                <td className="px-6 py-3">
                  {u.active
                    ? <Badge className="bg-status-ok text-status-ok-foreground">Aktywne</Badge>
                    : <Badge variant="outline">Zaproszenie wysłane</Badge>}
                </td>
                <td className="px-6 py-3 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => onToggleActive(u)}>
                    {u.active ? "Zablokuj" : "Aktywuj"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onResetPassword(u)}>Reset hasła</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(u)}>Usuń</Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Brak użytkowników.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
