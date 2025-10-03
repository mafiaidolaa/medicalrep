import { NextRequest, NextResponse } from 'next/server';
import IntegrationsService from '@/lib/integrations-manager';

interface RouteParams {
    params: Promise<{ serviceId: string }>
}

// GET - جلب تفاصيل خدمة تكامل محددة
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { serviceId } = await params;
        const { searchParams } = new URL(request.url);
        const includeSettings = searchParams.get('includeSettings') === 'true';
        const includeHealth = searchParams.get('includeHealth') === 'true';
        
        const service = await IntegrationsService.getService(serviceId);
        
        if (!service) {
            return NextResponse.json({
                success: false,
                error: 'الخدمة غير موجودة'
            }, { status: 404 });
        }
        
        const result: any = { service };
        
        // إضافة الإعدادات إذا طُلبت
        if (includeSettings) {
            result.settings = await IntegrationsService.getServiceSettings(service.id);
        }
        
        // إضافة معلومات الحالة إذا طُلبت
        if (includeHealth) {
            result.health = await IntegrationsService.getServiceHealth(service.id);
        }
        
        return NextResponse.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        console.error('خطأ في جلب تفاصيل التكامل:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في جلب تفاصيل التكامل'
        }, { status: 500 });
    }
}

// PUT - تحديث حالة أو إعدادات التكامل
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { serviceId } = await params;
        const body = await request.json();
        const { action, data } = body;
        
        // TODO: التحقق من الصلاحيات
        
        switch (action) {
            case 'updateStatus':
                await IntegrationsService.updateServiceStatus(serviceId, data.status);
                break;
                
            case 'toggleEnabled':
                await IntegrationsService.toggleServiceEnabled(serviceId, data.enabled);
                break;
                
            case 'updateSetting':
                await IntegrationsService.updateServiceSetting(
                    serviceId, 
                    data.settingKey, 
                    data.settingValue, 
                    data.settingType
                );
                break;
                
            case 'storeCredential':
                await IntegrationsService.storeCredential(
                    serviceId,
                    data.credentialType,
                    data.value,
                    data.isProduction || false,
                    data.expiresAt ? new Date(data.expiresAt) : undefined
                );
                break;
                
            case 'testConnection':
                const testResult = await IntegrationsService.testServiceConnection(serviceId);
                return NextResponse.json({
                    success: true,
                    data: testResult
                });
                
            default:
                return NextResponse.json({
                    success: false,
                    error: 'إجراء غير صحيح'
                }, { status: 400 });
        }
        
        return NextResponse.json({
            success: true,
            message: 'تم تحديث التكامل بنجاح'
        });
        
    } catch (error) {
        console.error('خطأ في تحديث التكامل:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في تحديث التكامل'
        }, { status: 500 });
    }
}

// DELETE - حذف بيانات اعتماد أو إعدادات
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { serviceId } = await params;
        const { searchParams } = new URL(request.url);
        const credentialType = searchParams.get('credentialType');
        const isProduction = searchParams.get('isProduction') === 'true';
        
        // TODO: التحقق من الصلاحيات
        
        if (credentialType) {
            await IntegrationsService.deleteCredential(
                serviceId, 
                credentialType as any, 
                isProduction
            );
            
            return NextResponse.json({
                success: true,
                message: 'تم حذف بيانات الاعتماد بنجاح'
            });
        }
        
        return NextResponse.json({
            success: false,
            error: 'بيانات غير صحيحة للحذف'
        }, { status: 400 });
        
    } catch (error) {
        console.error('خطأ في حذف بيانات التكامل:', error);
        return NextResponse.json({
            success: false,
            error: 'فشل في حذف البيانات'
        }, { status: 500 });
    }
}