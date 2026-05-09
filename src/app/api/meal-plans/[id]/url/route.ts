import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

const SIGN_TTL_SECONDS = 60 * 10; // 10 minutes — long enough to open + read.

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("meal_plans")
    .select("id, coach_id, client_id, storage_path, title")
    .eq("id", id)
    .maybeSingle();

  // Authorize: coach who owns it, or the client it's for.
  if (!row || (row.coach_id !== user.id && row.client_id !== user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const admin = createAdminClient<Database>(adminUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signed, error } = await admin.storage
    .from("meal-plans")
    .createSignedUrl(row.storage_path, SIGN_TTL_SECONDS);

  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { error: "Couldn't sign URL", detail: error?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: signed.signedUrl, title: row.title });
}
