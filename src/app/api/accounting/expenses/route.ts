import { NextRequest, NextResponse } from 'next/server';
import { expenseServices } from '@/lib/accounting-services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch all expenses (supports ?page=&pageSize=)
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

    const expenses = await expenseServices.getAll({ limit: pageSize, offset });

    const serverClient = createServerSupabaseClient();
    const { count } = await serverClient.from('expenses').select('id', { count: 'exact', head: true });

    const res = NextResponse.json(expenses);
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    console.error('Error in GET /api/accounting/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const { description, amount, category, expense_date } = data;
    if (!description || !amount || !category || !expense_date) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, category, expense_date' }, 
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

    const expenseData = {
      description,
      amount: parsedAmount,
      category,
      expense_date,
      status: data.status || 'pending',
      notes: data.notes,
      receipt_url: data.receipt_url
    };

    const expense = await expenseServices.create(expenseData);
    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/accounting/expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}