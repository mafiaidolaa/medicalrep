import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repId = searchParams.get('rep_id');
    const status = searchParams.get('status');
    const planDate = searchParams.get('plan_date');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = supabase
      .from('rep_plans')
      .select(`
        *,
        rep:rep_id(
          id,
          email,
          full_name:raw_user_meta_data->>full_name
        )
      `)
      .order('plan_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // إضافة الفلاتر
    if (repId) {
      query = query.eq('rep_id', repId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (planDate) {
      query = query.eq('plan_date', planDate);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('Error fetching plans:', error);
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }

    return NextResponse.json({ plans });

  } catch (error) {
    console.error('Error in rep-plans GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      rep_id,
      clinic_id,
      plan_date,
      visit_purpose = 'متابعة',
      notes,
      priority = 'medium'
    } = body;

    if (!rep_id || !clinic_id || !plan_date) {
      return NextResponse.json({
        error: 'rep_id, clinic_id, and plan_date are required'
      }, { status: 400 });
    }

    const { data: plan, error } = await supabase
      .from('rep_plans')
      .insert([{
        rep_id,
        clinic_id,
        plan_date,
        visit_purpose,
        notes,
        priority
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
    }

    return NextResponse.json({ plan }, { status: 201 });

  } catch (error) {
    console.error('Error in rep-plans POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    const action = searchParams.get('action');
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    let updateData: any = {};
    
    if (action === 'mark_visited') {
      updateData = { 
        status: 'visited',
        visited_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } else if (action === 'cancel') {
      updateData = { 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      };
    } else if (action === 'postpone') {
      const body = await request.json();
      updateData = { 
        status: 'postponed',
        plan_date: body.new_plan_date || updateData.plan_date,
        notes: body.notes || updateData.notes,
        updated_at: new Date().toISOString()
      };
    } else {
      const body = await request.json();
      updateData = { ...body, updated_at: new Date().toISOString() };
    }

    const { data: plan, error } = await supabase
      .from('rep_plans')
      .update(updateData)
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan:', error);
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
    }

    return NextResponse.json({ plan });

  } catch (error) {
    console.error('Error in rep-plans PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('rep_plans')
      .delete()
      .eq('id', planId);

    if (error) {
      console.error('Error deleting plan:', error);
      return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in rep-plans DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}