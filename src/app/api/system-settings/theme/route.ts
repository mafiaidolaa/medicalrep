import { NextRequest, NextResponse } from 'next/server';
import { SystemSettings } from '@/lib/system-settings';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { theme, applyToAll } = await request.json();

    if (!theme) {
      return NextResponse.json({ error: 'Theme is required' }, { status: 400 });
    }

    // Validate theme value - Updated to match all premium themes
    const validThemes = [
      'professional', 'glassy', 'dark', 'orange-neon', 'blue-sky', 'ios-like',
      'emerald-garden', 'royal-purple', 'sunset-bliss', 'ocean-deep'
    ];
    if (!validThemes.includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }

    if (applyToAll) {
      // Save as system-wide default theme
      await SystemSettings.general.createSetting(
        'ui',
        'default_theme',
        {
          theme,
          applied_at: new Date().toISOString(),
          applied_by: session.user.id,
          applies_to_all_users: true
        },
        'System-wide default theme for all users'
      );

      // Also create a setting for new users
      await SystemSettings.general.updateSetting(
        'ui',
        'new_user_theme',
        {
          theme,
          updated_at: new Date().toISOString(),
          updated_by: session.user.id
        }
      );

      // Persist to file and memory cache for fast path
      const persisted = { defaultTheme: theme, newUserTheme: theme, appliesSystemWide: true };
      themeCache = persisted;
      themeCacheTime = Date.now();
      try { await writeThemeFile(persisted); } catch {}

      console.log(`✅ System theme updated to: ${theme} (applies to all users)`);
    }

    return NextResponse.json({
      success: true,
      theme,
      appliedToAll: applyToAll,
      message: applyToAll ? 'Theme applied system-wide' : 'Theme applied to current user'
    });

  } catch (error) {
    console.error('Error updating system theme:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

// Simple in-memory cache for theme settings (stronger cache)
let themeCache: any = null;
let themeCacheTime = 0;
const THEME_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// File-based fallback for ultra-fast theme fetch
const DATA_DIR = join(process.cwd(), 'data');
const THEME_FILE = join(DATA_DIR, 'theme.json');

async function readThemeFile(): Promise<any | null> {
  try {
    if (!existsSync(THEME_FILE)) return null;
    const txt = await readFile(THEME_FILE, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

async function writeThemeFile(obj: any): Promise<void> {
  try {
    if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
    await writeFile(THEME_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to write theme.json:', (e as any)?.message || e);
  }
}

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    // 1) Serve from in-memory cache if fresh
    if (themeCache && (now - themeCacheTime) < THEME_CACHE_DURATION) {
      return NextResponse.json(themeCache, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    // 2) Try file-based fast path
    const fileTheme = await readThemeFile();
    if (fileTheme && fileTheme.defaultTheme && fileTheme.newUserTheme) {
      themeCache = fileTheme;
      themeCacheTime = now;
      return NextResponse.json(fileTheme, {
        headers: {
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600'
        }
      });
    }

    // 3) Fallback to DB via SystemSettings
    const defaultTheme = await SystemSettings.general.getSetting('ui', 'default_theme');
    const newUserTheme = await SystemSettings.general.getSetting('ui', 'new_user_theme');

    const response = {
      defaultTheme: defaultTheme?.theme || 'professional',
      newUserTheme: newUserTheme?.theme || 'professional',
      appliesSystemWide: defaultTheme?.applies_to_all_users || false
    };

    // Persist to cache and file for next time
    themeCache = response;
    themeCacheTime = now;
    await writeThemeFile(response);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error fetching system theme:', error);
    // 4) Last-resort: use cache or sensible defaults
    const fallback = themeCache || { 
      defaultTheme: 'professional',
      newUserTheme: 'professional',
      appliesSystemWide: false
    };
    return NextResponse.json(fallback, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300'
      }
    });
  }
}
