import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after an email confirmation link (and, once
// Google/Apple are configured in the dashboard, after OAuth sign-in too).
// It hands us a one-time `code` that we trade for a real session, stored as
// cookies via the server client — then send the browser home.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/`);
}
