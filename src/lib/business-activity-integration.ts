/**
 * Business Activity Integration Service
 * يدمج نظام تسجيل الأنشطة مع جميع العمليات التجارية في النظام
 */

import { logVisit, logOrder, logCollection, logClinicRegistration } from './activity-logger';

// دمج مع نظام الزيارات
export const integrateVisitLogging = () => {
    // يجب استدعاء هذه الدالة بعد إنشاء زيارة جديدة
    return {
        async logNewVisit(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, visitData?: any) {
            await logVisit(visitData?.id || 'new-visit', clinic.name);
        },
        
        async logVisitCompletion(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, outcome?: string) {
            await logVisit('visit-completed', clinic.name);
        }
    };
};

// دمج مع نظام الطلبات
export const integrateOrderLogging = () => {
    return {
        async logNewOrder(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, orderId: string, orderData?: any) {
            const totalAmount = orderData?.total || orderData?.totalAmount || 0;
            await logOrder(orderId, clinic.name, totalAmount);
        },
        
        async logOrderStatusChange(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, orderId: string, newStatus: string, oldStatus: string) {
            await logOrder(orderId, clinic.name, 0);
        },
        
        async logOrderCancellation(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, orderId: string, reason?: string) {
            await logOrder(orderId, clinic.name, 0);
        }
    };
};

// دمج مع نظام التحصيل
export const integrateCollectionLogging = () => {
    return {
        async logNewCollection(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, amount: number, paymentMethod?: string) {
            await logCollection('payment-' + Date.now(), amount, paymentMethod || 'cash', clinic.name);
        },
        
        async logPartialPayment(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, paidAmount: number, remainingAmount: number) {
            await logCollection('partial-payment-' + Date.now(), paidAmount, 'partial', clinic.name);
        },
        
        async logDebtSettlement(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, totalAmount: number) {
            await logCollection('settlement-' + Date.now(), totalAmount, 'settlement', clinic.name);
        }
    };
};

// دمج مع نظام تسجيل العيادات
export const integrateClinicLogging = () => {
    return {
        async logNewClinicRegistration(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, clinicData?: any) {
            await logClinicRegistration(clinic.id, clinic.name);
        },
        
        async logClinicUpdate(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, updatedFields: string[]) {
            await logClinicRegistration(clinic.id, clinic.name);
        },
        
        async logClinicStatusChange(user: { id: string; name: string; role: string }, clinic: { id: string; name: string }, newStatus: string, oldStatus: string) {
            await logClinicRegistration(clinic.id, clinic.name);
        }
    };
};

// خدمة شاملة للدمج مع جميع العمليات التجارية
export const BusinessActivityLogger = {
    visits: integrateVisitLogging(),
    orders: integrateOrderLogging(),
    collections: integrateCollectionLogging(),
    clinics: integrateClinicLogging(),
    
    // دالة مساعدة للحصول على معلومات المستخدم من الجلسة
    async getCurrentUser() {
        // هذا مثال - يجب تعديله وفقاً لنظام المصادقة المستخدم
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const user = await response.json();
                return {
                    id: user.id,
                    name: user.fullName || user.name,
                    role: user.role
                };
            }
        } catch (error) {
            console.warn('Failed to get current user for activity logging:', error);
        }
        return null;
    },
    
    // دالة مساعدة لتسجيل أي نشاط مخصص
    async logCustomActivity(type: string, title: string, details: string, entityId?: string) {
        const user = await this.getCurrentUser();
        if (user) {
            // يمكن استخدام logActivity مباشرة للأنشطة المخصصة
            const { logActivity } = await import('./activity-logger');
            await logActivity({
                action: type,
                entity_type: type,
                entity_id: entityId || 'custom',
                title,
                details,
                type: 'other'
            });
        }
    }
};

// مثال على كيفية الاستخدام:
/*
// في ملف إدارة الزيارات:
import { BusinessActivityLogger } from '@/lib/business-activity-integration';

const createVisit = async (visitData) => {
    // إنشاء الزيارة في قاعدة البيانات
    const newVisit = await saveVisitToDatabase(visitData);
    
    // تسجيل النشاط
    const user = await BusinessActivityLogger.getCurrentUser();
    if (user) {
        await BusinessActivityLogger.visits.logNewVisit(
            user,
            { id: visitData.clinicId, name: visitData.clinicName },
            visitData
        );
    }
    
    return newVisit;
};

// في ملف إدارة الطلبات:
const createOrder = async (orderData) => {
    const newOrder = await saveOrderToDatabase(orderData);
    
    const user = await BusinessActivityLogger.getCurrentUser();
    if (user) {
        await BusinessActivityLogger.orders.logNewOrder(
            user,
            { id: orderData.clinicId, name: orderData.clinicName },
            newOrder.id,
            orderData
        );
    }
    
    return newOrder;
};
*/