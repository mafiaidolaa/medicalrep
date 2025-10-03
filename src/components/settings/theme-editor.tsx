'use client';

/**
 * محرر الثيمات والمظاهر
 * Theme Editor Component
 * 
 * يوفر واجهة متقدمة لتخصيص وإدارة الثيمات
 */

// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Download, Upload, Palette, Settings, Eye, Save, RefreshCw, Trash2, Copy, Plus } from "lucide-react";
import { toast } from "sonner";

interface Theme {
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

interface ThemeConfig {
  colors: Record<string, string>;
  typography: Record<string, string>;
  layout: Record<string, string>;
  components: Record<string, string>;
  advanced: Record<string, any>;
}

interface ColorPalette {
  id: string;
  name: string;
  description?: string;
  colors: string[];
  is_system: boolean;
  usage_count: number;
  created_by?: string;
}

export default function ThemeEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [colorPalettes, setColorPalettes] = useState<ColorPalette[]>([]);
  const [activeTab, setActiveTab] = useState('themes');
  const [previewMode, setPreviewMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // معلومات الثيم الجديد
  const [newTheme, setNewTheme] = useState({
    name: '',
    displayName: '',
    description: '',
    baseThemeId: ''
  });

  // معلومات الباليت الجديدة
  const [newPalette, setNewPalette] = useState({
    name: '',
    description: '',
    colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
  });

  // تحميل البيانات الأولية
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [themesRes, palettesRes] = await Promise.all([
        fetch('/api/themes?action=list'),
        fetch('/api/themes?action=palettes')
      ]);

      const themesData = await themesRes.json();
      const palettesData = await palettesRes.json();

      if (themesData.themes) {
        setThemes(themesData.themes);
        // اختيار أول ثيم افتراضي
        const defaultTheme = themesData.themes.find((t: any) => t.is_default) || themesData.themes[0];
        if (defaultTheme) {
          await selectTheme(defaultTheme);
        }
      }

      if (palettesData.palettes) {
        setColorPalettes(palettesData.palettes);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const selectTheme = async (theme: Theme) => {
    try {
      setSelectedTheme(theme);
      
      const configRes = await fetch(`/api/themes?action=config&themeId=${theme.id}`);
      const configData = await configRes.json();

      if (configData.config) {
        setThemeConfig(configData.config);
      }

    } catch (error) {
      console.error('Error loading theme config:', error);
      toast.error('فشل في تحميل إعدادات الثيم');
    }
  };

  const updateThemeSetting = (category: string, key: string, value: any) => {
    if (!themeConfig) return;

    const newConfig = { ...themeConfig };
    if (newConfig[category as keyof typeof newConfig]) {
      (newConfig[category as keyof typeof newConfig] as Record<string, string>)[key] = value;
      setThemeConfig(newConfig);
      setUnsavedChanges(true);
    }
  };

  const saveThemeSettings = async () => {
    if (!selectedTheme || !themeConfig) return;

    try {
      setSaving(true);

      // تحويل الإعدادات لصيغة مناسبة للـ API
      const updates = {};
      Object.entries(themeConfig).forEach(([category, settings]) => {
        Object.entries(settings).forEach(([key, value]) => {
          (updates as any)[`${category}.${key}`] = value;
        });
      });

      const response = await fetch('/api/themes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: selectedTheme.id,
          updates
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم حفظ الإعدادات بنجاح');
        setUnsavedChanges(false);
      } else {
        toast.error(result.message || 'فشل في حفظ الإعدادات');
      }

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const activateTheme = async (themeId: string) => {
    try {
      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          themeId
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم تفعيل الثيم بنجاح');
        // إعادة تحميل قائمة الثيمات
        await loadInitialData();
      } else {
        toast.error(result.message || 'فشل في تفعيل الثيم');
      }

    } catch (error) {
      console.error('Error activating theme:', error);
      toast.error('فشل في تفعيل الثيم');
    }
  };

  const createCustomTheme = async () => {
    if (!newTheme.name || !newTheme.displayName || !newTheme.baseThemeId) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-custom',
          ...newTheme
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم إنشاء الثيم المخصص بنجاح');
        setNewTheme({ name: '', displayName: '', description: '', baseThemeId: '' });
        await loadInitialData();
      } else {
        toast.error(result.message || 'فشل في إنشاء الثيم');
      }

    } catch (error) {
      console.error('Error creating theme:', error);
      toast.error('فشل في إنشاء الثيم');
    } finally {
      setSaving(false);
    }
  };

  const createColorPalette = async () => {
    if (!newPalette.name || newPalette.colors.length === 0) {
      toast.error('يرجى إدخال اسم الباليت والألوان');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-palette',
          paletteName: newPalette.name,
          paletteDescription: newPalette.description,
          colors: newPalette.colors
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('تم إنشاء باليت الألوان بنجاح');
        setNewPalette({ name: '', description: '', colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'] });
        await loadInitialData();
      } else {
        toast.error(result.message || 'فشل في إنشاء الباليت');
      }

    } catch (error) {
      console.error('Error creating palette:', error);
      toast.error('فشل في إنشاء الباليت');
    } finally {
      setSaving(false);
    }
  };

  const exportTheme = async (themeId: string) => {
    try {
      const response = await fetch(`/api/themes?action=export&themeId=${themeId}`);
      const result = await response.json();

      if (result.exportData) {
        const blob = new Blob([JSON.stringify(result.exportData, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theme-${themeId}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('تم تصدير الثيم بنجاح');
      }

    } catch (error) {
      console.error('Error exporting theme:', error);
      toast.error('فشل في تصدير الثيم');
    }
  };

  const renderColorEditor = (category: string, colorKey: string, colorValue: string) => (
    <div key={`${category}-${colorKey}`} className="flex items-center space-x-3">
      <div 
        className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
        style={{ backgroundColor: colorValue }}
        onClick={() => document.getElementById(`color-${category}-${colorKey}`)?.click()}
      />
      <input
        id={`color-${category}-${colorKey}`}
        type="color"
        value={colorValue}
        onChange={(e) => updateThemeSetting(category, colorKey, e.target.value)}
        className="sr-only"
      />
      <div className="flex-1">
        <Label className="text-sm font-medium">{colorKey.replace(/_/g, ' ')}</Label>
        <Input
          value={colorValue}
          onChange={(e) => updateThemeSetting(category, colorKey, e.target.value)}
          className="mt-1 font-mono text-xs"
          placeholder="#3b82f6"
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin ml-2" />
          جاري التحميل...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">محرر الثيمات</h2>
          <p className="text-muted-foreground">تخصيص وإدارة مظهر النظام</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 ml-2" />
            {previewMode ? 'إنهاء المعاينة' : 'معاينة'}
          </Button>
          {unsavedChanges && (
            <Button
              onClick={saveThemeSettings}
              disabled={saving}
              size="sm"
            >
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes">الثيمات</TabsTrigger>
          <TabsTrigger value="editor">المحرر</TabsTrigger>
          <TabsTrigger value="palettes">باليتات الألوان</TabsTrigger>
          <TabsTrigger value="advanced">الإعدادات المتقدمة</TabsTrigger>
        </TabsList>

        {/* تبويب الثيمات */}
        <TabsContent value="themes">
          <div className="grid gap-4">
            {/* قائمة الثيمات */}
            <Card>
              <CardHeader>
                <CardTitle>الثيمات المتاحة</CardTitle>
                <CardDescription>
                  اختر ثيماً أو أنشئ ثيماً مخصصاً جديداً
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {themes.map((theme) => (
                    <Card key={theme.id} className={`cursor-pointer transition-all ${
                      selectedTheme?.id === theme.id ? 'ring-2 ring-primary' : ''
                    }`} onClick={() => selectTheme(theme)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{theme.display_name}</h3>
                          <div className="flex space-x-1">
                            {theme.is_system && (
                              <Badge variant="secondary" className="text-xs">نظام</Badge>
                            )}
                            {theme.is_default && (
                              <Badge variant="default" className="text-xs">افتراضي</Badge>
                            )}
                            {theme.is_active && (
                              <Badge variant="outline" className="text-xs">نشط</Badge>
                            )}
                          </div>
                        </div>
                        {theme.description && (
                          <p className="text-sm text-muted-foreground mb-3">{theme.description}</p>
                        )}
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">v{theme.version}</span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                activateTheme(theme.id);
                              }}
                            >
                              تفعيل
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                exportTheme(theme.id);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* إنشاء ثيم جديد */}
            <Card>
              <CardHeader>
                <CardTitle>إنشاء ثيم مخصص</CardTitle>
                <CardDescription>
                  أنشئ ثيماً جديداً بناءً على ثيم موجود
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>اسم الثيم</Label>
                    <Input
                      value={newTheme.name}
                      onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
                      placeholder="my-custom-theme"
                    />
                  </div>
                  <div>
                    <Label>الاسم المعروض</Label>
                    <Input
                      value={newTheme.displayName}
                      onChange={(e) => setNewTheme({ ...newTheme, displayName: e.target.value })}
                      placeholder="ثيمي المخصص"
                    />
                  </div>
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea
                    value={newTheme.description}
                    onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
                    placeholder="وصف الثيم..."
                  />
                </div>
                <div>
                  <Label>الثيم الأساسي</Label>
                  <Select
                    value={newTheme.baseThemeId}
                    onValueChange={(value) => setNewTheme({ ...newTheme, baseThemeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الثيم الأساسي" />
                    </SelectTrigger>
                    <SelectContent>
                      {themes.filter(t => t.is_system).map((theme) => (
                        <SelectItem key={theme.id} value={theme.id}>
                          {theme.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={createCustomTheme}
                  disabled={saving}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  {saving ? 'جاري الإنشاء...' : 'إنشاء الثيم'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب المحرر */}
        <TabsContent value="editor">
          {selectedTheme && themeConfig ? (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>تخصيص: {selectedTheme.display_name}</CardTitle>
                  <CardDescription>
                    قم بتعديل الألوان والخطوط وإعدادات التخطيط
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="colors" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="colors">الألوان</TabsTrigger>
                      <TabsTrigger value="typography">الخطوط</TabsTrigger>
                      <TabsTrigger value="layout">التخطيط</TabsTrigger>
                      <TabsTrigger value="components">المكونات</TabsTrigger>
                      <TabsTrigger value="advanced">متقدم</TabsTrigger>
                    </TabsList>

                    <TabsContent value="colors" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(themeConfig.colors).map(([key, value]) => 
                          renderColorEditor('colors', key, value)
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="typography" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(themeConfig.typography).map(([key, value]) => (
                          <div key={key}>
                            <Label className="text-sm font-medium">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <Input
                              value={value}
                              onChange={(e) => updateThemeSetting('typography', key, e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="layout" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(themeConfig.layout).map(([key, value]) => (
                          <div key={key}>
                            <Label className="text-sm font-medium">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <Input
                              value={value}
                              onChange={(e) => updateThemeSetting('layout', key, e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="components" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(themeConfig.components).map(([key, value]) => (
                          <div key={key}>
                            <Label className="text-sm font-medium">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <Input
                              value={value}
                              onChange={(e) => updateThemeSetting('components', key, e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="advanced" className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(themeConfig.advanced).map(([key, value]) => (
                          <div key={key}>
                            <Label className="text-sm font-medium">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            {typeof value === 'boolean' ? (
                              <div className="flex items-center space-x-2 mt-2">
                                <Switch
                                  checked={value}
                                  onCheckedChange={(checked) => updateThemeSetting('advanced', key, checked)}
                                />
                                <span>{value ? 'مفعل' : 'معطل'}</span>
                              </div>
                            ) : (
                              <Input
                                value={value}
                                onChange={(e) => updateThemeSetting('advanced', key, e.target.value)}
                                className="mt-1"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">اختر ثيماً للتخصيص</h3>
                <p className="text-muted-foreground">
                  يرجى اختيار ثيم من تبويب "الثيمات" لبدء التخصيص
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* تبويب باليتات الألوان */}
        <TabsContent value="palettes">
          <div className="grid gap-6">
            {/* قائمة الباليتات */}
            <Card>
              <CardHeader>
                <CardTitle>باليتات الألوان</CardTitle>
                <CardDescription>
                  مجموعات الألوان المحفوظة للاستخدام السريع
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colorPalettes.map((palette) => (
                    <Card key={palette.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{palette.name}</h3>
                          {palette.is_system && (
                            <Badge variant="secondary" className="text-xs">نظام</Badge>
                          )}
                        </div>
                        {palette.description && (
                          <p className="text-sm text-muted-foreground mb-3">{palette.description}</p>
                        )}
                        <div className="flex space-x-1 mb-3">
                          {palette.colors.map((color, index) => (
                            <div
                              key={index}
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>استخدمت {palette.usage_count} مرة</span>
                          <Button size="sm" variant="ghost">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* إنشاء باليت جديدة */}
            <Card>
              <CardHeader>
                <CardTitle>إنشاء باليت ألوان جديدة</CardTitle>
                <CardDescription>
                  أنشئ مجموعة ألوان مخصصة لاستخدامها في الثيمات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>اسم الباليت</Label>
                    <Input
                      value={newPalette.name}
                      onChange={(e) => setNewPalette({ ...newPalette, name: e.target.value })}
                      placeholder="باليت مخصص"
                    />
                  </div>
                  <div>
                    <Label>الوصف</Label>
                    <Input
                      value={newPalette.description}
                      onChange={(e) => setNewPalette({ ...newPalette, description: e.target.value })}
                      placeholder="وصف الباليت..."
                    />
                  </div>
                </div>
                <div>
                  <Label>الألوان</Label>
                  <div className="flex space-x-2 mt-2">
                    {newPalette.colors.map((color, index) => (
                      <div key={index} className="relative">
                        <div
                          className="w-12 h-12 rounded border-2 cursor-pointer"
                          style={{ backgroundColor: color }}
                          onClick={() => document.getElementById(`new-color-${index}`)?.click()}
                        />
                        <input
                          id={`new-color-${index}`}
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...newPalette.colors];
                            newColors[index] = e.target.value;
                            setNewPalette({ ...newPalette, colors: newColors });
                          }}
                          className="sr-only"
                        />
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newPalette.colors.length < 8) {
                          setNewPalette({
                            ...newPalette,
                            colors: [...newPalette.colors, '#3b82f6']
                          });
                        }
                      }}
                      disabled={newPalette.colors.length >= 8}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={createColorPalette}
                  disabled={saving}
                  className="w-full"
                >
                  <Palette className="h-4 w-4 ml-2" />
                  {saving ? 'جاري الإنشاء...' : 'إنشاء الباليت'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* تبويب الإعدادات المتقدمة */}
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات المتقدمة</CardTitle>
              <CardDescription>
                إعدادات التصدير والاستيراد وإدارة النظام
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">تصدير الثيم</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      احفظ نسخة من الثيم الحالي كملف JSON
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => selectedTheme && exportTheme(selectedTheme.id)}
                      disabled={!selectedTheme}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 ml-2" />
                      تصدير الثيم
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2">استيراد ثيم</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      استورد ثيماً من ملف JSON محفوظ سابقاً
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      استيراد ثيم
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">إعدادات النظام</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>تفعيل المعاينة المباشرة</Label>
                      <p className="text-sm text-muted-foreground">
                        عرض التغييرات فوراً أثناء التعديل
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>حفظ التغييرات تلقائياً</Label>
                      <p className="text-sm text-muted-foreground">
                        حفظ الإعدادات عند كل تعديل
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}