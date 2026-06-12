import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a private avatar storage path (e.g. "<uid>/avatar-123.jpg") to a
 * signed URL usable in <img src>. Returns null when no path is supplied.
 */
export async function signedAvatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
