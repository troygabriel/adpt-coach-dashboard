import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: coach } } = await supabase.auth.getUser();

  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is a coach
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", coach.id)
    .single();

  if (profile?.role !== "coach" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const body = await request.json();
  const { email, full_name, monthly_rate_cents, notes } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Use admin client to create user (service role can create auth users)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Check if user already exists
  const { data: existing } = await admin.rpc("get_user_id_by_email", { p_email: email });

  if (existing) {
    // User exists — just create the relationship
    const { error } = await supabase.from("coach_clients").insert({
      coach_id: coach.id,
      client_id: existing,
      status: "active",
      started_at: new Date().toISOString(),
      monthly_rate_cents: monthly_rate_cents || null,
      notes: notes || null,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Client already on your roster" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "linked", client_id: existing });
  }

  // Create new auth user with a temporary password
  const tempPassword = `ADPT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: full_name || "",
      role: "client",
    },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  if (!newUser.user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  // Update profile with name
  if (full_name) {
    await admin.from("profiles").update({ first_name: full_name }).eq("id", newUser.user.id);
  }

  // Create coach-client relationship
  const { error: linkError } = await admin.from("coach_clients").insert({
    coach_id: coach.id,
    client_id: newUser.user.id,
    status: "active",
    started_at: new Date().toISOString(),
    monthly_rate_cents: monthly_rate_cents || null,
    notes: notes || null,
  });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "created",
    client_id: newUser.user.id,
    temp_password: tempPassword,
  });
}
