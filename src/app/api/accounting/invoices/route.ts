import { NextRequest, NextResponse } from 'next/server';
import { invoiceServices } from '@/lib/accounting-services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch all invoices (supports ?page=&pageSize=)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const pageSizeParam = url.searchParams.get('pageSize') || '200';
    const pageParam = url.searchParams.get('page') || '1';
    const pageSize = Math.max(1, Math.min(parseInt(pageSizeParam, 10) || 200, 1000));
    const page = Math.max(1, parseInt(pageParam, 10) || 1);
    const offset = (page - 1) * pageSize;

    const invoices = await invoiceServices.getAll({ limit: pageSize, offset });

    // total count (service role to bypass RLS)
    const serverClient = createServerSupabaseClient();
    const { count } = await serverClient.from('invoices').select('id', { count: 'exact', head: true });

    const res = NextResponse.json(invoices);
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    console.error('Error in GET /api/accounting/invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const { client_name, amount, invoice_date, due_date } = data;
    if (!client_name || !amount || !invoice_date || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: client_name, amount, invoice_date, due_date' }, 
        { status: 400 }
      );
    }

    // Ensure amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' }, 
        { status: 400 }
      );
    }

    const invoiceData = {
      client_name,
      amount: parsedAmount,
      invoice_date,
      due_date,
      description: data.description,
      status: data.status || 'pending',
      clinic_id: data.clinic_id
    };

    const invoice = await invoiceServices.create(invoiceData);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/accounting/invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}