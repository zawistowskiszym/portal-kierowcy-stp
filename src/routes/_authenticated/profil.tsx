import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile } from "@/lib/portal.functions";
import { useAuth } from "@/hooks/use-auth";
import { signedAvatarUrl } from "@/lib/avatar";

export const Route = createFileRoute("/_authenticated/profil")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mój profil — STP" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile } = useAuth();
  const updateFn = useServerFn(updateMyProfile);
  const [form, setForm] = useState({
    full_name: "",
    employee_id: "",
    depot: "",
    roblox_username: "",
    discord_username: "",
    phone: "",
    bio: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setForm({
        full_name: data.full_name ?? "",
        employee_id: data.employee_id ?? "",
        depot: data.depot ?? "",
        roblox_username: (data as any).roblox_username ?? "",
        discord_username: (data as any).discord_username ?? "",
        phone: (data as any).phone ?? "",
        bio: (data as any).bio ?? "",
      });
      const path = (data as any).avatar_url ?? null;
      setAvatarPath(path);
      setAvatarUrl(await signedAvatarUrl(path));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Plik nie może być większy niż 4 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      await updateFn({ data: { avatar_url: path } });
      if (avatarPath && avatarPath !== path) {
        await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      }
      setAvatarPath(path);
      setAvatarUrl(await signedAvatarUrl(path));
      toast.success("Zdjęcie profilowe zaktualizowane");
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const onRemoveAvatar = async () => {
    if (!avatarPath) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([avatarPath]).catch(() => {});
      await updateFn({ data: { avatar_url: null } });
      setAvatarPath(null);
      setAvatarUrl(null);
      toast.success("Usunięto zdjęcie");
    } catch (err: any) {
      toast.error(err?.message);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.employee_id && !/^\d{4}$/.test(form.employee_id)) {
      toast.error("Nr służbowy musi składać się z 4 cyfr");
      return;
    }
    if (!form.roblox_username.trim()) {
      toast.error("Nazwa użytkownika Roblox jest wymagana");
      return;
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          full_name: form.full_name.trim(),
          employee_id: form.employee_id || null,
          depot: form.depot || null,
          roblox_username: form.roblox_username.trim(),
          discord_username: form.discord_username.trim() || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
        },
      });
      toast.success("Profil zaktualizowany");
    } catch (err: any) {
      toast.error("Błąd", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Ładowanie…</div>;

  const initials = (form.full_name || profile?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mój profil</h1>
        <p className="text-sm text-muted-foreground">Edytuj swoje dane i zdjęcie profilowe.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-5">
        <Avatar className="size-20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={form.full_name} /> : null}
          <AvatarFallback className="text-lg font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <Label htmlFor="avatar-upload" className="block">
            <span className="inline-flex">
              <Button asChild size="sm" disabled={uploading}>
                <span>{uploading ? "Wysyłanie…" : "Zmień zdjęcie"}</span>
              </Button>
            </span>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onUploadAvatar}
              disabled={uploading}
            />
          </Label>
          {avatarPath && (
            <Button variant="ghost" size="sm" onClick={onRemoveAvatar} disabled={uploading}>
              Usuń zdjęcie
            </Button>
          )}
          <p className="text-xs text-muted-foreground">JPG / PNG, do 4 MB.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Imię i nazwisko</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Nr służbowy</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={form.employee_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label>Zajezdnia</Label>
            <Select value={form.depot} onValueChange={(v) => setForm({ ...form, depot: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Królewska">Królewska</SelectItem>
                <SelectItem value="Kijowska">Kijowska</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Telefon</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Nazwa użytkownika Roblox *</Label>
            <Input
              required
              maxLength={40}
              value={form.roblox_username}
              onChange={(e) => setForm({ ...form, roblox_username: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Discord</Label>
            <Input
              maxLength={40}
              value={form.discord_username}
              onChange={(e) => setForm({ ...form, discord_username: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>O mnie</Label>
          <Textarea
            rows={3}
            maxLength={500}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Zapisywanie…" : "Zapisz zmiany"}
          </Button>
        </div>
      </form>
    </div>
  );
}
