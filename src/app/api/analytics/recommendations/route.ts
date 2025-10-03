import { NextRequest, NextResponse } from 'next/server';
import AIAnalyticsService from '@/lib/ai-analytics-manager';

// GET - جلب التوصيات
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10');
        
        const recommendations = await AIAnalyticsService.getRecommendations(status || undefined, limit);
        
        return NextResponse.json({
            success: true,
            data: recommendations
        });
        
    } catch (error) {
        console.error('خطأ في جلب التوصيات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب التوصيات'
        }, { status: 500 });
    }
}

// PUT - تحديث حالة التوصية
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { recommendationId, status } = body;
        
        // TODO: التحقق من الصلاحيات
        
        if (!recommendationId || !status) {
            return NextResponse.json({
                success: false,
                error: 'معرف التوصية والحالة مطلوبان'
            }, { status: 400 });
        }
        
        const success = await AIAnalyticsService.updateRecommendationStatus(recommendationId, status);
        
        return NextResponse.json({
            success,
            message: success ? 'تم تحديث حالة التوصية' : 'فشل في تحديث حالة التوصية'
        });
        
    } catch (error) {
        console.error('خطأ في تحديث التوصية:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في تحديث التوصية'
        }, { status: 500 });
    }
}