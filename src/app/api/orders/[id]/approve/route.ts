import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';
import { invoiceServices } from '@/lib/accounting-services';
import { logActivity } from '@/lib/activity-logger';

function generateInvoiceNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${y}${m}-${r}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const orderId = params.id;
    const role = (session.user as any).role || '';
    
    // Parse request body for discount and workflow parameters
    const body = await req.json();
    const { discount = 0, discountType = 'fixed', notes = '', workflowStep = 'user_approve' } = body;

    // Fetch order
    const { data: order, error: orderErr } = await (supabase as any)
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch clinic for name
    let clientName = 'عيادة غير معروفة';
    if (order.clinic_id) {
      const { data: clinic } = await (supabase as any)
        .from('clinics')
        .select('name, doctor_name')
        .eq('id', order.clinic_id)
        .single();
      clientName = clinic?.name || clientName;
    }

    // Handle different workflow steps
    if (workflowStep === 'user_approve') {
      // Step 1: Regular user approves order and creates temporary invoice
      if (order.status !== 'pending') {
        return NextResponse.json({ error: 'Order is not pending approval' }, { status: 400 });
      }
      
      return await handleUserApproval(order, supabase, session, discount, discountType, notes, clientName);
    } else if (workflowStep === 'accounting_approve') {
      // Step 2: Accounting approves temporary invoice and converts to final invoice
      if (!['accountant','admin','gm'].includes(role)) {
        return NextResponse.json({ error: 'Only accounting staff can approve temporary invoices' }, { status: 403 });
      }
      
      if (order.status !== 'temp_invoice') {
        return NextResponse.json({ error: 'Order must have temporary invoice before final approval' }, { status: 400 });
      }
      
      return await handleAccountingApproval(order, supabase, session);
    } else {
      return NextResponse.json({ error: 'Invalid workflow step' }, { status: 400 });
    }

  } catch (e) {
    console.error('Order approve error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function for user approval (creates temporary invoice)
async function handleUserApproval(
  order: any, 
  supabase: any, 
  session: any, 
  discount: number, 
  discountType: string, 
  notes: string, 
  clientName: string
) {
  try {
    // Calculate discount amount
    let discountAmount = 0;
    if (discount > 0) {
      if (discountType === 'percentage') {
        discountAmount = (order.total_amount * discount) / 100;
      } else {
        discountAmount = discount;
      }
    }

    const finalAmount = order.total_amount - discountAmount;

    // Create temporary invoice using the accounting service
    const tempInvoice = await invoiceServices.create({
      client_name: clientName,
      amount: finalAmount,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: order.due_date ? new Date(order.due_date).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: `Temporary invoice for order ${order.id}`,
      status: 'temp_pending', // Custom status for temporary invoices
      clinic_id: order.clinic_id,
      discount_amount: discountAmount,
      discount_type: discountType,
      notes: `${notes}\n\nOriginal order: ${order.id}\nDiscount applied: ${discount}${discountType === 'percentage' ? '%' : ' EGP'}`,
      meta: {
        order_id: order.id,
        order_items: order.items,
        representative_id: order.representative_id,
        original_amount: order.total_amount,
        discount_applied: discountAmount,
        is_temporary: true
      }
    });

    // Update order status and link to temporary invoice
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'temp_invoice',
        temp_invoice_id: tempInvoice.id,
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Log the approval activity
    await logActivity({
      action: 'approve_order',
      entity_type: 'order',
      entity_id: order.id,
      title: `تم اعتماد طلب: ${clientName}`,
      details: `تم اعتماد الطلب وإنشاء فاتورة مؤقتة رقم ${tempInvoice.invoice_number} بقيمة ${finalAmount} ج.م.${discountAmount > 0 ? ` مع خصم ${discountAmount} ج.م.` : ''}`,
      type: 'order'
    });

    return NextResponse.json({
      success: true,
      message: 'تم اعتماد الطلب وإنشاء فاتورة مؤقتة بنجاح',
      data: {
        order_id: order.id,
        temp_invoice_id: tempInvoice.id,
        invoice_number: tempInvoice.invoice_number,
        final_amount: finalAmount,
        discount_applied: discountAmount,
        status: 'temp_invoice'
      }
    });

  } catch (error: any) {
    console.error('Failed to create temporary invoice:', error);
    return NextResponse.json({ 
      error: 'Failed to create temporary invoice', 
      details: error.message 
    }, { status: 500 });
  }
}

// Helper function for accounting approval (converts temporary to final invoice)
async function handleAccountingApproval(order: any, supabase: any, session: any) {
  try {
    if (!order.temp_invoice_id) {
      return NextResponse.json({ error: 'No temporary invoice found for this order' }, { status: 400 });
    }

    // Update temporary invoice to final status
    const finalInvoice = await invoiceServices.update(order.temp_invoice_id, {
      status: 'pending', // Change from temp_pending to regular pending
      description: order.description?.replace('Temporary invoice', 'Invoice') || `Invoice for order ${order.id}`,
      updated_at: new Date().toISOString()
    });

    // Update order status to final invoice
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'final_invoice',
        final_invoice_id: order.temp_invoice_id, // Same invoice, but now final
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // Log the final approval activity
    await logActivity({
      action: 'approve_temp_invoice',
      entity_type: 'invoice',
      entity_id: finalInvoice.id,
      title: `تم اعتماد الفاتورة المؤقتة: ${finalInvoice.invoice_number}`,
      details: `تم اعتماد الفاتورة المؤقتة وتحويلها لفاتورة نهائية بقيمة ${finalInvoice.amount} ج.م.`,
      type: 'invoice'
    });

    return NextResponse.json({
      success: true,
      message: 'تم اعتماد الفاتورة المؤقتة وتحويلها لفاتورة نهائية بنجاح',
      data: {
        order_id: order.id,
        final_invoice_id: finalInvoice.id,
        invoice_number: finalInvoice.invoice_number,
        amount: finalInvoice.amount,
        status: 'final_invoice'
      }
    });

  } catch (error: any) {
    console.error('Failed to approve temporary invoice:', error);
    return NextResponse.json({ 
      error: 'Failed to approve temporary invoice', 
      details: error.message 
    }, { status: 500 });
  }
}
