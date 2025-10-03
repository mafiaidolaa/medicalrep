import { NextResponse } from 'next/server';

export async function GET() {
  const need = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM'];
  const missing = need.filter(k => !process.env[k]);
  return NextResponse.json({ ok: missing.length === 0, missing });
}