import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// PUT /api/products/[id]
// Body can contain base fields and/or { details: {...} } to upsert product_details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    let updated: any = null;
    let updateError: any = null;

    // Update base product fields if provided
    const updatable: any = {};
    const map = (srcKey: string, destKey?: string) => {
      if (body[srcKey] !== undefined) updatable[destKey || srcKey] = body[srcKey];
    };

    map('name');
    map('price');
    if (body.image_url !== undefined || body.imageUrl !== undefined) {
      updatable.image_url = body.image_url ?? body.imageUrl;
    }
    if (body.stock !== undefined) updatable.stock = body.stock;
    if (body.average_daily_usage !== undefined || body.averageDailyUsage !== undefined) {
      updatable.average_daily_usage = body.average_daily_usage ?? body.averageDailyUsage;
    }
    map('line');

    if (Object.keys(updatable).length > 0) {
      updatable.updated_at = new Date().toISOString();
      const { data, error } = await (supabase as any)
        .from('products')
        .update(updatable)
        .eq('id', id)
        .select()
        .single();
      updated = data;
      updateError = error;
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update product', details: updateError.message }, { status: 500 });
      }
    }

    // Upsert details if provided
    if (body.details) {
      const d = body.details as any;
      const detailsUpsert: any = {
        product_id: id,
        sku: d.sku ?? null,
        unit: d.unit ?? null,
        brand: d.brand ?? null,
        supplier: d.supplier ?? null,
        barcode: d.barcode ?? null,
        min_stock: d.min_stock ?? d.minStock ?? null,
        max_stock: d.max_stock ?? d.maxStock ?? null,
        status: d.status ?? null,
        notes: d.notes ?? null,
        meta: d.meta ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error: detailErr } = await (supabase as any)
        .from('product_details')
        .upsert(detailsUpsert, { onConflict: 'product_id' });

      if (detailErr) {
        return NextResponse.json({ error: 'Failed to upsert product details', details: detailErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: String(error?.message || error) }, { status: 500 });
  }
}

// DELETE /api/products/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = await params;

    // Snapshot
    const { data: snapshot } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    // Try soft-delete: set deleted_at/deleted_by
    let softOk = true;
    const { error: upErr } = await (supabase as any)
      .from('products')
      .update({ deleted_at: new Date().toISOString(), deleted_by: null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (upErr) {
      if (String(upErr?.code) === '42703') {
        softOk = false;
      } else {
        return NextResponse.json({ error: 'Failed to delete product', details: upErr.message }, { status: 500 });
      }
    }

    if (!softOk) {
      // Fall back to hard delete (legacy)
      await (supabase as any)
        .from('product_details')
        .delete()
        .eq('product_id', id);
      const { error } = await (supabase as any)
        .from('products')
        .delete()
        .eq('id', id);
      if (error) return NextResponse.json({ error: 'Failed to delete product', details: error.message }, { status: 500 });
    }

    // Log recycle bin entry
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'product',
        entity_id: id,
        title: `منتج إلى سلة المهملات: ${snapshot?.name || id}`,
        details: `تم نقل المنتج إلى سلة المهملات`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      });
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: String(error?.message || error) }, { status: 500 });
  }
}