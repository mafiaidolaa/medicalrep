import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/products - List products with optional filtering and soft delete support
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || searchParams.get('search');
    const id = searchParams.get('id');
    const line = searchParams.get('line')?.trim();
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log(`🔍 Fetching products from DB - Direct query`);

    // Build base query with soft delete filtering
    let query = (supabase as any)
      .from('products')
      .select(`
        id,
        name,
        sku,
        price,
        cost_price,
        stock,
        min_stock_level,
        max_stock_level,
        average_daily_usage,
        line,
        unit,
        image_url,
        created_at,
        updated_at,
        deleted_at,
        deleted_by
      `)
      .order('created_at', { ascending: false });

    // Apply soft delete filter unless explicitly requested
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Apply filters
    if (id) {
      query = query.eq('id', id).limit(1);
    } else {
      if (q?.trim()) {
        query = query.or(`name.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`);
      }
      if (line) {
        query = query.eq('line', line);
      }
      query = query.range(offset, offset + limit - 1);
    }

    const { data: baseRows, error } = await query;
    if (error) {
      console.error('❌ GET /api/products error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    const products = baseRows || [];
    
    // Optionally fetch product details if needed
    const ids = products.map((p: any) => p.id).filter(Boolean);
    let detailsById: Record<string, any> = {};
    if (ids.length > 0 && searchParams.get('include_details') === 'true') {
      try {
        const { data: detailsRows } = await (supabase as any)
          .from('product_details')
          .select('*')
          .in('product_id', ids);
        (detailsRows || []).forEach((d: any) => { detailsById[d.product_id] = d; });
      } catch (detailsError) {
        console.warn('Product details fetch error (ignored):', detailsError);
      }
    }

    const merged = products.map((p: any) => ({
      ...p,
      details: detailsById[p.id] || null
    }));

    console.log(`✅ Products retrieved: ${merged.length} records`);

    return NextResponse.json(merged, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'X-Record-Count': merged.length.toString()
      }
    });
  } catch (error: any) {
    console.error('❌ GET /api/products exception:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(error?.message || error) 
    }, { status: 500 });
  }
}

// POST /api/products
// Body: { id?, name, sku?, price, stock, line, image_url?, average_daily_usage?, cost?, unit?, min_stock_level?, max_stock_level?, details? }
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();

    // Validation
    const name = (body.name || '').trim();
    if (!name) {
      return NextResponse.json({ 
        error: 'فشل إضافة المنتج', 
        details: 'اسم المنتج مطلوب' 
      }, { status: 400 });
    }

    const priceNum = Number(body.price);
    if (!isFinite(priceNum)) {
      return NextResponse.json({ 
        error: 'فشل إضافة المنتج', 
        details: 'السعر مطلوب ويجب أن يكون رقماً صحيحاً' 
      }, { status: 400 });
    }

    // Ensure SKU exists and is unique (retry up to 3 times on conflict)
    const generateSku = () => {
      const base = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'PRD';
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      return `${base}-${rand}`;
    };

    let sku = (body.sku || body.SKU || '').trim();
    if (!sku) sku = generateSku();

    const productBase: any = {
      id: body.id,
      name,
      sku,
      price: priceNum,
      cost_price: body.cost_price ?? body.cost ?? null,
      image_url: body.image_url ?? body.imageUrl ?? null,
      stock: isFinite(Number(body.stock)) ? Number(body.stock) : 0,
      min_stock_level: body.min_stock_level ?? body.min_stock ?? null,
      max_stock_level: body.max_stock_level ?? body.max_stock ?? null,
      average_daily_usage: isFinite(Number(body.average_daily_usage ?? body.averageDailyUsage)) ? Number(body.average_daily_usage ?? body.averageDailyUsage) : 0,
      line: body.line || null,
      unit: body.unit ?? null,
      created_at: new Date().toISOString(),
    };

    console.log('[Products API] Attempting to insert product:', productBase.name, 'SKU:', productBase.sku);

    let insertResult: any = null;
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const tryInsert = await (supabase as any)
        .from('products')
        .insert(productBase)
        .select()
        .single();
      if (!tryInsert.error) {
        insertResult = tryInsert.data;
        break;
      }
      lastError = tryInsert.error;
      if (String(tryInsert.error?.code) === '23505' && /sku/i.test(String(tryInsert.error?.message))) {
        // Duplicate SKU, regenerate and retry
        productBase.sku = generateSku();
        continue;
      }
      // Other errors - break
      break;
    }

    if (!insertResult) {
      const error = lastError;
      console.error('[Products API] Insert error:', error);
      return NextResponse.json({ 
        error: 'فشل إضافة المنتج', 
        details: `خطأ في قاعدة البيانات: ${error?.message || 'غير معروف'}`,
        hint: error?.hint || 'تحقق من صلاحيات المستخدم أو اتصل بالمطور',
        code: error?.code
      }, { status: 500 });
    }

    const data = insertResult;

    if (body.details && data?.id) {
      const details = body.details as any;
      // This table may not exist in all deployments; ignore errors gracefully
      const detailsInsert: any = {
        product_id: data.id,
        sku: details.sku ?? productBase.sku ?? null,
        unit: details.unit ?? productBase.unit ?? null,
        brand: details.brand ?? null,
        supplier: details.supplier ?? null,
        barcode: details.barcode ?? null,
        min_stock_level: details.min_stock_level ?? details.min_stock ?? productBase.min_stock_level ?? null,
        max_stock_level: details.max_stock_level ?? details.max_stock ?? productBase.max_stock_level ?? null,
        status: details.status ?? 'active',
        notes: details.notes ?? null,
        meta: details.meta ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('[Products API] Inserting product details for:', data.id);
      const { error: detailsError } = await (supabase as any)
        .from('product_details')
        .upsert(detailsInsert, { onConflict: 'product_id' });
      
      if (detailsError) {
        console.warn('[Products API] Details insert error (ignored):', detailsError?.message || detailsError);
      }
    }

    console.log('[Products API] Product created successfully:', data.id);
    return NextResponse.json(data, {
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error: any) {
    console.error('[Products API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'فشل إضافة المنتج', 
      details: `خطأ داخلي: ${String(error?.message || error)}`,
      hint: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى'
    }, { status: 500 });
  }
}

// PUT /api/products - Update existing product
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✏️ PUT /api/products - Updating product');
    
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المنتج مطلوب',
        details: 'يجب تحديد معرف المنتج للتحديث'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Prepare update payload
    const payload: any = {
      updated_at: new Date().toISOString()
    };

    // Map fields if provided
    if (updateData.name) payload.name = updateData.name.trim();
    if (updateData.sku) payload.sku = updateData.sku.trim();
    if (updateData.price !== undefined) payload.price = Number(updateData.price);
    if (updateData.cost_price !== undefined) payload.cost_price = Number(updateData.cost_price) || null;
    if (updateData.stock !== undefined) payload.stock = Number(updateData.stock) || 0;
    if (updateData.min_stock_level !== undefined) payload.min_stock_level = Number(updateData.min_stock_level) || null;
    if (updateData.max_stock_level !== undefined) payload.max_stock_level = Number(updateData.max_stock_level) || null;
    if (updateData.average_daily_usage !== undefined) payload.average_daily_usage = Number(updateData.average_daily_usage) || 0;
    if (updateData.line !== undefined) payload.line = updateData.line;
    if (updateData.unit !== undefined) payload.unit = updateData.unit;
    if (updateData.image_url !== undefined) payload.image_url = updateData.image_url;

    console.log('Update payload:', payload);

    const { data, error } = await (supabase as any)
      .from('products')
      .update(payload)
      .eq('id', id)
      .is('deleted_at', null) // Only update non-deleted products
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({
        error: 'فشل تحديث المنتج',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({
        error: 'المنتج غير موجود',
        details: 'لم يتم العثور على المنتج المطلوب تحديثه'
      }, { status: 404 });
    }

    // Update product details if provided
    if (updateData.details && data.id) {
      const details = updateData.details;
      const detailsPayload = {
        product_id: data.id,
        sku: details.sku || data.sku,
        unit: details.unit || data.unit,
        brand: details.brand || null,
        supplier: details.supplier || null,
        barcode: details.barcode || null,
        min_stock_level: details.min_stock_level || data.min_stock_level,
        max_stock_level: details.max_stock_level || data.max_stock_level,
        status: details.status || 'active',
        notes: details.notes || null,
        meta: details.meta || null,
        updated_at: new Date().toISOString()
      };

      const { error: detailsError } = await (supabase as any)
        .from('product_details')
        .upsert(detailsPayload, { onConflict: 'product_id' });
      
      if (detailsError) {
        console.warn('Product details update error (ignored):', detailsError);
      }
    }

    console.log('✅ Product updated successfully:', data);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (e: any) {
    console.error('PUT /api/products exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}

// DELETE /api/products - Soft delete product
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ DELETE /api/products - Soft deleting product');
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const permanent = url.searchParams.get('permanent') === 'true';
    
    if (!id) {
      return NextResponse.json({
        error: 'معرف المنتج مطلوب',
        details: 'يجب تحديد معرف المنتج للحذف'
      }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Check user permissions for permanent delete
    if (permanent) {
      const role = String((session?.user as any)?.role || '').toLowerCase();
      if (!['admin', 'gm'].includes(role)) {
        return NextResponse.json({
          error: 'غير مصرح',
          details: 'الحذف النهائي متاح للمديرين العامين فقط'
        }, { status: 403 });
      }
    }

    if (permanent) {
      // Permanent delete - also delete related records
      try {
        // Delete product details first
        await (supabase as any)
          .from('product_details')
          .delete()
          .eq('product_id', id);
      } catch (detailsDeleteError) {
        console.warn('Product details delete error (ignored):', detailsDeleteError);
      }

      const { data, error } = await (supabase as any)
        .from('products')
        .delete()
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Permanent delete error:', error);
        return NextResponse.json({
          error: 'فشل الحذف النهائي للمنتج',
          details: error.message
        }, { status: 500 });
      }

      console.log('✅ Product permanently deleted:', data);
      return NextResponse.json({ 
        success: true, 
        message: 'تم حذف المنتج نهائياً',
        deleted: data 
      });
    } else {
      // Soft delete
      const payload = {
        deleted_at: new Date().toISOString(),
        deleted_by: session?.user?.id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await (supabase as any)
        .from('products')
        .update(payload)
        .eq('id', id)
        .is('deleted_at', null) // Only soft delete non-deleted products
        .select()
        .single();

      if (error) {
        console.error('Soft delete error:', error);
        return NextResponse.json({
          error: 'فشل حذف المنتج',
          details: error.message
        }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({
          error: 'المنتج غير موجود',
          details: 'لم يتم العثور على المنتج المطلوب حذفه'
        }, { status: 404 });
      }

      console.log('✅ Product soft deleted successfully:', data);
      
      return NextResponse.json({ 
        success: true, 
        message: 'تم نقل المنتج إلى سلة المهملات',
        deleted: data 
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (e: any) {
    console.error('DELETE /api/products exception:', e);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: String(e?.message || e) 
    }, { status: 500 });
  }
}
