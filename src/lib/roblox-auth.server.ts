// Server-only helpers for Roblox HTTPS integration.
// Verifies HMAC-SHA256 signature + timestamp window on incoming requests.
import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_MS = 5 * 60 * 1000;

export type RobloxVerifyResult =
  | { ok: true; body: string; json: any }
  | { ok: false; status: number; message: string };

export async function verifyRobloxRequest(request: Request): Promise<RobloxVerifyResult> {
  const secret = process.env.ROBLOX_SHARED_SECRET;
  if (!secret) return { ok: false, status: 500, message: "ROBLOX_SHARED_SECRET not configured" };

  const sig = request.headers.get("x-roblox-signature");
  const tsHeader = request.headers.get("x-roblox-timestamp");
  if (!sig || !tsHeader) return { ok: false, status: 401, message: "Missing signature headers" };

  const ts = Number(tsHeader);
  if (!Number.isFinite(ts)) return { ok: false, status: 401, message: "Invalid timestamp" };
  if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return { ok: false, status: 401, message: "Timestamp outside allowed window" };
  }

  const body = await request.text();
  const expected = createHmac("sha256", secret).update(`${tsHeader}.${body}`).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Invalid signature" };
  }

  let json: any = {};
  if (body.length > 0) {
    try { json = JSON.parse(body); } catch { return { ok: false, status: 400, message: "Invalid JSON body" }; }
  }
  return { ok: true, body, json };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-roblox-signature, x-roblox-timestamp",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

// Resolve a Roblox username to the portal user_id via profiles.roblox_username (case-insensitive).
export async function resolveDriverByRoblox(username: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, employee_id, depot, roblox_username")
    .ilike("roblox_username", username)
    .maybeSingle();
  if (error) throw error;
  return data;
}
