import { NextRequest, NextResponse } from 'next/server';
import { collectionServices } from '@/lib/accounting-services';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

// GET - Fetch all collections (supports ?page=&pageSize=)
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

    const collections = await collectionServices.getAll({ limit: pageSize, offset });

    const serverClient = createServerSupabaseClient();
    const { count } = await serverClient.from('collections').select('id', { count: 'exact', head: true });

    const res = NextResponse.json(collections);
    if (typeof count === 'number') {
      res.headers.set('X-Total-Count', String(count));
      res.headers.set('Access-Control-Expose-Headers', 'X-Total-Count');
    }
    return res;
  } catch (error: any) {
    console.error('Error in GET /api/accounting/collections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new collection
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    const { clinic_id, amount, collection_date, payment_method } = data;
    if (!clinic_id || !amount || !collection_date || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: clinic_id, amount, collection_date, payment_method' }, 
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

    // Validate payment method
    const validMethods = ['cash', 'check', 'bank_transfer'];
    if (!validMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' }, 
        { status: 400 }
      );
    }

    const collectionData = {
      clinic_id,
      amount: parsedAmount,
      collection_date,
      payment_method,
      notes: data.notes
    };

    const collection = await collectionServices.create(collectionData);
    return NextResponse.json(collection, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/accounting/collections:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}