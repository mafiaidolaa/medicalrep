import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getToken } from 'next-auth/jwt';

function defaultMapsSettings() {
  return {
    google_maps_enabled: false,
    google_maps_api_key: '',
    maps_default_zoom: 10,
    maps_default_center: { lat: 30.0444, lng: 31.2357 },
    maps_map_type: 'roadmap',
    maps_theme: 'default',
    maps_enable_clustering: true,
    maps_enable_street_view: true,
    maps_enable_fullscreen: true,
    maps_enable_zoom_control: true,
    maps_enable_map_type_control: true,
    maps_enable_scale_control: true,
    maps_language: 'ar',
    maps_region: 'EG',
  };
}

export async function GET(_request: NextRequest) {
  try {
    const serverClient = createServerSupabaseClient();

    // Try category-based schema first
    let { data: settings, error } = await serverClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('category', 'maps');

    // Fallback to key-based schema if category column does not exist or no results
    if (error?.code === '42703' || !settings || settings.length === 0) {
      const keys = [
        'google_maps_enabled',
        'google_maps_api_key',
        'maps_default_zoom',
        'maps_default_center',
        'maps_map_type',
        'maps_theme',
        'maps_enable_clustering',
        'maps_enable_street_view',
        'maps_enable_fullscreen',
        'maps_enable_zoom_control',
        'maps_enable_map_type_control',
        'maps_enable_scale_control',
        'maps_language',
        'maps_region',
      ];
      const alt = await serverClient
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', keys);
      settings = alt.data || [];
      error = alt.error as any;
    }

    if (error) {
      console.error('Error fetching maps settings:', error);
      // Fallback to defaults with 200 to avoid client error state
      return NextResponse.json(defaultMapsSettings(), { headers: { 'Cache-Control': 'no-store' } });
    }

    if (!settings || settings.length === 0) {
      return NextResponse.json(defaultMapsSettings(), { headers: { 'Cache-Control': 'no-store' } });
    }

    const mapsSettings: Record<string, any> = { ...defaultMapsSettings() };
    settings.forEach((setting: any) => {
      let val = setting.setting_value;
      if (setting.setting_key === 'maps_default_center' && typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      mapsSettings[setting.setting_key] = val;
    });

    return NextResponse.json(mapsSettings, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error in maps settings GET:', error);
    return NextResponse.json(defaultMapsSettings(), { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serverClient = createServerSupabaseClient();

    // AuthN/AuthZ: read token from cookie and require admin
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = String((token as any).role || '').toLowerCase();
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const mapsSettingsMap = [
      { key: 'google_maps_enabled', value: !!body.enabled },
      { key: 'google_maps_api_key', value: body.apiKey || '' },
      { key: 'maps_default_zoom', value: Number(body.defaultZoom ?? 10) },
      { key: 'maps_default_center', value: body.defaultCenter || { lat: 24.7136, lng: 46.6753 } },
      { key: 'maps_map_type', value: body.mapType || 'roadmap' },
      { key: 'maps_theme', value: body.theme || 'default' },
      { key: 'maps_enable_clustering', value: !!body.enableClustering },
      { key: 'maps_enable_street_view', value: !!body.enableStreetView },
      { key: 'maps_enable_fullscreen', value: !!body.enableFullscreen },
      { key: 'maps_enable_zoom_control', value: !!body.enableZoomControl },
      { key: 'maps_enable_map_type_control', value: !!body.enableMapTypeControl },
      { key: 'maps_enable_scale_control', value: !!body.enableScaleControl },
      { key: 'maps_language', value: body.language || 'ar' },
      { key: 'maps_region', value: body.region || 'EG' },
    ];

    // Detect optional is_enabled column once
    let hasIsEnabledColumn = false;
    try {
      const testQuery = await serverClient
        .from('system_settings')
        .select('is_enabled')
        .limit(1);
      if (!testQuery.error) hasIsEnabledColumn = true;
    } catch {}

    // Upsert (update then insert if not exists)
    for (const setting of mapsSettingsMap) {
      // Build row data without assuming 'category' column exists
      const baseData: any = {
        setting_key: setting.key,
        setting_value: setting.value,
        description: `Google Maps setting: ${setting.key}`,
        updated_at: new Date().toISOString(),
      };
      if (hasIsEnabledColumn) baseData.is_enabled = true;

      // Try update by key only (compatible schema)
      let { data: updateRows, error: updateError } = await serverClient
        .from('system_settings')
        .update(baseData)
        .eq('setting_key', setting.key)
        .select('id');

      // If update failed due to RLS or other constraints, try insert-or-update approach
      if (updateError) {
        console.error(`Update failed for ${setting.key}:`, updateError);
      }

      if (updateError) {
        console.error(`Error updating setting ${setting.key}:`, updateError);
        return NextResponse.json({ error: `Failed to update setting: ${setting.key}` }, { status: 500 });
      }

      if (!updateRows || updateRows.length === 0) {
        const insertData: any = { ...baseData, created_at: new Date().toISOString() };
        const { error: insertError } = await serverClient
          .from('system_settings')
          .insert(insertData);
        if (insertError) {
          console.error(`Error inserting setting ${setting.key}:`, insertError);
          return NextResponse.json({ error: `Failed to insert setting: ${setting.key}` }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Maps settings updated successfully' });
  } catch (error) {
    console.error('Error in maps settings POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
