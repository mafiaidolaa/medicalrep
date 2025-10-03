import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const serverClient = createServerSupabaseClient();
    
    // Fetch maps-related settings from system_settings table
    const { data: settings, error } = await serverClient
      .from('system_settings')
      .select('setting_key, setting_value')
      .eq('category', 'maps');

    if (error) {
      console.error('Error fetching maps settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch maps settings' },
        { status: 500 }
      );
    }

    // Convert array of settings to object
    const mapsSettings: Record<string, any> = {};
    settings?.forEach((setting: any) => {
      mapsSettings[setting.setting_key] = setting.setting_value;
    });

    return NextResponse.json(mapsSettings);
  } catch (error) {
    console.error('Error in maps settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const serverClient = createServerSupabaseClient();
    
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Define the settings structure for maps
    const mapsSettingsMap = [
      { key: 'google_maps_enabled', value: body.enabled || false },
      { key: 'google_maps_api_key', value: body.apiKey || '' },
      { key: 'maps_default_zoom', value: body.defaultZoom || 10 },
      { key: 'maps_default_center', value: body.defaultCenter || { lat: 24.7136, lng: 46.6753 } },
      { key: 'maps_map_type', value: body.mapType || 'roadmap' },
      { key: 'maps_theme', value: body.theme || 'default' },
      { key: 'maps_enable_clustering', value: body.enableClustering || false },
      { key: 'maps_enable_street_view', value: body.enableStreetView || false },
      { key: 'maps_enable_fullscreen', value: body.enableFullscreen || false },
      { key: 'maps_enable_zoom_control', value: body.enableZoomControl || false },
      { key: 'maps_enable_map_type_control', value: body.enableMapTypeControl || false },
      { key: 'maps_enable_scale_control', value: body.enableScaleControl || false },
      { key: 'maps_language', value: body.language || 'ar' },
      { key: 'maps_region', value: body.region || 'SA' },
      
      // Location tracking settings
      { key: 'location_tracking_enabled', value: body.locationTracking?.enabled || false },
      { key: 'location_request_on_login', value: body.locationTracking?.requestOnLogin || false },
      { key: 'location_request_on_clinic_registration', value: body.locationTracking?.requestOnClinicRegistration || false },
      { key: 'location_request_on_order_creation', value: body.locationTracking?.requestOnOrderCreation || false },
      { key: 'location_request_on_visit_creation', value: body.locationTracking?.requestOnVisitCreation || false },
      { key: 'location_request_on_payment', value: body.locationTracking?.requestOnPayment || false },
      { key: 'location_enable_geofencing', value: body.locationTracking?.enableGeofencing || false },
      { key: 'location_geofence_radius', value: body.locationTracking?.geofenceRadius || 1.0 },
      { key: 'location_enable_route_tracking', value: body.locationTracking?.enableRouteTracking || false },
      { key: 'location_enable_activity_logging', value: body.locationTracking?.enableActivityLogging || false },
      { key: 'location_privacy_mode', value: body.locationTracking?.privacyMode || 'balanced' },
      
      // Geocoding settings
      { key: 'geocoding_enable_reverse', value: body.geocoding?.enableReverseGeocoding || false },
      { key: 'geocoding_cache_results', value: body.geocoding?.cacheResults || false },
      { key: 'geocoding_enable_autocomplete', value: body.geocoding?.enableAddressAutoComplete || false }
    ];

    // Detect optional is_enabled column once
    let hasIsEnabledColumn = false;
    try {
      const testQuery = await serverClient
        .from('system_settings')
        .select('is_enabled')
        .limit(1);
      if (!testQuery.error) {
        hasIsEnabledColumn = true;
      }
    } catch (e) {
      // Ignore error if column doesn't exist
    }

    // Save each setting (update-if-exists, else insert), avoiding onConflict requirement
    for (const setting of mapsSettingsMap) {
      const baseData: any = {
        category: 'maps',
        setting_key: setting.key,
        setting_value: setting.value,
        description: `Google Maps setting: ${setting.key}`,
        updated_at: new Date().toISOString()
      };

      if (hasIsEnabledColumn) {
        baseData.is_enabled = true;
      }

      // 1) Try to update existing row
      const { data: updateRows, error: updateError } = await serverClient
        .from('system_settings')
        .update(baseData)
        .eq('category', 'maps')
        .eq('setting_key', setting.key)
        .select('id');

      if (updateError) {
        console.error(`Error updating setting ${setting.key}:`, updateError);
        return NextResponse.json(
          { error: `Failed to update setting: ${setting.key}` },
          { status: 500 }
        );
      }

      // 2) If no rows were updated, insert new row
      if (!updateRows || updateRows.length === 0) {
        const insertData: any = {
          ...baseData,
          created_at: new Date().toISOString()
        };

        const { error: insertError } = await serverClient
          .from('system_settings')
          .insert(insertData);

        if (insertError) {
          console.error(`Error inserting setting ${setting.key}:`, insertError);
          return NextResponse.json(
            { error: `Failed to insert setting: ${setting.key}` },
            { status: 500 }
          );
        }
      }
    }

    // Log the admin action
    try {
      await fetch(`${request.nextUrl.origin}/api/activity-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'settings_update',
          title: 'تحديث إعدادات الخرائط',
          details: `تم تحديث إعدادات خرائط Google وتتبع المواقع - API Key: ${body.apiKey ? 'متاح' : 'غير متاح'}`,
          entityType: 'settings',
          entityId: 'maps_configuration',
          isSuccess: true,
          riskScore: 5 // Low risk admin action
        }),
      });
    } catch (logError) {
      console.warn('Failed to log maps settings update:', logError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Maps settings updated successfully' 
    });
  } catch (error) {
    console.error('Error in maps settings POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}