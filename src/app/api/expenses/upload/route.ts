import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateUUID } from '@/lib/utils/uuid';

const BUCKET = 'expense-receipts';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Ensure bucket exists (ignore if exists)
    try {
      // @ts-ignore - admin function available with service role
      await (supabase as any).storage.createBucket(BUCKET, { public: true });
    } catch (e: any) {
      // ignore bucket exists errors
    }

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const userId = (session.user as any).id || 'anonymous';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ext = file.name.includes('.') ? file.name.split('.').pop() : (file.type?.split('/').pop() || 'bin');
    const filename = `${generateUUID()}.${ext}`;
    const path = `${userId}/${yyyy}-${mm}/${filename}`;

    const { error: uploadError } = await (supabase as any).storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: pub } = (supabase as any).storage.from(BUCKET).getPublicUrl(path);
    const url = pub?.publicUrl;

    return NextResponse.json({ success: true, url, path });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}