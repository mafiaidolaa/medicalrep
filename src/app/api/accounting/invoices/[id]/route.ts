import { NextRequest, NextResponse } from 'next/server';
import { invoiceServices } from '@/lib/accounting-services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Fetch single invoice
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoice = await invoiceServices.getById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error in GET /api/accounting/invoices/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update invoice
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Parse amount if provided
    if (data.amount) {
      const parsedAmount = parseFloat(data.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return NextResponse.json(
          { error: 'Amount must be a positive number' }, 
          { status: 400 }
        );
      }
      data.amount = parsedAmount;
    }

    const invoice = await invoiceServices.update(id, data);
    return NextResponse.json(invoice);
  } catch (error: any) {
    console.error('Error in PUT /api/accounting/invoices/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete invoice
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete invoice (deleted_at/deleted_by) instead of hard delete
    // Fetch snapshot first
    const { createServerSupabaseClient } = await import('@/lib/supabase');
    const supabase = createServerSupabaseClient();
    const { data: snapshot, error: fetchErr } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr) {
      console.warn('Invoice snapshot fetch failed:', fetchErr);
    }

    const { error: upErr } = await (supabase as any)
      .from('invoices')
      .update({ deleted_at: new Date().toISOString(), deleted_by: (session.user as any)?.id || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // Log to recycle bin
    try {
      const { activityLogger } = await import('@/lib/activity-logger');
      await activityLogger.log({
        action: 'move_to_trash',
        entity_type: 'invoice',
        entity_id: id,
        title: `فاتورة إلى سلة المهملات: ${id}`,
        details: `تم نقل الفاتورة إلى سلة المهملات بواسطة ${(session.user as any)?.email || 'unknown'}`,
        type: 'delete',
        changes: snapshot ? { snapshot } : undefined,
      }, request as any);
    } catch (e) {
      console.warn('Failed to log invoice recycle bin entry');
    }

    return NextResponse.json({ message: 'Invoice moved to trash' });
  } catch (error: any) {
    console.error('Error in DELETE /api/accounting/invoices/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}