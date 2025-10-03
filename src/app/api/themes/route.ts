/**
 * Theme Management API Endpoints
 * مسارات API لإدارة الثيمات
 */

import { NextRequest, NextResponse } from 'next/server';
import ThemeService from '@/lib/theme-manager';
import { getServerUser } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const themeId = searchParams.get('themeId');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'list':
        const themes = await ThemeService.getAllThemes();
        return NextResponse.json({ themes });

      case 'config':
        if (!themeId) {
          return NextResponse.json({ error: 'معرف الثيم مطلوب' }, { status: 400 });
        }
        const config = await ThemeService.getThemeConfig(themeId);
        return NextResponse.json({ config });

      case 'settings':
        if (!themeId) {
          return NextResponse.json({ error: 'معرف الثيم مطلوب' }, { status: 400 });
        }
        const settings = await ThemeService.getThemeSettings(themeId);
        return NextResponse.json({ settings });

      case 'user-active':
        const targetUserId = userId || user.id;
        const activeTheme = await ThemeService.getUserActiveTheme(targetUserId);
        return NextResponse.json({ activeTheme });

      case 'css-variables':
        if (!themeId) {
          return NextResponse.json({ error: 'معرف الثيم مطلوب' }, { status: 400 });
        }
        const cssVariables = await ThemeService.generateCSSVariables(themeId);
        return NextResponse.json({ cssVariables });

      case 'export':
        if (!themeId) {
          return NextResponse.json({ error: 'معرف الثيم مطلوب' }, { status: 400 });
        }
        const exportData = await ThemeService.exportTheme(themeId);
        return NextResponse.json({ exportData });

      case 'summary':
        const summary = await ThemeService.getThemesSummary();
        return NextResponse.json({ summary });

      case 'palettes':
        const palettes = await ThemeService.getAllColorPalettes();
        return NextResponse.json({ palettes });

      default:
        return NextResponse.json({ error: 'إجراء غير صحيح' }, { status: 400 });
    }

  } catch (error) {
    console.error('Theme API GET Error:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم الداخلي' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'activate':
        const { themeId: activateThemeId } = body;
        if (!activateThemeId) {
          return NextResponse.json({ error: 'معرف الثيم مطلوب' }, { status: 400 });
        }
        
        const activated = await ThemeService.activateThemeForUser(user.id, activateThemeId);
        return NextResponse.json({ 
          success: activated,
          message: activated ? 'تم تفعيل الثيم بنجاح' : 'فشل في تفعيل الثيم'
        });

      case 'update-setting':
        const { themeId, category, settingKey, settingValue, settingType } = body;
        if (!themeId || !category || !settingKey || settingValue === undefined) {
          return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
        }
        
        const updated = await ThemeService.updateThemeSetting(
          themeId, 
          category, 
          settingKey, 
          settingValue,
          settingType || 'string'
        );
        return NextResponse.json({ 
          success: updated,
          message: updated ? 'تم تحديث الإعداد بنجاح' : 'فشل في تحديث الإعداد'
        });

      case 'create-custom':
        const { 
          name, 
          displayName, 
          description, 
          baseThemeId, 
          customizations 
        } = body;
        
        if (!name || !displayName || !baseThemeId) {
          return NextResponse.json({ error: 'بيانات الثيم غير مكتملة' }, { status: 400 });
        }
        
        const newThemeId = await ThemeService.createCustomTheme(
          name,
          displayName,
          description || '',
          baseThemeId,
          customizations || {},
          user.id
        );
        
        return NextResponse.json({ 
          success: true,
          themeId: newThemeId,
          message: 'تم إنشاء الثيم المخصص بنجاح'
        });

      case 'create-palette':
        const { 
          paletteName, 
          paletteDescription, 
          colors 
        } = body;
        
        if (!paletteName || !colors || !Array.isArray(colors)) {
          return NextResponse.json({ error: 'بيانات الباليت غير مكتملة' }, { status: 400 });
        }
        
        const newPalette = await ThemeService.createColorPalette(
          paletteName,
          paletteDescription || '',
          colors,
          user.id
        );
        
        return NextResponse.json({ 
          success: true,
          palette: newPalette,
          message: 'تم إنشاء باليت الألوان بنجاح'
        });

      case 'increment-palette-usage':
        const { paletteId } = body;
        if (!paletteId) {
          return NextResponse.json({ error: 'معرف الباليت مطلوب' }, { status: 400 });
        }
        
        const incremented = await ThemeService.incrementPaletteUsage(paletteId);
        return NextResponse.json({ 
          success: incremented,
          message: incremented ? 'تم تحديث معداد الاستخدام' : 'فشل في تحديث المعداد'
        });

      default:
        return NextResponse.json({ error: 'إجراء غير صحيح' }, { status: 400 });
    }

  } catch (error) {
    console.error('Theme API POST Error:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم الداخلي' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json({ error: 'غير مخول' }, { status: 401 });
    }

    const body = await request.json();
    const { themeId, updates } = body;

    if (!themeId || !updates) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // تحديث عدة إعدادات في نفس الوقت
    const updatePromises = Object.entries(updates).map(([key, value]) => {
      const [category, settingKey] = key.split('.');
      return ThemeService.updateThemeSetting(
        themeId,
        category,
        settingKey,
        value as string
      );
    });

    const results = await Promise.all(updatePromises);
    const allSuccessful = results.every(result => result === true);

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful ? 
        'تم تحديث جميع الإعدادات بنجاح' : 
        'فشل في تحديث بعض الإعدادات'
    });

  } catch (error) {
    console.error('Theme API PUT Error:', error);
    return NextResponse.json(
      { error: 'خطأ في الخادم الداخلي' },
      { status: 500 }
    );
  }
}