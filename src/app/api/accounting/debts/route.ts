import { NextRequest, NextResponse } from 'next/server';
import { debtServices } from '@/lib/accounting-services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch all debts (supports ?page=&pageSize=)
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

    const debts = await debtServices.getAll({ limit: pageSize, offset });

    const serverClient = createServerSupabaseClient();
    const { count } = await serverClient.from('debts').select('id', { count: 'exact', head: true });

    const res = NextResponse.json(debts);
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    console.error('Error in GET /api/accounting/debts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new debt
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const { client_name, amount, due_date } = data;
    if (!client_name || !amount || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: client_name, amount, due_date' }, 
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

    const debtData = {
      client_name,
      amount: parsedAmount,
      due_date,
      status: data.status || 'current',
      invoice_number: data.invoice_number,
      notes: data.notes,
      clinic_id: data.clinic_id
    };

    const debt = await debtServices.create(debtData);
    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/accounting/debts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}