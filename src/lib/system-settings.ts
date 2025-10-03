/**
 * نظام إدارة إعدادات النظام الشامل
 * System Settings Management Service
 * 
 * يوفر تحكماً كاملاً في جميع جوانب النظام للمدراء المخولين
 */

// @ts-nocheck

import { createServerSupabaseClient } from './supabase';
import type { SystemSetting, GoogleMapsSettings, ActivityLoggingSettings, SecuritySettings, GeneralSettings } from './types';

export class SystemSettingsManager {
    private _supabase: any = null;
    
    private getSupabaseClient() {
        if (!this._supabase) {
            this._supabase = createServerSupabaseClient();
        }
        return this._supabase;
    }
    
    private get supabase() {
        return this.getSupabaseClient();
    }
    
    // جلب جميع الإعدادات
    async getAllSettings(): Promise<SystemSetting[]> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('*')
                .order('category', { ascending: true })
                .order('setting_key', { ascending: true });
                
            if (error) {
                console.error('Error fetching settings:', error);
                throw error;
            }
            
            return (data || []).map(this.transformDbToType);
        } catch (error) {
            console.error('Error in getAllSettings:', error);
            throw error;
        }
    }
    
    // جلب الإعدادات حسب التصنيف
    async getSettingsByCategory(category: string): Promise<SystemSetting[]> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('*')
                .eq('category', category)
                .order('setting_key', { ascending: true });
                
            if (error) {
                console.error(`Error fetching ${category} settings:`, error);
                throw error;
            }
            
            return (data || []).map(this.transformDbToType);
        } catch (error) {
            console.error(`Error in getSettingsByCategory(${category}):`, error);
            throw error;
        }
    }
    
    // جلب إعداد واحد
    async getSetting(category: string, settingKey: string): Promise<any> {
        try {
            const { data, error } = await this.supabase
                .from('system_settings')
                .select('setting_value')
                .eq('category', category)
                .eq('setting_key', settingKey)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error(`Error fetching setting ${category}.${settingKey}:`, error);
                return {}; // إرجاع قيمة فارغة بدلاً من رمي خطأ
            }
            
            return data?.setting_value || {};
        } catch (error) {
            console.error(`Error in getSetting(${category}, ${settingKey}):`, error);
            return {};
        }
    }
    
    // تحديث إعداد
    async updateSetting(category: string, settingKey: string, value: any, enabled: boolean = true): Promise<boolean> {
        try {
            const updateData: any = {
                setting_value: value,
                updated_at: new Date().toISOString()
            };
            
            // إضافة is_enabled فقط إذا كان العمود موجود
            try {
                const testQuery = await this.supabase
                    .from('system_settings')
                    .select('is_enabled')
                    .limit(1);
                    
                if (!testQuery.error) {
                    updateData.is_enabled = enabled;
                }
            } catch (e) {
                // تجاهل الخطأ إذا لم يكن العمود موجود
            }
            
            const { error } = await this.supabase
                .from('system_settings')
                .update(updateData)
                .eq('category', category)
                .eq('setting_key', settingKey);
                
            if (error) {
                console.error(`Error updating setting ${category}.${settingKey}:`, error);
                throw error;
            }
            
            console.log(`✅ Setting updated: ${category}.${settingKey}`);
            return true;
        } catch (error) {
            console.error(`Error in updateSetting(${category}, ${settingKey}):`, error);
            throw error;
        }
    }
    
    // إضافة إعداد جديد
    async createSetting(category: string, settingKey: string, value: any, description?: string): Promise<SystemSetting> {
        try {
            const insertData: any = {
                category,
                setting_key: settingKey,
                setting_value: value,
                description
            };
            
            // إضافة is_enabled فقط إذا كان العمود موجود
            try {
                const testQuery = await this.supabase
                    .from('system_settings')
                    .select('is_enabled')
                    .limit(1);
                    
                if (!testQuery.error) {
                    insertData.is_enabled = true;
                }
            } catch (e) {
                // تجاهل الخطأ إذا لم يكن العمود موجود
            }
            
            const { data, error } = await this.supabase
                .from('system_settings')
                .insert([insertData])
                .select()
                .single();
                
            if (error) {
                console.error(`Error creating setting ${category}.${settingKey}:`, error);
                throw error;
            }
            
            console.log(`✅ Setting created: ${category}.${settingKey}`);
            return this.transformDbToType(data);
        } catch (error) {
            console.error(`Error in createSetting(${category}, ${settingKey}):`, error);
            throw error;
        }
    }
    
    // حذف إعداد
    async deleteSetting(category: string, settingKey: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('system_settings')
                .delete()
                .eq('category', category)
                .eq('setting_key', settingKey);
                
            if (error) {
                console.error(`Error deleting setting ${category}.${settingKey}:`, error);
                throw error;
            }
            
            console.log(`✅ Setting deleted: ${category}.${settingKey}`);
            return true;
        } catch (error) {
            console.error(`Error in deleteSetting(${category}, ${settingKey}):`, error);
            throw error;
        }
    }
    
    // تحويل من قاعدة البيانات إلى النوع المطلوب
    private transformDbToType(dbRow: any): SystemSetting {
        return {
            id: dbRow.id,
            category: dbRow.category,
            settingKey: dbRow.setting_key,
            settingValue: dbRow.setting_value,
            description: dbRow.description,
            isEnabled: dbRow.is_enabled ?? true, // قيمة افتراضية إذا لم يكن العمود موجود
            createdAt: dbRow.created_at,
            updatedAt: dbRow.updated_at,
            createdBy: dbRow.created_by,
            updatedBy: dbRow.updated_by
        };
    }
}

// خدمات مخصصة لكل تصنيف من الإعدادات

export class GoogleMapsSettingsService {
    private settingsManager = new SystemSettingsManager();
    
    async getSettings(): Promise<Partial<GoogleMapsSettings>> {
        const settings = await this.settingsManager.getSettingsByCategory('maps');
        const result: any = {};
        
        settings.forEach(setting => {
            result[setting.settingKey] = setting.settingValue;
        });
        
        return result;
    }
    
    async isGoogleMapsEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('maps', 'google_maps_enabled');
        return setting?.enabled || false;
    }

    async isGeocodingEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('maps', 'geocoding_enabled');
        return setting?.enabled !== false;
    }
    async setGeocodingEnabled(enabled: boolean): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'geocoding_enabled', { enabled });
    }

    async isS2CellsEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('maps', 's2_cells_enabled');
        return setting?.enabled !== false;
    }
    async setS2CellsEnabled(enabled: boolean): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 's2_cells_enabled', { enabled });
    }
    
    async setGoogleMapsEnabled(enabled: boolean): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'google_maps_enabled', { enabled });
    }
    
    async getApiKey(): Promise<string> {
        const setting = await this.settingsManager.getSetting('maps', 'google_maps_api_key');
        return setting?.api_key || '';
    }
    
    async setApiKey(apiKey: string): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'google_maps_api_key', { api_key: apiKey });
    }
    
    async getDefaultZoom(): Promise<number> {
        const setting = await this.settingsManager.getSetting('maps', 'maps_default_zoom');
        return setting?.zoom || 15;
    }
    
    async setDefaultZoom(zoom: number): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'maps_default_zoom', { zoom });
    }
    
    async getDefaultCenter(): Promise<{ lat: number; lng: number }> {
        const setting = await this.settingsManager.getSetting('maps', 'maps_default_center');
        return { lat: setting?.lat || 30.0444, lng: setting?.lng || 31.2357 };
    }
    
    async setDefaultCenter(lat: number, lng: number): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'maps_default_center', { lat, lng });
    }
    
    async getMapTheme(): Promise<string> {
        const setting = await this.settingsManager.getSetting('maps', 'maps_theme');
        return setting?.theme || 'roadmap';
    }
    
    async setMapTheme(theme: 'roadmap' | 'satellite' | 'hybrid' | 'terrain'): Promise<boolean> {
        return this.settingsManager.updateSetting('maps', 'maps_theme', { theme });
    }
}

export class ActivityLoggingSettingsService {
    private settingsManager = new SystemSettingsManager();
    
    async getSettings(): Promise<Partial<ActivityLoggingSettings>> {
        const settings = await this.settingsManager.getSettingsByCategory('activity_logging');
        const result: any = {};
        
        settings.forEach(setting => {
            result[setting.settingKey] = setting.settingValue;
        });
        
        return result;
    }
    
    async isSystemEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('activity_logging', 'system_enabled');
        return setting?.enabled !== false; // Default to true
    }
    
    async setSystemEnabled(enabled: boolean): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'system_enabled', { enabled });
    }
    
    async isLoginTrackingEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('activity_logging', 'login_tracking');
        return setting?.enabled !== false;
    }
    
    async setLoginTracking(enabled: boolean, trackFailedAttempts: boolean = true): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'login_tracking', { 
            enabled, 
            track_failed_attempts: trackFailedAttempts 
        });
    }
    
    async isLocationLoggingEnabled(): Promise<boolean> {
        const setting = await this.settingsManager.getSetting('activity_logging', 'location_logging');
        return setting?.enabled !== false;
    }
    
    async setLocationLogging(enabled: boolean, requirePermission: boolean = true): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'location_logging', { 
            enabled, 
            require_permission: requirePermission 
        });
    }

    // New: fine-grained capture mode and provider controls
    async getLocationCaptureMode(): Promise<'disabled' | 'coarse_ip' | 'browser_gps'> {
        const s = await this.settingsManager.getSetting('activity_logging', 'location_capture');
        return (s?.mode as any) || 'browser_gps';
    }
    async setLocationCaptureMode(mode: 'disabled' | 'coarse_ip' | 'browser_gps'): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'location_capture', { mode });
    }

    async getLocationProvider(): Promise<'google' | 'nominatim'> {
        const s = await this.settingsManager.getSetting('activity_logging', 'location_provider');
        return (s?.provider as any) || 'nominatim';
    }
    async setLocationProvider(provider: 'google' | 'nominatim'): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'location_provider', { provider });
    }

    async getAlerts(): Promise<{ enabled: boolean; failed_login_threshold?: number; new_country_alert?: boolean }> {
        const s = await this.settingsManager.getSetting('activity_logging', 'alerts');
        return { enabled: s?.enabled !== false, failed_login_threshold: s?.failed_login_threshold ?? 5, new_country_alert: s?.new_country_alert ?? true };
    }
    async setAlerts(cfg: { enabled: boolean; failed_login_threshold?: number; new_country_alert?: boolean }): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'alerts', cfg);
    }

    async getRetentionDays(): Promise<number> {
        const s = await this.settingsManager.getSetting('activity_logging', 'retention_days');
        return s?.days ?? 365;
    }
    async setRetentionDays(days: number): Promise<boolean> {
        return this.settingsManager.updateSetting('activity_logging', 'retention_days', { days });
    }
}

export class SecuritySettingsService {
    private settingsManager = new SystemSettingsManager();
    
    async getPasswordPolicy(): Promise<any> {
        return this.settingsManager.getSetting('security', 'password_policy');
    }
    
    async setPasswordPolicy(policy: {
        min_length: number;
        require_uppercase: boolean;
        require_numbers: boolean;
        require_symbols: boolean;
    }): Promise<boolean> {
        return this.settingsManager.updateSetting('security', 'password_policy', policy);
    }
    
    async getSessionSettings(): Promise<any> {
        return this.settingsManager.getSetting('security', 'session_management');
    }
    
    async setSessionSettings(settings: {
        timeout_minutes: number;
        max_concurrent_sessions: number;
    }): Promise<boolean> {
        return this.settingsManager.updateSetting('security', 'session_management', settings);
    }
}

// خدمة واحدة شاملة للوصول السهل
export const SystemSettings = {
    // Lazy-loaded instances to prevent early Supabase client initialization
    _general: null as SystemSettingsManager | null,
    _googleMaps: null as GoogleMapsSettingsService | null,
    _activityLogging: null as ActivityLoggingSettingsService | null,
    _security: null as SecuritySettingsService | null,
    
    get general() {
        if (!this._general) {
            this._general = new SystemSettingsManager();
        }
        return this._general;
    },
    
    get googleMaps() {
        if (!this._googleMaps) {
            this._googleMaps = new GoogleMapsSettingsService();
        }
        return this._googleMaps;
    },
    
    get activityLogging() {
        if (!this._activityLogging) {
            this._activityLogging = new ActivityLoggingSettingsService();
        }
        return this._activityLogging;
    },
    
    get security() {
        if (!this._security) {
            this._security = new SecuritySettingsService();
        }
        return this._security;
    },
    
    // دالة مساعدة للتحقق من الصلاحيات
    async checkAdminPermissions(): Promise<boolean> {
        try {
const supabase = createServerSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) return false;
            
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
                
            return userData?.role === 'admin';
        } catch (error) {
            console.error('Error checking admin permissions:', error);
            return false;
        }
    },
    
    // دالة للتحقق من تفعيل Google Maps
    async isGoogleMapsAvailable(): Promise<boolean> {
        try {
            const isEnabled = await this.googleMaps.isGoogleMapsEnabled();
            const apiKey = await this.googleMaps.getApiKey();
            return isEnabled && !!apiKey;
        } catch (error) {
            console.error('Error checking Google Maps availability:', error);
            return false;
        }
    },
    
    // دالة للتحقق من تفعيل تسجيل الأنشطة
    async isActivityLoggingAvailable(): Promise<boolean> {
        try {
            return await this.activityLogging.isSystemEnabled();
        } catch (error) {
            console.error('Error checking activity logging availability:', error);
            return true; // Default to true for safety
        }
    }
};

// Export for easy use
export default SystemSettings;