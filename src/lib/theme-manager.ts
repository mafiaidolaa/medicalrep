/**
 * مدير الثيمات والمظهر
 * Theme Manager Service
 * 
 * يوفر إدارة شاملة للثيمات والتخصيص المرئي
 */

// @ts-nocheck

import { createServerSupabaseClient } from './supabase';

// تعريف الأنواع
export interface Theme {
    id: string;
    name: string;
    display_name: string;
    description?: string;
    version: string;
    is_default: boolean;
    is_system: boolean;
    is_active: boolean;
    preview_image_url?: string;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface ThemeSetting {
    id: string;
    theme_id: string;
    category: 'colors' | 'typography' | 'layout' | 'components' | 'advanced';
    setting_key: string;
    setting_value: string;
    setting_type: 'string' | 'color' | 'number' | 'boolean' | 'json';
    description?: string;
}

export interface ColorPalette {
    id: string;
    name: string;
    description?: string;
    colors: string[];
    is_system: boolean;
    usage_count: number;
    created_by?: string;
}

export interface UserCustomization {
    id: string;
    user_id: string;
    theme_id: string;
    custom_settings: any;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ThemeConfig {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
        muted: string;
        muted_foreground: string;
        border: string;
        input: string;
        ring: string;
        success: string;
        warning: string;
        error: string;
        info: string;
    };
    typography: {
        font_family_sans: string;
        font_family_serif: string;
        font_family_mono: string;
        font_size_base: string;
        font_size_sm: string;
        font_size_lg: string;
        font_size_xl: string;
        line_height_base: string;
        letter_spacing: string;
    };
    layout: {
        border_radius: string;
        border_radius_sm: string;
        border_radius_lg: string;
        spacing_unit: string;
        container_max_width: string;
        sidebar_width: string;
        header_height: string;
    };
    components: {
        button_height: string;
        input_height: string;
        card_padding: string;
        shadow_sm: string;
        shadow_md: string;
        shadow_lg: string;
    };
    advanced: {
        animation_duration: string;
        transition_timing: string;
        enable_animations: boolean;
        enable_shadows: boolean;
        enable_blur_effects: boolean;
    };
}

export class ThemeManager {
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
    
    // === إدارة الثيمات ===
    
    async getAllThemes(): Promise<Theme[]> {
        try {
            const { data, error } = await this.supabase
                .from('themes')
                .select('*')
                .order('is_system', { ascending: false })
                .order('is_default', { ascending: false })
                .order('display_name', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب الثيمات:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getAllThemes:', error);
            throw error;
        }
    }
    
    async getThemeById(themeId: string): Promise<Theme | null> {
        try {
            const { data, error } = await this.supabase
                .from('themes')
                .select('*')
                .eq('id', themeId)
                .single();
                
            if (error && error.code !== 'PGRST116') {
                console.error('خطأ في جلب الثيم:', error);
                throw error;
            }
            
            return data || null;
        } catch (error) {
            console.error('خطأ في getThemeById:', error);
            return null;
        }
    }
    
    async getThemeSettings(themeId: string): Promise<ThemeSetting[]> {
        try {
            const { data, error } = await this.supabase
                .from('theme_settings')
                .select('*')
                .eq('theme_id', themeId)
                .order('category', { ascending: true })
                .order('setting_key', { ascending: true });
                
            if (error) {
                console.error('خطأ في جلب إعدادات الثيم:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getThemeSettings:', error);
            throw error;
        }
    }
    
    async getThemeConfig(themeId: string): Promise<ThemeConfig> {
        try {
            const settings = await this.getThemeSettings(themeId);
            const config = this.createDefaultConfig();
            
            // تحويل الإعدادات إلى كائن مهيكل
            settings.forEach(setting => {
                const category = setting.category;
                const key = setting.setting_key;
                
                if (config[category] && config[category].hasOwnProperty(key)) {
                    let value = setting.setting_value;
                    
                    // تحويل القيم حسب النوع
                    if (setting.setting_type === 'boolean') {
                        value = value === 'true';
                    } else if (setting.setting_type === 'number') {
                        value = parseFloat(value);
                    }
                    
                    config[category][key] = value;
                }
            });
            
            return config;
        } catch (error) {
            console.error('خطأ في getThemeConfig:', error);
            return this.createDefaultConfig();
        }
    }
    
    async updateThemeSetting(
        themeId: string, 
        category: string, 
        settingKey: string, 
        settingValue: string,
        settingType: string = 'string'
    ): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('theme_settings')
                .upsert([{
                    theme_id: themeId,
                    category,
                    setting_key: settingKey,
                    setting_value: settingValue,
                    setting_type: settingType
                }], {
                    onConflict: 'theme_id,category,setting_key',
                    ignoreDuplicates: false
                });
                
            if (error) {
                console.error('خطأ في تحديث إعداد الثيم:', error);
                throw error;
            }
            
            console.log(`✅ تم تحديث إعداد الثيم: ${category}.${settingKey}`);
            return true;
        } catch (error) {
            console.error('خطأ في updateThemeSetting:', error);
            throw error;
        }
    }
    
    async createCustomTheme(
        name: string,
        displayName: string, 
        description: string,
        baseThemeId: string,
        customizations: any,
        userId: string
    ): Promise<string> {
        try {
            // إنشاء ثيم جديد
            const { data: newTheme, error: themeError } = await this.supabase
                .from('themes')
                .insert([{
                    name: `custom_${name}_${Date.now()}`,
                    display_name: displayName,
                    description,
                    is_default: false,
                    is_system: false,
                    is_active: false,
                    created_by: userId
                }])
                .select()
                .single();
                
            if (themeError) {
                console.error('خطأ في إنشاء الثيم:', themeError);
                throw themeError;
            }
            
            // نسخ الإعدادات من الثيم الأساسي
            const baseSettings = await this.getThemeSettings(baseThemeId);
            
            // تطبيق التخصيصات
            const newSettings = baseSettings.map(setting => {
                const customKey = `${setting.category}.${setting.setting_key}`;
                const customValue = customizations[customKey];
                
                return {
                    theme_id: newTheme.id,
                    category: setting.category,
                    setting_key: setting.setting_key,
                    setting_value: customValue !== undefined ? customValue : setting.setting_value,
                    setting_type: setting.setting_type,
                    description: setting.description
                };
            });
            
            // إدراج الإعدادات الجديدة
            const { error: settingsError } = await this.supabase
                .from('theme_settings')
                .insert(newSettings);
                
            if (settingsError) {
                console.error('خطأ في إنشاء إعدادات الثيم:', settingsError);
                throw settingsError;
            }
            
            console.log(`✅ تم إنشاء ثيم مخصص: ${displayName}`);
            return newTheme.id;
        } catch (error) {
            console.error('خطأ في createCustomTheme:', error);
            throw error;
        }
    }
    
    async activateThemeForUser(userId: string, themeId: string): Promise<boolean> {
        try {
            const { error } = await this.supabase.rpc('activate_theme_for_user', {
                p_user_id: userId,
                p_theme_id: themeId
            });
            
            if (error) {
                console.error('خطأ في تفعيل الثيم للمستخدم:', error);
                throw error;
            }
            
            console.log(`✅ تم تفعيل الثيم للمستخدم: ${userId}`);
            return true;
        } catch (error) {
            console.error('خطأ في activateThemeForUser:', error);
            throw error;
        }
    }
    
    async getUserActiveTheme(userId: string): Promise<{
        theme: Theme;
        custom_settings: any;
    } | null> {
        try {
            const { data, error } = await this.supabase.rpc('get_active_user_theme', {
                p_user_id: userId
            });
            
            if (error) {
                console.error('خطأ في جلب ثيم المستخدم النشط:', error);
                throw error;
            }
            
            if (data && data.length > 0) {
                const result = data[0];
                const theme = await this.getThemeById(result.theme_id);
                
                return {
                    theme: theme!,
                    custom_settings: result.custom_settings || {}
                };
            }
            
            return null;
        } catch (error) {
            console.error('خطأ في getUserActiveTheme:', error);
            return null;
        }
    }
    
    // === إدارة باليتات الألوان ===
    
    async getAllColorPalettes(): Promise<ColorPalette[]> {
        try {
            const { data, error } = await this.supabase
                .from('color_palettes')
                .select('*')
                .order('is_system', { ascending: false })
                .order('usage_count', { ascending: false });
                
            if (error) {
                console.error('خطأ في جلب باليتات الألوان:', error);
                throw error;
            }
            
            return data || [];
        } catch (error) {
            console.error('خطأ في getAllColorPalettes:', error);
            throw error;
        }
    }
    
    async createColorPalette(
        name: string, 
        description: string, 
        colors: string[], 
        userId: string
    ): Promise<ColorPalette> {
        try {
            const { data, error } = await this.supabase
                .from('color_palettes')
                .insert([{
                    name,
                    description,
                    colors: JSON.stringify(colors),
                    is_system: false,
                    usage_count: 0,
                    created_by: userId
                }])
                .select()
                .single();
                
            if (error) {
                console.error('خطأ في إنشاء باليت الألوان:', error);
                throw error;
            }
            
            console.log(`✅ تم إنشاء باليت ألوان: ${name}`);
            return data;
        } catch (error) {
            console.error('خطأ في createColorPalette:', error);
            throw error;
        }
    }
    
    async incrementPaletteUsage(paletteId: string): Promise<boolean> {
        try {
            const { error } = await this.supabase
                .from('color_palettes')
                .update({
                    usage_count: 'usage_count + 1'
                })
                .eq('id', paletteId);
                
            if (error) {
                console.error('خطأ في زيادة معداد استخدام الباليت:', error);
                throw error;
            }
            
            return true;
        } catch (error) {
            console.error('خطأ في incrementPaletteUsage:', error);
            throw error;
        }
    }
    
    // === دوال مساعدة ===
    
    private createDefaultConfig(): ThemeConfig {
        return {
            colors: {
                primary: '#3b82f6',
                secondary: '#64748b',
                accent: '#06b6d4',
                background: '#ffffff',
                foreground: '#0f172a',
                muted: '#f1f5f9',
                muted_foreground: '#64748b',
                border: '#e2e8f0',
                input: '#ffffff',
                ring: '#3b82f6',
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6'
            },
            typography: {
                font_family_sans: 'Inter, ui-sans-serif, system-ui',
                font_family_serif: 'ui-serif, Georgia',
                font_family_mono: 'ui-monospace, SFMono-Regular',
                font_size_base: '16px',
                font_size_sm: '14px',
                font_size_lg: '18px',
                font_size_xl: '20px',
                line_height_base: '1.5',
                letter_spacing: '0'
            },
            layout: {
                border_radius: '0.375rem',
                border_radius_sm: '0.125rem',
                border_radius_lg: '0.5rem',
                spacing_unit: '1rem',
                container_max_width: '1200px',
                sidebar_width: '280px',
                header_height: '64px'
            },
            components: {
                button_height: '40px',
                input_height: '40px',
                card_padding: '1.5rem',
                shadow_sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                shadow_md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                shadow_lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
            },
            advanced: {
                animation_duration: '150ms',
                transition_timing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                enable_animations: true,
                enable_shadows: true,
                enable_blur_effects: true
            }
        };
    }
    
    async generateCSSVariables(themeId: string): Promise<string> {
        try {
            const config = await this.getThemeConfig(themeId);
            let cssVariables = ':root {\n';
            
            // إضافة متغيرات الألوان
            Object.entries(config.colors).forEach(([key, value]) => {
                cssVariables += `  --color-${key.replace('_', '-')}: ${value};\n`;
            });
            
            // إضافة متغيرات الخطوط
            Object.entries(config.typography).forEach(([key, value]) => {
                cssVariables += `  --${key.replace('_', '-')}: ${value};\n`;
            });
            
            // إضافة متغيرات التخطيط
            Object.entries(config.layout).forEach(([key, value]) => {
                cssVariables += `  --${key.replace('_', '-')}: ${value};\n`;
            });
            
            // إضافة متغيرات المكونات
            Object.entries(config.components).forEach(([key, value]) => {
                cssVariables += `  --${key.replace('_', '-')}: ${value};\n`;
            });
            
            // إضافة متغيرات متقدمة
            Object.entries(config.advanced).forEach(([key, value]) => {
                if (typeof value === 'boolean') {
                    cssVariables += `  --${key.replace('_', '-')}: ${value ? '1' : '0'};\n`;
                } else {
                    cssVariables += `  --${key.replace('_', '-')}: ${value};\n`;
                }
            });
            
            cssVariables += '}';
            
            return cssVariables;
        } catch (error) {
            console.error('خطأ في توليد متغيرات CSS:', error);
            return '';
        }
    }
    
    async exportTheme(themeId: string): Promise<any> {
        try {
            const theme = await this.getThemeById(themeId);
            const settings = await this.getThemeSettings(themeId);
            
            if (!theme) {
                throw new Error('الثيم غير موجود');
            }
            
            // تنظيم الإعدادات
            const organizedSettings = {};
            settings.forEach(setting => {
                if (!organizedSettings[setting.category]) {
                    organizedSettings[setting.category] = {};
                }
                organizedSettings[setting.category][setting.setting_key] = {
                    value: setting.setting_value,
                    type: setting.setting_type,
                    description: setting.description
                };
            });
            
            return {
                theme: {
                    name: theme.name,
                    display_name: theme.display_name,
                    description: theme.description,
                    version: theme.version
                },
                settings: organizedSettings,
                exported_at: new Date().toISOString(),
                export_version: '1.0'
            };
        } catch (error) {
            console.error('خطأ في تصدير الثيم:', error);
            throw error;
        }
    }
    
    async getThemesSummary(): Promise<{
        total: number;
        system: number;
        custom: number;
        active_users: number;
    }> {
        try {
            const [themes, customizations] = await Promise.all([
                this.supabase.from('themes').select('id, is_system', { count: 'exact' }),
                this.supabase.from('user_customizations').select('id', { count: 'exact' }).eq('is_active', true)
            ]);
            
            const systemThemes = themes.data?.filter(t => t.is_system).length || 0;
            const customThemes = themes.data?.filter(t => !t.is_system).length || 0;
            
            return {
                total: themes.count || 0,
                system: systemThemes,
                custom: customThemes,
                active_users: customizations.count || 0
            };
        } catch (error) {
            console.error('خطأ في getThemesSummary:', error);
            return { total: 0, system: 0, custom: 0, active_users: 0 };
        }
    }
}

// خدمة شاملة للوصول السهل
export const ThemeService = {
    _instance: null as ThemeManager | null,
    
    get instance() {
        if (!this._instance) {
            this._instance = new ThemeManager();
        }
        return this._instance;
    }
};

export default ThemeService.instance;