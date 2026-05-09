/**
 * Dev-only escape hatch for the forgot-password flow.
 *
 * Why this exists: Supabase's resetPasswordForEmail silently no-ops when
 * the redirectTo URL isn't in the project's allow-list, AND email delivery
 * locally depends on having Supabase SMTP configured. This endpoint uses
 * the service role to generate a recovery link directly so the dev can
 * paste it into the browser and reset their password without touching
 * email or whitelist config.
 *
 * GUARD: returns 404 unless NODE_ENV === 'development'. Service-role keys
 * MUST NOT be reachable from a public-facing endpoint in production.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not Found", { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server is missing Supabase credentials." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: string }
    | null;
  const email = body?.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/reset-password` },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ link: data.properties?.action_link ?? null });
}
