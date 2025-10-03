import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET/PUT invoice items for a given invoice id
// GET:    /api/accounting/invoices/[id]/items
// PUT:    /api/accounting/invoices/[id]/items  { items: Array<{ item_name: string; quantity: number; unit_price: number; discount?: { type: 'none'|'percent'|'fixed'; value: string|number } }>, is_demo?: boolean }

function isAllowed(role?: string) {
  return role === 'accountant' || role === 'admin' || role === 'gm';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAllowed((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = createServerSupabaseClient();
    const { data, error } = await (supabase as any)
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !isAllowed((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const isDemo = !!body?.is_demo;

    const supabase = createServerSupabaseClient();

    // Ensure invoice exists
    const { data: invoice, error: invErr } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    if (invErr || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Normalize items
    const normItems = items.map((it: any) => {
      const quantity = Math.max(0, Number(it.quantity) || 0);
      const unit_price = Math.max(0, Number(it.unit_price) || 0);
      const d = it.discount || { type: 'none', value: '' };
      let discount_percentage = 0;
      let discount_amount = 0;
      if (d?.type === 'percent') {
        const v = Math.max(0, Number(d.value) || 0);
        discount_percentage = v;
        discount_amount = (unit_price * quantity) * (v / 100);
      } else if (d?.type === 'fixed') {
        discount_amount = Math.max(0, Number(d.value) || 0);
      }
      const line_total = Math.max(0, (unit_price * quantity) - discount_amount);
      return {
        invoice_id: id,
        item_name: String(it.item_name || '').trim() || 'Item',
        description: String(it.description || ''),
        quantity,
        unit_price,
        discount_percentage,
        discount_amount,
        tax_percentage: 0,
        tax_amount: 0,
        line_total,
      };
    });

    // Replace existing items
    const { error: delErr } = await (supabase as any)
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (normItems.length > 0) {
      const { error: insErr } = await (supabase as any)
        .from('invoice_items')
        .insert(normItems);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    // Recompute invoice amount (unless demo)
    const total = normItems.reduce((s: number, it: any) => s + (it.line_total || 0), 0);
    const newAmount = isDemo || String(invoice?.description || '').includes('[DEMO]') ? 0 : total;

    const { data: updatedInvoice, error: updErr } = await (supabase as any)
      .from('invoices')
      .update({ amount: newAmount, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    // Return current items
    const { data: finalItems, error: getErr } = await (supabase as any)
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true });
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });

    return NextResponse.json({ invoice: updatedInvoice, items: finalItems || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 });
  }
}
