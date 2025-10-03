"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Palette, 
  Monitor, 
  Smartphone, 
  Eye, 
  Sparkles, 
  Zap,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Star,
  Heart,
  Play,
  Pause
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

type Theme = 'professional' | 'dark' | 'forest' | 'orange-neon' | 'transparency' | 'glassy' | 'classy' | 'modern' | 'stylish' | 'cloudy';

interface ThemeConfig {
  key: Theme;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'light' | 'dark' | 'premium';
  features: string[];
}

const themes: ThemeConfig[] = [
  {
    key: 'professional',
    name: 'Professional',
    nameAr: 'احترافي',
    description: 'Clean corporate design for business',
    descriptionAr: 'تصميم مؤسسي نظيف للأعمال',
    icon: Monitor,
    category: 'premium',
    features: ['Corporate Clean', 'Business Ready', 'Professional Look']
  },
  {
    key: 'dark',
    name: 'Dark',
    nameAr: 'داكن',
    description: 'Deep contrast with blue accents',
    descriptionAr: 'تباين عميق مع لمسات زرقاء',
    icon: Eye,
    category: 'dark',
    features: ['Dark Mode', 'High Contrast', 'Focus Mode']
  },
  {
    key: 'forest',
    name: 'Forest',
    nameAr: 'الغابة',
    description: 'Natural green theme inspired by nature',
    descriptionAr: 'ثيم أخضر طبيعي مستوحى من الطبيعة',
    icon: Settings,
    category: 'light',
    features: ['Natural Colors', 'Eco Friendly', 'Calm Design']
  },
  {
    key: 'orange-neon',
    name: 'Orange Neon',
    nameAr: 'برتقالي نيون',
    description: 'Energetic orange neon with dark background',
    descriptionAr: 'نيون برتقالي نشيط مع خلفية داكنة',
    icon: Zap,
    category: 'dark',
    features: ['Orange Neon', 'Dark Theme', 'Glow Effects']
  },
  {
    key: 'transparency',
    name: 'Transparency',
    nameAr: 'شفافية',
    description: 'Ultra minimal glass effects',
    descriptionAr: 'تأثيرات زجاجية شفافة وخفيفة',
    icon: Eye,
    category: 'light',
    features: ['Glass Morphism', 'Blur Effects', 'Minimal']
  },
  {
    key: 'glassy',
    name: 'Glassy',
    nameAr: 'زجاجي',
    description: 'Transparent glass-like effects',
    descriptionAr: 'تأثيرات زجاجية شفافة',
    icon: Eye,
    category: 'light',
    features: ['Transparency', 'Blur Effects', 'Modern Look']
  },
  {
    key: 'classy',
    name: 'Classy',
    nameAr: 'كلاسي',
    description: 'Black & Gold premium feel',
    descriptionAr: 'إحساس فاخر بالأسود والذهبي',
    icon: Sparkles,
    category: 'premium',
    features: ['Premium', 'Elegant', 'Gold Accents']
  },
  {
    key: 'modern',
    name: 'Modern',
    nameAr: 'عصري',
    description: 'Contemporary design with minimalist approach',
    descriptionAr: 'تصميم عصري بنهج بسيط',
    icon: Smartphone,
    category: 'light',
    features: ['Minimalist', 'Rounded Corners', 'Subtle Shadows']
  },
  {
    key: 'stylish',
    name: 'Stylish',
    nameAr: 'أنيق',
    description: 'Purple & pink stylish UI',
    descriptionAr: 'واجهة أنيقة بالأرجواني والوردي',
    icon: Sparkles,
    category: 'premium',
    features: ['Trendy', 'Vivid', 'Soft Shadows']
  },
  {
    key: 'cloudy',
    name: 'Cloudy',
    nameAr: 'غائم',
    description: 'Soft gray-blue calm UI',
    descriptionAr: 'واجهة هادئة بدرجات الرمادي والأزرق',
    icon: Monitor,
    category: 'light',
    features: ['Soft', 'Calm', 'Readable']
  }
];

const categoryColors = {
  light: 'bg-blue-100 text-blue-800',
  dark: 'bg-gray-100 text-gray-800',
  premium: 'bg-purple-100 text-purple-800'
};

export function ThemeShowcase() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredThemes = selectedCategory === 'all' 
    ? themes 
    : themes.filter(t => t.category === selectedCategory);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">معرض الثيمات الجديدة</h2>
            <p className="text-muted-foreground">
              استكشف واختبر جميع الثيمات الـ 10 المتاحة في النظام
            </p>
          </div>
        </div>
        
        <Badge variant="outline" className="text-lg px-3 py-1">
          {themes.length} ثيمات متاحة
        </Badge>
      </div>

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle>تصنيف الثيمات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
              size="sm"
            >
              جميع الثيمات ({themes.length})
            </Button>
            <Button
              variant={selectedCategory === 'light' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('light')}
              size="sm"
            >
              الثيمات المضيئة ({themes.filter(t => t.category === 'light').length})
            </Button>
            <Button
              variant={selectedCategory === 'dark' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('dark')}
              size="sm"
            >
              الثيمات المظلمة ({themes.filter(t => t.category === 'dark').length})
            </Button>
            <Button
              variant={selectedCategory === 'premium' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('premium')}
              size="sm"
            >
              الثيمات المميزة ({themes.filter(t => t.category === 'premium').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Theme Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            الثيم النشط حاليًا
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const current = themes.find(t => t.key === currentTheme);
            const Icon = current?.icon || Palette;
            
            return (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-lg">{current?.nameAr}</div>
                    <div className="text-sm text-muted-foreground">{current?.descriptionAr}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={categoryColors[current?.category || 'light']}>
                    {current?.category === 'light' ? 'مضيء' : 
                     current?.category === 'dark' ? 'مظلم' : 'مميز'}
                  </Badge>
                  <Badge variant="default">نشط</Badge>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Themes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredThemes.map((themeConfig) => {
          const Icon = themeConfig.icon;
          const isActive = currentTheme === themeConfig.key;
          
          return (
            <Card 
              key={themeConfig.key}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-lg",
                isActive && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleThemeChange(themeConfig.key)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-lg">{themeConfig.nameAr}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={`${categoryColors[themeConfig.category]} text-xs px-2 py-1`}>
                      {themeConfig.category === 'light' ? 'مضيء' : 
                       themeConfig.category === 'dark' ? 'مظلم' : 'مميز'}
                    </Badge>
                    {isActive && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Description */}
                <p className="text-sm text-muted-foreground">
                  {themeConfig.descriptionAr}
                </p>
                
                {/* Demo Components */}
                <div className="space-y-3">
                  {/* Buttons Demo */}
                  <div className="flex gap-2">
                    <Button size="sm" className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      تشغيل
                    </Button>
                    <Button variant="outline" size="sm">
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  {/* Progress Demo */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>التقدم</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      نجح
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      تحذير
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Info className="h-3 w-3 mr-1" />
                      معلومة
                    </Badge>
                  </div>
                </div>
                
                {/* Features */}
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">المميزات:</div>
                  <div className="flex flex-wrap gap-1">
                    {themeConfig.features.slice(0, 3).map((feature, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Action Button */}
                <Button 
                  className="w-full" 
                  variant={isActive ? "default" : "outline"}
                  disabled={isActive}
                >
                  {isActive ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      الثيم النشط
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      تطبيق الثيم
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setTheme('professional')}
            >
              <Monitor className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">الثيم الاحترافي</div>
                <div className="text-xs text-muted-foreground">مناسب للأعمال</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setTheme('forest')}
            >
              <Heart className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">ثيم الطبيعة</div>
                <div className="text-xs text-muted-foreground">مريح للعيون</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => setTheme('orange-neon')}
            >
              <Star className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">الثيم المتوهج</div>
                <div className="text-xs text-muted-foreground">تأثيرات مذهلة</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات الثيمات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{themes.length}</div>
              <div className="text-sm text-muted-foreground">إجمالي الثيمات</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {themes.filter(t => t.category === 'light').length}
              </div>
              <div className="text-sm text-muted-foreground">ثيمات مضيئة</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {themes.filter(t => t.category === 'dark').length}
              </div>
              <div className="text-sm text-muted-foreground">ثيمات مظلمة</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {themes.filter(t => t.category === 'premium').length}
              </div>
              <div className="text-sm text-muted-foreground">ثيمات مميزة</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}