import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { paymentsService } from '@/lib/accounts/payments';

// GET - list payments with optional simple filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single payment by id
    if (id) {
      const payment = await paymentsService.getPayment(id);
      if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(payment);
    }

    // Basic filters (optional)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    // Support both pageSize and legacy limit param
    const pageSizeParam = searchParams.get('pageSize') || searchParams.get('limit') || '50';
    const pageSize = Math.max(1, Math.min(parseInt(pageSizeParam, 10) || 50, 1000));

    const filters: any = {};
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const payment_method = searchParams.get('payment_method');
    const customer_id = searchParams.get('customer_id');
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');

    if (search) filters.search = search;
    if (status) filters.status = status;
    if (payment_method) filters.payment_method = payment_method;
    if (customer_id) filters.customer_id = customer_id;
    if (date_from) filters.date_from = date_from;
    if (date_to) filters.date_to = date_to;

    const result = await paymentsService.getPayments(filters, page, pageSize);
    const res = NextResponse.json(result);
    if (typeof result.totalCount === 'number') {
      res.headers.set('X-Total-Count', String(result.totalCount));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    console.error('Error in GET /api/accounting/payments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - create new payment with optional allocations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const { customer_id, amount, payment_method, payment_date } = data;
    if (!customer_id || !amount || !payment_method || !payment_date) {
      return NextResponse.json(
        { error: 'Missing required fields: customer_id, amount, payment_method, payment_date' },
        { status: 400 }
      );
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Build payload for service
    const payload = {
      customer_id: String(customer_id),
      amount: parsedAmount,
      payment_method: String(payment_method),
      payment_reference: data.payment_reference || undefined,
      payment_date: String(payment_date),
      bank_date: data.bank_date || undefined,
      notes: data.notes || undefined,
      bank_name: data.bank_name || undefined,
      allocations: Array.isArray(data.allocations) ? data.allocations : [],
    } as any;

    const payment = await paymentsService.createPayment(payload);
    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/accounting/payments:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment' }, { status: 500 });
  }
}
