import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      task_id,
      user_id,
      action, // 'read', 'click', 'complete'
      user_notes = null
    } = body;

    if (!task_id || !user_id || !action) {
      return NextResponse.json({
        error: 'task_id, user_id, and action are required'
      }, { status: 400 });
    }

    // تحديد البيانات حسب نوع الإجراء
    let updateData: any = { user_notes };
    
    if (action === 'read') {
      updateData.read_at = new Date().toISOString();
    } else if (action === 'click') {
      updateData.clicked_at = new Date().toISOString();
    } else if (action === 'complete') {
      updateData.completed_at = new Date().toISOString();
    }

    // تحديث حالة المهمة
    const { data: taskStatus, error } = await supabase
      .from('task_read_status')
      .upsert([{
        task_id,
        user_id,
        ...updateData
      }], {
        onConflict: 'task_id,user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating task status:', error);
      return NextResponse.json({ error: 'Failed to update task status' }, { status: 500 });
    }

    return NextResponse.json({ taskStatus });

  } catch (error) {
    console.error('Error in task-status POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('task_id');
    const userId = searchParams.get('user_id');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('task_read_status')
      .select(`
        *,
        user:user_id(
          id,
          email,
          full_name:raw_user_meta_data->>full_name
        )
      `)
      .eq('task_id', taskId);

    // إذا تم تحديد مستخدم معين
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: taskStatuses, error } = await query;

    if (error) {
      console.error('Error fetching task status:', error);
      return NextResponse.json({ error: 'Failed to fetch task status' }, { status: 500 });
    }

    return NextResponse.json({ taskStatuses });

  } catch (error) {
    console.error('Error in task-status GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}