/**
 * نظام إدارة التكاملات والخدمات الخارجية
 * Integration Manager Service
 * 
 * يوفر إدارة شاملة للتكاملات مع الخدمات الخارجية
 */

// @ts-nocheck

import { createServerSupabaseClient } from './supabase';
import crypto from 'crypto';

// تعريف الأنواع
export interface IntegrationCategory {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    icon?: string;
    color: string;
    sort_order: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface ServiceIntegration {
    id: string;
    category_id: string;
    service_key: string;
    display_name: string;
    description?: string;
    provider_name?: string;
    service_type: 'payment' | 'maps' | 'sms' | 'email' | 'notification' | 'analytics' | 'storage';
    icon?: string;
    status: 'active' | 'inactive' | 'testing' | 'error';
    is_enabled: boolean;
    requires_api_key: boolean;
    requires_secret: boolean;
    api_endpoint?: string;
    documentation_url?: string;
    pricing_info?: string;
    features: string[];
    supported_regions: string[];
    sort_order: number;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
    category?: IntegrationCategory;
}

export interface IntegrationCredential {
    id: string;
    service_id: string;
    credential_type: 'api_key' | 'secret_key' | 'access_token' | 'webhook_url' | 'config';
    encrypted_value?: string;
    is_production: boolean;
    expires_at?: string;
    last_used_at?: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
    created_by?: string;
    updated_by?: string;
}

export interface IntegrationSetting {
    id: string;
    service_id: string;
    setting_key: string;
    setting_value: any;
    setting_type: 'string' | 'number' | 'boolean' | 'json' | 'array';
    is_required: boolean;
    description?: string;
    validation_rules: any;
    created_at: string;
    updated_at: string;
}

export interface IntegrationMonitoring {
    id: string;
    service_id: string;
    check_type: 'api_health' | 'quota_usage' | 'rate_limit' | 'error_rate';
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    response_time_ms?: number;
    success_rate?: number;
    quota_used: number;
    quota_limit: number;
    error_count: number;
    last_error?: string;
    details: any;
    checked_at: string;
    created_at: string;
}

export class IntegrationsManager {
    private _supabase: any = null;
    private encryptionKey: string;
    private algorithm = 'aes-256-gcm';
    
    constructor() {
        // استخدام مفتاح تشفير من متغيرات البيئة أو إنشاء مفتاح افتراضي
        this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY || this.generateEncryptionKey();
    }
    
    private getSupabaseClient() {
        if (!this._supabase) {
            this._supabase = createServerSupabaseClient();
        }
        return this._supabase;
    }
    
    private get supabase() {
        return this.getSupabaseClient();
    }
    
    // توليد مفتاح تشفير آمن
    private generateEncryptionKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }
    
    // تشفير البيانات الحساسة
    private encrypt(text: string): { encryptedData: string; iv: string; tag: string } {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
        cipher.setAAD(Buffer.from('integrations', 'utf8'));
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const tag = cipher.getAuthTag();
        
        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            tag: tag.toString('hex')
        };
    }
    
    // فك تشفير البيانات
    private decrypt(encryptedData: string, iv: string, tag: string): string {
        try {
            const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
            decipher.setAAD(Buffer.from('integrations', 'utf8'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('فشل في فك التشفير:', error);
            return '';
        }
    }
    
    // === إدارة تصنيفات التكاملات ===
    
    async getAllCategories(): Promise<IntegrationCategory[]> {
        try {
            const { data, error } = await this.supabase
                .from('integration_categories')
                .select('*')
                .eq('is_enabled', true)
                .order('sort_order', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب تصنيفات التكاملات:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getAllCategories:', error);
            throw error;
        }
    }
    
    async createCategory(categoryData: Partial<IntegrationCategory>): Promise<IntegrationCategory> {
        try {
            const { data, error } = await this.supabase
                .from('integration_categories')
                .insert([categoryData])
                .select()
                .single();
                
            if (error) {
                console.error('خطأ في إنشاء تصنيف التكامل:', error);
                throw error;
            }
            
            console.log(`✅ تم إنشاء تصنيف التكامل: ${categoryData.display_name}`);
            return data;
        } catch (error) {
            console.error('خطأ في createCategory:', error);
            throw error;
        }
    }
    
    // === إدارة الخدمات والتكاملات ===
    
    async getAllServices(): Promise<ServiceIntegration[]> {
        try {
            const { data, error } = await this.supabase
                .from('service_integrations')
                .select(`
                    *,
                    category:integration_categories(*)
                `)
                .order('sort_order', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب خدمات التكامل:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getAllServices:', error);
            throw error;
        }
    }
    
    async getServicesByCategory(categoryId: string): Promise<ServiceIntegration[]> {
        try {
            const { data, error } = await this.supabase
                .from('service_integrations')
                .select(`
                    *,
                    category:integration_categories(*)
                `)
                .eq('category_id', categoryId)
                .order('sort_order', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب خدمات التكامل حسب التصنيف:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getServicesByCategory:', error);
            throw error;
        }
    }
    
    async getService(serviceKey: string): Promise<ServiceIntegration | null> {
        try {
            const { data, error } = await this.supabase
                .from('service_integrations')
                .select(`
                    *,
                    category:integration_categories(*)
                `)
                .eq('service_key', serviceKey)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب خدمة التكامل:', error);
                throw error;
            }
            
            return data || null;
        } catch (error) {
            console.error('خطأ في getService:', error);
            return null;
        }
    }
    
    async updateServiceStatus(serviceId: string, status: 'active' | 'inactive' | 'testing' | 'error'): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('service_integrations')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', serviceId);
                
            if (error) {
                console.error('خطأ في تحديث حالة الخدمة:', error);
                throw error;
            }
            
            console.log(`✅ تم تحديث حالة الخدمة: ${status}`);
            return true;
        } catch (error) {
            console.error('خطأ في updateServiceStatus:', error);
            throw error;
        }
    }
    
    async toggleServiceEnabled(serviceId: string, enabled: boolean): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('service_integrations')
                .update({
                    is_enabled: enabled,
                    updated_at: new Date().toISOString()
                })
                .eq('id', serviceId);
                
            if (error) {
                console.error('خطأ في تغيير حالة تفعيل الخدمة:', error);
                throw error;
            }
            
            console.log(`✅ تم ${enabled ? 'تفعيل' : 'إلغاء تفعيل'} الخدمة`);
            return true;
        } catch (error) {
            console.error('خطأ في toggleServiceEnabled:', error);
            throw error;
        }
    }
    
    // === إدارة بيانات الاعتماد والمفاتيح ===
    
    async storeCredential(
        serviceId: string, 
        credentialType: IntegrationCredential['credential_type'], 
        value: string,
        isProduction: boolean = false,
        expiresAt?: Date
    ): Promise<boolean> {
        try {
            // تشفير القيمة الحساسة
            const encrypted = this.encrypt(value);
            const encryptedValue = JSON.stringify(encrypted);
            
            const credentialData = {
                service_id: serviceId,
                credential_type: credentialType,
                encrypted_value: encryptedValue,
                is_production: isProduction,
                expires_at: expiresAt?.toISOString(),
                usage_count: 0
            };
            
            const { error } = await this.supabase
                .from('integration_credentials')
                .upsert([credentialData], {
                    onConflict: 'service_id,credential_type,is_production',
                    ignoreDuplicates: false
                });
                
            if (error) {
                console.error('خطأ في حفظ بيانات الاعتماد:', error);
                throw error;
            }
            
            console.log(`✅ تم حفظ بيانات الاعتماد: ${credentialType}`);
            return true;
        } catch (error) {
            console.error('خطأ في storeCredential:', error);
            throw error;
        }
    }
    
    async getCredential(
        serviceId: string, 
        credentialType: IntegrationCredential['credential_type'], 
        isProduction: boolean = false
    ): Promise<string> {
        try {
            const { data, error } = await this.supabase
                .from('integration_credentials')
                .select('encrypted_value')
                .eq('service_id', serviceId)
                .eq('credential_type', credentialType)
                .eq('is_production', isProduction)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب بيانات الاعتماد:', error);
                return '';
            }
            
            if (!data?.encrypted_value) {
                return '';
            }
            
            // فك تشفير القيمة
            const encrypted = JSON.parse(data.encrypted_value);
            const decryptedValue = this.decrypt(encrypted.encryptedData, encrypted.iv, encrypted.tag);
            
            // تحديث معداد الاستخدام
            await this.updateCredentialUsage(serviceId, credentialType, isProduction);
            
            return decryptedValue;
        } catch (error) {
            console.error('خطأ في getCredential:', error);
            return '';
        }
    }
    
    private async updateCredentialUsage(
        serviceId: string, 
        credentialType: IntegrationCredential['credential_type'], 
        isProduction: boolean
    ): Promise<void> {
        try {
            await this.supabase.rpc('increment_credential_usage', {
                p_service_id: serviceId,
                p_credential_type: credentialType,
                p_is_production: isProduction
            });
        } catch (error) {
            // تجاهل أخطاء تحديث الاستخدام
            console.warn('تعذر تحديث معداد الاستخدام:', error);
        }
    }
    
    async deleteCredential(
        serviceId: string, 
        credentialType: IntegrationCredential['credential_type'], 
        isProduction: boolean = false
    ): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('integration_credentials')
                .delete()
                .eq('service_id', serviceId)
                .eq('credential_type', credentialType)
                .eq('is_production', isProduction);
                
            if (error) {
                console.error('خطأ في حذف بيانات الاعتماد:', error);
                throw error;
            }
            
            console.log(`✅ تم حذف بيانات الاعتماد: ${credentialType}`);
            return true;
        } catch (error) {
            console.error('خطأ في deleteCredential:', error);
            throw error;
        }
    }
    
    // === إدارة إعدادات التكامل ===
    
    async getServiceSettings(serviceId: string): Promise<IntegrationSetting[]> {
        try {
            const { data, error } = await this.supabase
                .from('integration_settings')
                .select('*')
                .eq('service_id', serviceId)
                .order('setting_key', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب إعدادات التكامل:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getServiceSettings:', error);
            throw error;
        }
    }
    
    async updateServiceSetting(
        serviceId: string, 
        settingKey: string, 
        settingValue: any,
        settingType: IntegrationSetting['setting_type'] = 'string'
    ): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('integration_settings')
                .upsert([{
                    service_id: serviceId,
                    setting_key: settingKey,
                    setting_value: settingValue,
                    setting_type: settingType
                }], {
                    onConflict: 'service_id,setting_key',
                    ignoreDuplicates: false
                });
                
            if (error) {
                console.error('خطأ في تحديث إعداد التكامل:', error);
                throw error;
            }
            
            console.log(`✅ تم تحديث إعداد التكامل: ${settingKey}`);
            return true;
        } catch (error) {
            console.error('خطأ في updateServiceSetting:', error);
            throw error;
        }
    }
    
    // === مراقبة التكاملات ===
    
    async recordMonitoringData(monitoringData: Partial<IntegrationMonitoring>): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('integration_monitoring')
                .insert([{
                    ...monitoringData,
                    checked_at: new Date().toISOString()
                }]);
                
            if (error) {
                console.error('خطأ في تسجيل بيانات المراقبة:', error);
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error('خطأ في recordMonitoringData:', error);
            throw error;
        }
    }
    
    async getServiceHealth(serviceId: string): Promise<IntegrationMonitoring[]> {
        try {
            const { data, error } = await this.supabase
                .from('integration_monitoring')
                .select('*')
                .eq('service_id', serviceId)
                .order('checked_at', { ascending: false })
                .limit(10);
                
            if (error) {
                console.error('خطأ في جلب حالة التكامل:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getServiceHealth:', error);
            throw error;
        }
    }
    
    // === اختبار التكاملات ===
    
    async testServiceConnection(serviceKey: string): Promise<{ success: boolean; message: string; responseTime?: number }> {
        try {
            const service = await this.getService(serviceKey);
            if (!service) {
                return { success: false, message: 'الخدمة غير موجودة' };
            }
            
            if (!service.api_endpoint) {
                return { success: false, message: 'لا يوجد عنوان API للخدمة' };
            }
            
            const startTime = Date.now();
            
            // اختبار اتصال بسيط
            const response = await fetch(service.api_endpoint, {
                method: 'GET',
                timeout: 10000, // 10 ثوانٍ
                headers: {
                    'User-Agent': 'EP-Group-Integration-Test/1.0'
                }
            });
            
            const responseTime = Date.now() - startTime;
            
            // تسجيل نتيجة الاختبار
            await this.recordMonitoringData({
                service_id: service.id,
                check_type: 'api_health',
                status: response.ok ? 'healthy' : 'warning',
                response_time_ms: responseTime,
                details: {
                    status_code: response.status,
                    test_type: 'connection'
                }
            });
            
            return {
                success: response.ok,
                message: response.ok ? 'الاتصال نجح' : `فشل الاتصال: ${response.status}`,
                responseTime
            };
            
        } catch (error) {
            console.error('خطأ في اختبار الاتصال:', error);
            return { success: false, message: `خطأ في الاتصال: ${error.message}` };
        }
    }
    
    // === دوال مساعدة ===
    
    async getIntegrationsSummary(): Promise<{
        totalServices: number;
        activeServices: number;
        categories: number;
        healthyServices: number;
    }> {
        try {
            const [services, categories, healthData] = await Promise.all([
                this.getAllServices(),
                this.getAllCategories(),
                this.supabase
                    .from('integration_monitoring')
                    .select('service_id, status')
                    .eq('check_type', 'api_health')
                    .gte('checked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            ]);
            
            const healthyServices = new Set(
                healthData.data
                    ?.filter(h => h.status === 'healthy')
                    ?.map(h => h.service_id) || []
            ).size;
            
            return {
                totalServices: services.length,
                activeServices: services.filter(s => s.status === 'active').length,
                categories: categories.length,
                healthyServices
            };
        } catch (error) {
            console.error('خطأ في getIntegrationsSummary:', error);
            return { totalServices: 0, activeServices: 0, categories: 0, healthyServices: 0 };
        }
    }
}

// خدمة واحدة شاملة للوصول السهل
export const IntegrationsService = {
    _instance: null as IntegrationsManager | null,
    
    get instance() {
        if (!this._instance) {
            this._instance = new IntegrationsManager();
        }
        return this._instance;
    }
};

// Export للاستخدام المباشر
export default IntegrationsService.instance;