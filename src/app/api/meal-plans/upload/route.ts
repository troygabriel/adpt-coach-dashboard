import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// 20MB matches the bucket's file_size_limit set in
// 20260417_client_nutrition_and_sessions.sql.
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = "application/pdf";

export const runtime = "nodejs";
// Next default body cap is 1MB — bump for 20MB PDF uploads.
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: coach },
  } = await supabase.auth.getUser();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  const clientId = (form.get("clientId") as string | null)?.trim();
  const title = (form.get("title") as string | null)?.trim() || "Meal plan";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }
  if (file.type !== ALLOWED_MIME) {
    return NextResponse.json({ error: "Must be a PDF" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 20MB)" },
      { status: 413 },
    );
  }

  // Confirm the coach owns the relationship with this client. RLS would catch
  // a mismatch on insert, but we want a clean 403 instead of a vague row error.
  const { data: rel } = await supabase
    .from("coach_clients")
    .select("status")
    .eq("coach_id", coach.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!rel || (rel.status !== "active" && rel.status !== "paused")) {
    return NextResponse.json(
      { error: "Not your client (or relationship is archived)" },
      { status: 403 },
    );
  }

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const admin = createAdminClient<Database>(adminUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const safeName = sanitizeFileName(file.name) || "meal-plan.pdf";
  const path = `${clientId}/${Date.now()}_${safeName}`;

  // Upload via service role — the bucket's INSERT policy expects the auth.uid
  // to match the first folder segment, which doesn't hold for coach-side
  // uploads to a client's folder. Service role bypasses RLS for the storage
  // write only; the meal_plans row insert is then attributable to the coach.
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("meal-plans")
    .upload(path, buffer, {
      contentType: ALLOWED_MIME,
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed", detail: uploadError.message },
      { status: 500 },
    );
  }

  const { data: row, error: insertError } = await admin
    .from("meal_plans")
    .insert({
      client_id: clientId,
      coach_id: coach.id,
      title,
      storage_path: path,
      file_size_bytes: file.size,
    })
    .select("id, title, storage_path, file_size_bytes, uploaded_at")
    .single();

  if (insertError || !row) {
    // Best-effort cleanup: if the row insert fails, the orphaned object
    // would never be reachable from the dashboard. Remove it.
    await admin.storage.from("meal-plans").remove([path]);
    return NextResponse.json(
      { error: "Couldn't save meal plan", detail: insertError?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, plan: row });
}

function sanitizeFileName(name: string): string {
  // Strip path bits, keep alnum + dot + dash + underscore.
  return name
    .replace(/.*[/\\]/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
}
