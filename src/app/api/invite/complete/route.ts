/**
 * Unified invite completion endpoint.
 *
 * Handles both arrival paths:
 *   • Email path: client clicked the Supabase invite email, /auth/callback
 *     processed the hash, they're signed in. Auth user already exists.
 *   • Manual-share path: coach pasted the /invite/<token> URL into a chat,
 *     client opened it without ever going through Supabase verify. No
 *     session, auth user may or may not exist (depends on whether the
 *     invite email was sent first).
 *
 * Both paths submit the same payload: { token, password, fullName, intake }.
 * This route uses the service role to find-or-create the auth user, set
 * the password, link them to the coach, mark the invitation accepted,
 * and persist intake — atomically from the client's POV.
 *
 * The client then calls signInWithPassword(email, password) on the next
 * tick to establish a session cookie. All RLS-protected data is written
 * here as service role, so a session isn't required to commit the work.
 */

import { NextResponse } from "next/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

type IntakeFields = {
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  primary_goal?: string | null;
  experience_level?: string | null;
  training_days_per_week?: number | null;
  equipment_access?: string | null;
  injuries?: string | null;
  dietary_notes?: string | null;
};

type Body = {
  token?: string;
  password?: string;
  fullName?: string | null;
  intake?: IntakeFields;
};

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server is missing Supabase credentials." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body?.token || !body.password) {
    return NextResponse.json(
      { error: "Missing token or password" },
      { status: 400 },
    );
  }
  if (body.password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const admin = createAdmin(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Validate invitation token.
  const { data: invitation, error: inviteErr } = await admin
    .from("client_invitations")
    .select("id, email, coach_id, status, expires_at")
    .eq("token", body.token)
    .maybeSingle();

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }
  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 },
    );
  }
  if (
    invitation.status === "expired" ||
    new Date(invitation.expires_at) < new Date()
  ) {
    return NextResponse.json(
      { error: "Invitation has expired. Ask your coach for a new one." },
      { status: 410 },
    );
  }

  // 2. Find-or-create auth user. The get_user_id_by_email RPC returns null
  //    when the user doesn't exist (manual-share path before any email
  //    was sent), and the user's UUID otherwise (email path or repeat).
  const { data: existingId, error: lookupErr } = await admin.rpc(
    "get_user_id_by_email",
    { p_email: invitation.email },
  );
  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }

  let userId: string;
  if (existingId) {
    userId = existingId as string;
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password: body.password,
      email_confirm: true,
    });
    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 500 });
    }
  } else {
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: invitation.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          first_name: body.fullName ?? null,
          role: "client",
        },
      });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Couldn't create account" },
        { status: 500 },
      );
    }
    userId = created.user.id;
  }

  // 3. Ensure profile is a client and has the name from the form.
  //    handle_new_user runs as the auth user is created with default
  //    role 'client', but invitation may pre-date that. Upsert is safe.
  await admin.from("profiles").upsert(
    {
      id: userId,
      role: "client",
      first_name: body.fullName ?? null,
    },
    { onConflict: "id" },
  );

  // 4. Link to coach. accept_invitation RPC requires auth.uid(); we
  //    inline the same logic here as service role so the manual-share
  //    path works without an active session.
  const { error: linkErr } = await admin.from("coach_clients").upsert(
    {
      coach_id: invitation.coach_id,
      client_id: userId,
      status: "active",
      started_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,client_id" },
  );
  if (linkErr) {
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  // 5. Mark invitation accepted.
  await admin
    .from("client_invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  // 6. Persist intake (best-effort — non-fatal if this fails).
  if (body.intake) {
    const { error: intakeErr } = await admin
      .from("client_intakes")
      .upsert({ client_id: userId, ...body.intake }, { onConflict: "client_id" });
    if (intakeErr) {
      console.warn("[invite/complete] intake save failed", intakeErr.message);
    }
  }

  return NextResponse.json({ ok: true, email: invitation.email });
}
