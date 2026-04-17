export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { createClient } from "@/src/shared/api/supabase/server";
import { encrypt } from "@/src/shared/lib/crypto";
import { validateImapConnection } from "@/src/features/sync-emails/lib/imap";
import { detectImapSettings } from "@/src/entities/email-account/model/types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { email, password, imapHost, imapPort } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 }
    );
  }

  // Auto-detect IMAP settings if not provided
  const detected = detectImapSettings(email);
  const host = imapHost || detected.host;
  const port = imapPort || detected.port;
  const provider = detected.provider;

  // Validate connection
  const validation = await validateImapConnection(host, port, email, password);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // Encrypt password and save
  const passwordEncrypted = encrypt(password);

  const { error } = await supabase.from("email_accounts").upsert(
    {
      user_id: user.id,
      provider,
      email: email.toLowerCase(),
      imap_host: host,
      imap_port: port,
      imap_password_encrypted: passwordEncrypted,
      is_active: true,
    },
    { onConflict: "user_id,provider,email" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `${email} conectado correctamente via IMAP`,
  });
}
