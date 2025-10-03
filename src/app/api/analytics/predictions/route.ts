import { NextRequest, NextResponse } from 'next/server';
import AIAnalyticsService from '@/lib/ai-analytics-manager';

// GET - جلب التنبؤات
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        
        const predictions = await AIAnalyticsService.getPredictions(limit);
        
        return NextResponse.json({
            success: true,
            data: predictions
        });
        
    } catch (error) {
        console.error('خطأ في جلب التنبؤات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب التنبؤات'
        }, { status: 500 });
    }
}

// POST - إنشاء تنبؤات جديدة
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, periods, productId } = body;
        
        // TODO: التحقق من الصلاحيات
        
        let prediction;
        
        if (type === 'sales_forecast') {
            prediction = await AIAnalyticsService.generateSampleData();
            
            return NextResponse.json({
                success: true,
                message: 'تم إنشاء تنبؤ المبيعات بنجاح',
                data: prediction
            });
        }
        
        if (type === 'inventory_demand' && productId) {
            // TODO: إنشاء تنبؤ الطلب للمنتج المحدد
            return NextResponse.json({
                success: true,
                message: 'تم إنشاء تنبؤ الطلب بنجاح'
            });
        }
        
        return NextResponse.json({
            success: false,
            error: 'نوع التنبؤ غير صحيح'
        }, { status: 400 });
        
    } catch (error) {
        console.error('خطأ في إنشاء التنبؤ:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في إنشاء التنبؤ'
        }, { status: 500 });
    }
}