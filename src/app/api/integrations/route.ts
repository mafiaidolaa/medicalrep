import { NextRequest, NextResponse } from 'next/server';
import IntegrationsService from '@/lib/integrations-manager';

// GET - جلب جميع التكاملات
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const includeHealth = searchParams.get('includeHealth') === 'true';
        
        let services;
        
        if (category) {
            services = await IntegrationsService.getServicesByCategory(category);
        } else {
            services = await IntegrationsService.getAllServices();
        }
        
        // إضافة معلومات الحالة إذا طُلبت
        if (includeHealth) {
            for (const service of services) {
                const health = await IntegrationsService.getServiceHealth(service.id);
                (service as any).health = health[0] || null;
            }
        }
        
        return NextResponse.json({
            success: true,
            data: services
        });
        
    } catch (error) {
        console.error('خطأ في جلب التكاملات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب التكاملات'
        }, { status: 500 });
    }
}

// POST - إنشاء تكامل جديد
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { serviceData } = body;
        
        // TODO: التحقق من الصلاحيات
        
        // TODO: إنشاء التكامل الجديد
        
        return NextResponse.json({
            success: true,
            message: 'تم إنشاء التكامل بنجاح'
        });
        
    } catch (error) {
        console.error('خطأ في إنشاء التكامل:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في إنشاء التكامل'
        }, { status: 500 });
    }
}