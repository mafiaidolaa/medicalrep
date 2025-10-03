import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  console.log('🧪 Testing Activity Log System...');
  
  try {
    const supabase = createServerSupabaseClient();
    
    // Test 1: Check if table exists and is accessible
    console.log('Test 1: Checking table access...');
    const { data: testRead, error: readError } = await supabase
      .from('activity_log')
      .select('*')
      .limit(1);
    
    if (readError) {
      console.error('❌ Table access error:', readError);
      return NextResponse.json({
        success: false,
        error: 'Cannot access activity_log table',
        details: readError
      });
    }
    
    console.log('✅ Table access successful');
    
    // Test 2: Insert test data
    console.log('Test 2: Inserting test activity...');
    const testActivity = {
      type: 'test',
      title: 'اختبار نظام تسجيل الأنشطة',
      user_id: null,
      action: 'test',
      entity_type: 'system_test',
      entity_id: 'test-' + Date.now(),
      details: 'اختبار شامل لنظام تسجيل الأنشطة - ' + new Date().toLocaleString('ar-EG'),
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_success: true,
      ip_address: '127.0.0.1',
      device: 'Test Device',
      browser: 'Test Browser',
      os: 'Test OS',
      risk_score: 0
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('activity_log')
      .insert(testActivity as any)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return NextResponse.json({
        success: false,
        error: 'Cannot insert into activity_log table',
        details: insertError
      });
    }
    
    console.log('✅ Insert successful:', insertData);
    
    // Test 3: Check if view works
    console.log('Test 3: Checking activity_logs view...');
    const { data: viewData, error: viewError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('id', (insertData as any).id)
      .single();
    
    if (viewError) {
      console.warn('⚠️ View access warning:', viewError);
      // View might not exist yet, but that's okay
    } else {
      console.log('✅ View access successful');
    }
    
    // Test 4: Count total activities
    const { count, error: countError } = await supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total activities in database: ${count}`);
    
    // Test 5: Get recent activities
    const { data: recentData } = await supabase
      .from('activity_log')
      .select('type, title, timestamp, user_id, is_success')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    return NextResponse.json({
      success: true,
      message: 'نظام تسجيل الأنشطة يعمل بنجاح! ✅',
      tests: {
        tableAccess: '✅ نجح',
        dataInsert: '✅ نجح',
        viewAccess: viewError ? '⚠️ تحتاج إعداد' : '✅ نجح',
        totalCount: count || 0
      },
      testData: insertData,
      recentActivities: recentData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'System test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Test endpoint that doesn't require authentication
export async function POST() {
  return NextResponse.json({
    message: 'Use GET method to test the activity logging system'
  });
}