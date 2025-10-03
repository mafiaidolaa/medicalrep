import { NextRequest, NextResponse } from 'next/server';
import AIAnalyticsService from '@/lib/ai-analytics-manager';

// GET - جلب ملخص التحليلات
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const limit = parseInt(searchParams.get('limit') || '10');
        
        if (type === 'summary') {
            // جلب الملخص العام
            const summary = await AIAnalyticsService.getAnalyticsSummary();
            return NextResponse.json({
                success: true,
                data: summary
            });
        }
        
        if (type === 'categories') {
            // جلب تصنيفات التحليلات
            const categories = await AIAnalyticsService.getAllCategories();
            return NextResponse.json({
                success: true,
                data: categories
            });
        }
        
        if (type === 'metrics') {
            // جلب مقاييس الأداء
            const metrics = await AIAnalyticsService.getAllMetrics();
            return NextResponse.json({
                success: true,
                data: metrics
            });
        }
        
        // الافتراضي - جلب كل شيء
        const [summary, categories, metrics] = await Promise.all([
            AIAnalyticsService.getAnalyticsSummary(),
            AIAnalyticsService.getAllCategories(),
            AIAnalyticsService.getAllMetrics()
        ]);
        
        return NextResponse.json({
            success: true,
            data: {
                summary,
                categories,
                metrics
            }
        });
        
    } catch (error) {
        console.error('خطأ في جلب بيانات التحليلات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب بيانات التحليلات'
        }, { status: 500 });
    }
}

// POST - إنشاء بيانات تجريبية أو تسجيل مقياس
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, data } = body;
        
        // TODO: التحقق من الصلاحيات
        
        if (action === 'generate_sample_data') {
            const success = await AIAnalyticsService.generateSampleData();
            
            return NextResponse.json({
                success,
                message: success ? 'تم إنشاء البيانات التجريبية بنجاح' : 'فشل في إنشاء البيانات التجريبية'
            });
        }
        
        if (action === 'record_metric') {
            const { metricId, value, metadata, source } = data;
            const success = await AIAnalyticsService.recordMetricData(metricId, value, metadata, source);
            
            return NextResponse.json({
                success,
                message: success ? 'تم تسجيل بيانات المقياس' : 'فشل في تسجيل بيانات المقياس'
            });
        }
        
        return NextResponse.json({
            success: false,
            error: 'إجراء غير صالح'
        }, { status: 400 });
        
    } catch (error) {
        console.error('خطأ في معالجة طلب التحليلات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في معالجة الطلب'
        }, { status: 500 });
    }
}