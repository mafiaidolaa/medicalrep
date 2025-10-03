import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient() as any;
    const body = await req.json();
    const { product_id, quantity, movement_type, source = 'manual', source_id } = body || {};

    if (!product_id || !quantity || !movement_type) {
      return NextResponse.json({ error: 'product_id, quantity, movement_type are required' }, { status: 400 });
    }

    // حاول RPC أولاً
    const rpc = await supabase.rpc('adjust_inventory', {
      p_product: product_id,
      p_qty: quantity,
      p_type: movement_type,
      p_source: source,
      p_source_id: source_id ?? null
    });

    if (rpc.error) {
      // Fallback: تحديث مباشر للمخزون ثم تسجيل الحركة
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .select('stock')
        .eq('id', product_id)
        .single();
      if (prodErr) throw prodErr;

      const delta = movement_type === 'in' ? quantity : movement_type === 'out' ? -quantity : quantity;
      const newStock = (prod?.stock ?? 0) + delta;
      if (newStock < 0) return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });

      const { error: upErr } = await supabase
        .from('products')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', product_id);
      if (upErr) throw upErr;

      await supabase
        .from('product_movements')
        .insert({ product_id, movement_type, quantity, source, source_id: source_id ?? null });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
