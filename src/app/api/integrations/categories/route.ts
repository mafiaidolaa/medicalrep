import { NextRequest, NextResponse } from 'next/server';
import IntegrationsService from '@/lib/integrations-manager';

// GET - جلب جميع تصنيفات التكاملات
export async function GET(request: NextRequest) {
    try {
        const categories = await IntegrationsService.getAllCategories();
        
        return NextResponse.json({
            success: true,
            data: categories
        });
        
    } catch (error) {
        console.error('خطأ في جلب تصنيفات التكاملات:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب تصنيفات التكاملات'
        }, { status: 500 });
    }
}

// POST - إنشاء تصنيف جديد
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { categoryData } = body;
        
        // TODO: التحقق من الصلاحيات
        
        const newCategory = await IntegrationsService.createCategory(categoryData);
        
        return NextResponse.json({
            success: true,
            data: newCategory,
            message: 'تم إنشاء التصنيف بنجاح'
        });
        
    } catch (error) {
        console.error('خطأ في إنشاء التصنيف:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في إنشاء التصنيف'
        }, { status: 500 });
    }
}