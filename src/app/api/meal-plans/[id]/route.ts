import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user: coach },
  } = await supabase.auth.getUser();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("meal_plans")
    .select("id, coach_id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!row || row.coach_id !== coach.id) {
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

  // Drop storage object first; if that fails the row stays so it's retryable.
  const { error: removeError } = await admin.storage
    .from("meal-plans")
    .remove([row.storage_path]);
  if (removeError) {
    return NextResponse.json(
      { error: "Storage delete failed", detail: removeError.message },
      { status: 500 },
    );
  }

  const { error: deleteError } = await admin
    .from("meal_plans")
    .delete()
    .eq("id", id);
  if (deleteError) {
    return NextResponse.json(
      { error: "DB delete failed", detail: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
