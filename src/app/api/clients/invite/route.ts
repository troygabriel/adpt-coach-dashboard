import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user: coach },
  } = await supabase.auth.getUser();

  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name")
    .eq("id", coach.id)
    .single();

  if (profile?.role !== "coach" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = (body?.email as string | undefined)?.trim().toLowerCase();
  const fullName = (body?.full_name as string | undefined)?.trim() || null;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (email === coach.email?.toLowerCase()) {
    return NextResponse.json({ error: "Can't invite yourself" }, { status: 400 });
  }

  // Self-heal: ensure the coach has a row in `coaches` (some legacy accounts
  // predate the auto-create trigger).
  await supabase
    .from("coaches")
    .upsert(
      {
        id: coach.id,
        display_name: profile?.first_name || coach.email || "Coach",
        is_accepting_clients: true,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  // Branch 1: user already exists → just link them.
  const { data: existingId } = await supabase.rpc("get_user_id_by_email", {
    p_email: email,
  });

  if (existingId) {
    const { error } = await supabase.from("coach_clients").insert({
      coach_id: coach.id,
      client_id: existingId,
      status: "active",
      started_at: new Date().toISOString(),
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Client already on your roster" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "linked", client_id: existingId });
  }

  // Branch 2: new user → create invitation row + send Supabase magic-link email.
  const { data: invite, error: inviteError } = await supabase
    .from("client_invitations")
    .insert({ coach_id: coach.id, email })
    .select("token, expires_at")
    .single();

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: `Failed to create invitation: ${inviteError?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${invite.token}`;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteUrl,
    data: {
      invite_token: invite.token,
      coach_id: coach.id,
      full_name: fullName,
      role: "client",
    },
  });

  return NextResponse.json({
    status: "invited",
    invite_url: inviteUrl,
    expires_at: invite.expires_at,
    email_sent: !emailError,
    email_error: emailError?.message ?? null,
  });
}
