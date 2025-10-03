import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const taskType = searchParams.get('task_type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // التحقق من دور المستخدم
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userId)
      .single();

    let query = supabase
      .from('manager_tasks')
      .select(`
        *,
        sender:sender_id(
          id,
          email,
          full_name:raw_user_meta_data->>full_name
        ),
        task_read_status!inner(
          read_at,
          clicked_at,
          completed_at,
          user_notes
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // إذا كان المستخدم مدير أو أدمن، جلب جميع المهام
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      // بدون فلتر إضافي
    } else {
      // جلب المهام المخصصة للمستخدم فقط
      query = query.or(`target_users.cs.{${userId}},task_read_status.user_id.eq.${userId}`);
    }

    // إضافة الفلاتر
    if (status) {
      query = query.eq('status', status);
    }
    
    if (taskType) {
      query = query.eq('task_type', taskType);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ tasks });

  } catch (error) {
    console.error('Error in manager-tasks GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sender_id,
      title,
      description,
      task_type = 'general',
      priority = 'medium',
      target_users = [],
      target_roles = [],
      due_date,
      expires_at
    } = body;

    if (!sender_id || !title) {
      return NextResponse.json({
        error: 'sender_id and title are required'
      }, { status: 400 });
    }

    // التحقق من صلاحيات المرسل
    const { data: senderProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', sender_id)
      .single();

    if (!senderProfile || !['admin', 'manager'].includes(senderProfile.role)) {
      return NextResponse.json({
        error: 'Only managers and admins can create tasks'
      }, { status: 403 });
    }

    // إنشاء المهمة
    const { data: task, error } = await supabase
      .from('manager_tasks')
      .insert([{
        sender_id,
        title,
        description,
        task_type,
        priority,
        target_users: target_users.length > 0 ? target_users : null,
        target_roles: target_roles.length > 0 ? target_roles : null,
        due_date,
        expires_at
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    // إرسال الإشعارات تلقائياً
    await supabase.rpc('create_manager_task_notifications', { p_task_id: task.id });

    return NextResponse.json({ task }, { status: 201 });

  } catch (error) {
    console.error('Error in manager-tasks POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const updateData = { ...body, updated_at: new Date().toISOString() };

    const { data: task, error } = await supabase
      .from('manager_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Error in manager-tasks PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('id');
    
    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('manager_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in manager-tasks DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}