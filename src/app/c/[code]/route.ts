/**
 * @file route.ts
 * @description Endpoint encurtado (/c/[code]) para abrir o lead diretamente no CRM.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> | { code: string } }
) {
  const params = await Promise.resolve(context.params);
  const { code } = params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aceleraautocrm.com.br";
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");

  const supabaseAdmin = createAdminClient();
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("short_code", code)
    .single();

  if (!lead) {
    return NextResponse.redirect(`${cleanBaseUrl}/leads`, { status: 302 });
  }

  return NextResponse.redirect(`${cleanBaseUrl}/leads?lead_id=${lead.id}`, { status: 302 });
}
