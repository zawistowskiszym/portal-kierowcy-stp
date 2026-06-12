import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listUsers, inviteUser, updateUser, resetUserPassword, deleteUser } from "@/lib/portal.functions";
import { LEAVE_TYPE_LABEL } from "@/lib/leave-types";


export const Route = createFileRoute("/_authenticated/admin/uzytkownicy")({
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw redirect({ to: "/pulpit" });
  },
  head: () => ({ meta: [{ title: "Użytkownicy — Admin STP" }] }),
  component: AdminUsersPage,
});

type EditState = {
  id: string;
  full_name: string;
  employee_id: string;
  depot: string;
  roblox_username: string;
  discord_username: string;
  phone: string;
  bio: string;
  role: "admin" | "dyspozytor" | "driver";
};

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
  const [form, setForm] = useState({ email: "", role: "driver" as "admin" | "dyspozytor" | "driver" });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

  const openEdit = (u: any) => {
    const role: EditState["role"] = u.roles.includes("admin")
      ? "admin"
      : u.roles.includes("dyspozytor")
      ? "dyspozytor"
      : "driver";
    setEdit({
      id: u.id,
      full_name: u.full_name ?? "",
      employee_id: u.employee_id ?? "",
      depot: u.depot ?? "",
      roblox_username: u.roblox_username ?? "",
      discord_username: u.discord_username ?? "",
      phone: u.phone ?? "",
      bio: u.bio ?? "",
      role,
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    if (edit.employee_id && !/^\d{4}$/.test(edit.employee_id)) {
      toast.error("Nr służbowy musi składać się z 4 cyfr");
      return;
    }
    setSavingEdit(true);
    try {
      await updateFn({
        data: {
          id: edit.id,
          full_name: edit.full_name.trim(),
          employee_id: edit.employee_id || null,
          depot: edit.depot || null,
          roblox_username: edit.roblox_username.trim() || null,
          discord_username: edit.discord_username.trim() || null,
          phone: edit.phone.trim() || null,
          bio: edit.bio.trim() || null,
          role: edit.role,
        },
      });
      toast.success("Profil zaktualizowany");
      setEdit(null);
      refresh();
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setSavingEdit(false);
    }
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
                    <SelectItem value="dyspozytor">Dyspozytor</SelectItem>
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
              <th className="px-6 py-3">Discord</th>
              <th className="px-6 py-3">Rola</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Urlopy ({new Date().getFullYear()})</th>
              <th className="px-6 py-3 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const summary = (u.leave_summary ?? {}) as Record<string, number>;
              const entries = Object.entries(summary).filter(([, n]) => n > 0);
              const totalDays = entries.reduce((s, [, n]) => s + n, 0);
              return (
              <tr key={u.id}>
                <td className="px-6 py-3 font-semibold">{u.full_name}</td>
                <td className="px-6 py-3 font-mono text-xs">{u.employee_id ?? "—"}</td>
                <td className="px-6 py-3 text-muted-foreground">{u.depot ?? "—"}</td>
                <td className="px-6 py-3 text-xs">
                  <div className="font-mono">{u.roblox_username ?? "—"}</div>
                  <div className="text-muted-foreground">{u.discord_username ?? ""}</div>
                </td>
                <td className="px-6 py-3">
                  {u.roles.map((r: string) => (
                    <Badge key={r} variant={r === "admin" ? "default" : r === "dyspozytor" ? "outline" : "secondary"} className="mr-1">
                      {r === "admin" ? "Administrator" : r === "dyspozytor" ? "Dyspozytor" : "Kierowca"}
                    </Badge>
                  ))}
                </td>
                <td className="px-6 py-3">
                  {u.active
                    ? <Badge className="bg-status-ok text-status-ok-foreground">Aktywne</Badge>
                    : <Badge variant="outline">Zaproszenie wysłane</Badge>}
                </td>
                <td className="px-6 py-3">
                  {entries.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-xs font-bold font-mono">{totalDays} dni</div>
                      <div className="flex flex-wrap gap-1">
                        {entries.map(([type, n]) => (
                          <Badge key={type} variant="outline" className="text-[10px] font-normal">
                            {LEAVE_TYPE_LABEL[type] ?? type}: {n}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 text-right space-x-2 whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Edytuj</Button>
                  <Button variant="ghost" size="sm" onClick={() => onToggleActive(u)}>
                    {u.active ? "Zablokuj" : "Aktywuj"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onResetPassword(u)}>Reset hasła</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onDelete(u)}>Usuń</Button>
                </td>
              </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">Brak użytkowników.</td></tr>
            )}

          </tbody>
        </table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edycja profilu</DialogTitle>
          </DialogHeader>
          {edit && (
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Imię i nazwisko</Label>
                  <Input
                    required
                    value={edit.full_name}
                    onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nr służbowy</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={4}
                    value={edit.employee_id}
                    onChange={(e) =>
                      setEdit({ ...edit, employee_id: e.target.value.replace(/\D/g, "").slice(0, 4) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Zajezdnia</Label>
                  <Select value={edit.depot} onValueChange={(v) => setEdit({ ...edit, depot: v })}>
                    <SelectTrigger><SelectValue placeholder="Wybierz…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Królewska">Królewska</SelectItem>
                      <SelectItem value="Kijowska">Kijowska</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Rola</Label>
                  <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Kierowca</SelectItem>
                      <SelectItem value="dyspozytor">Dyspozytor</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Roblox</Label>
                  <Input
                    value={edit.roblox_username}
                    onChange={(e) => setEdit({ ...edit, roblox_username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Discord</Label>
                  <Input
                    value={edit.discord_username}
                    onChange={(e) => setEdit({ ...edit, discord_username: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Telefon</Label>
                  <Input
                    value={edit.phone}
                    onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>O pracowniku</Label>
                  <Textarea
                    rows={3}
                    maxLength={500}
                    value={edit.bio}
                    onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEdit(null)}>Anuluj</Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Zapisywanie…" : "Zapisz"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
