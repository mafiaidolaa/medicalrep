"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Palette, 
  Check, 
  Monitor, 
  Smartphone, 
  Sparkles,
  Zap,
  Eye,
  Settings,
  Save,
  RefreshCw,
  Briefcase,
  Moon,
  Flame,
  Cloud
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PREMIUM_THEMES, type Theme as PremiumTheme } from '@/lib/premium-themes';

// All 10 themes from premium-themes.ts
type Theme = 'professional' | 'glassy' | 'dark' | 'orange-neon' | 'blue-sky' | 'ios-like' | 'emerald-garden' | 'royal-purple' | 'sunset-bliss' | 'ocean-deep';

interface ThemeOption {
  key: Theme;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ComponentType<{ className?: string }>;
  preview: string; // emoji
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  category: string;
}

// تحويل الثيمات من PREMIUM_THEMES إلى التنسيق المطلوب
const themeOptions: ThemeOption[] = PREMIUM_THEMES.map(theme => ({
  key: theme.id as Theme,
  name: theme.name,
  nameAr: theme.nameAr,
  description: theme.description,
  descriptionAr: theme.descriptionAr,
  icon: theme.id === 'professional' ? Briefcase :
        theme.id === 'glassy' ? Sparkles :
        theme.id === 'dark' ? Moon :
        theme.id === 'orange-neon' ? Flame :
        theme.id === 'blue-sky' ? Cloud :
        theme.id === 'ios-like' ? Smartphone : Monitor,
  preview: theme.preview,
  colors: {
    primary: theme.colors.light.primary,
    secondary: theme.colors.light.secondary,
    accent: theme.colors.light.accent,
    background: theme.colors.light.background,
  },
  category: theme.category,
}));

export function ThemeManagement() {
  const { theme: currentTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(currentTheme);
  const [applyToAllUsers, setApplyToAllUsers] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme);
  };

  const handlePreview = () => {
    if (previewMode) {
      // Reset to original theme
      setTheme(currentTheme);
      setPreviewMode(false);
      toast({
        title: "انتهى وضع المعاينة",
        description: "تم إرجاع الثيم إلى الحالة الأصلية",
      });
    } else {
      // Enter preview mode
      setTheme(selectedTheme);
      setPreviewMode(true);
      toast({
        title: "وضع المعاينة",
        description: `معاينة ثيم ${themeOptions.find(t => t.key === selectedTheme)?.nameAr}`,
      });
    }
  };

  const handleApplyTheme = async () => {
    setIsLoading(true);
    try {
      // Apply theme locally
      setTheme(selectedTheme);
      
      // If apply to all users is enabled, save to system settings
      if (applyToAllUsers) {
        // Save to system settings database
        await fetch('/api/system-settings/theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            theme: selectedTheme,
            applyToAll: true
          })
        });
        
        toast({
          title: "تم حفظ الثيم",
          description: `تم تطبيق ثيم ${themeOptions.find(t => t.key === selectedTheme)?.nameAr} على جميع المستخدمين`,
        });
      } else {
        toast({
          title: "تم حفظ الثيم",
          description: `تم تطبيق ثيم ${themeOptions.find(t => t.key === selectedTheme)?.nameAr}`,
        });
      }
      
      setPreviewMode(false);
    } catch (error) {
      console.error('Error applying theme:', error);
      toast({
        variant: 'destructive',
        title: "خطأ",
        description: "فشل في حفظ الثيم",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToDefault = () => {
    setSelectedTheme('professional');
    setTheme('professional');
    setPreviewMode(false);
    toast({
      title: "تم إعادة تعيين الثيم",
      description: "تم إرجاع الثيم إلى الاحترافي",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">إدارة ثيمات النظام</h2>
            <p className="text-muted-foreground">اختر وطبق الثيم المناسب لجميع أجزاء النظام</p>
          </div>
        </div>
        
        {previewMode && (
          <Badge variant="outline" className="animate-pulse">
            <Eye className="h-3 w-3 mr-1" />
            وضع المعاينة
          </Badge>
        )}
      </div>

      {/* Current Theme Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            الثيم الحالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {(() => {
                const current = themeOptions.find(t => t.key === currentTheme);
                const Icon = current?.icon || Palette;
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{current?.nameAr}</div>
                        <div className="text-sm text-muted-foreground">{current?.descriptionAr}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <span className="text-2xl">{current?.preview}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            <Badge variant="secondary">نشط</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle>اختيار الثيم</CardTitle>
          <CardDescription>
            اختر الثيم الذي تريد تطبيقه على النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedTheme === option.key;
              const isCurrent = currentTheme === option.key;
              
              return (
                <Card 
                  key={option.key}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-md",
                    isSelected && "ring-2 ring-primary",
                    isCurrent && "border-primary"
                  )}
                  onClick={() => handleThemeSelect(option.key)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Theme Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium">{option.nameAr}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                        {isCurrent && <Badge variant="secondary" className="text-xs px-2 py-0.5">حالي</Badge>}
                      </div>
                      
                      {/* Emoji Preview & Color Preview */}
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{option.preview}</span>
                        <div className="flex flex-1 gap-1">
                          {Object.values(option.colors).map((color, i) => (
                            <div 
                              key={i} 
                              className="flex-1 h-6 rounded border" 
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-sm text-muted-foreground">{option.descriptionAr}</p>
                      
                      {/* Category Badge */}
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {option.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Options */}
      <Card>
        <CardHeader>
          <CardTitle>خيارات التطبيق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">تطبيق على جميع المستخدمين</Label>
              <p className="text-sm text-muted-foreground">
                سيتم تطبيق الثيم المحدد على جميع المستخدمين في النظام
              </p>
            </div>
            <Switch
              checked={applyToAllUsers}
              onCheckedChange={setApplyToAllUsers}
            />
          </div>
          
          {applyToAllUsers && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ تنبيه: سيتم تطبيق الثيم على جميع المستخدمين وسيصبح الافتراضي للمستخدمين الجدد
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={handleApplyTheme}
          disabled={isLoading || selectedTheme === currentTheme}
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'جاري التطبيق...' : 'تطبيق الثيم'}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handlePreview}
          disabled={selectedTheme === currentTheme}
          size="lg"
        >
          <Eye className="h-4 w-4 mr-2" />
          {previewMode ? 'إنهاء المعاينة' : 'معاينة'}
        </Button>
        
        <Button 
          variant="ghost" 
          onClick={handleResetToDefault}
          size="lg"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          إعادة تعيين
        </Button>
      </div>
    </div>
  );
}