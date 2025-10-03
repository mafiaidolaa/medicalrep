import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/users/[id]/locations - Get user locations
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = createServerSupabaseClient();

    // Get user locations from junction table
    const { data: locations, error } = await supabase
      .from('user_locations')
      .select('location_name, is_primary')
      .eq('user_id', id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error fetching user locations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract location names and primary location
    const locationNames = locations?.map(l => l.location_name) || [];
    const primaryLocation = locations?.find(l => l.is_primary)?.location_name || '';

    // If no locations found, fall back to area field
    if (locationNames.length === 0) {
      const { data: user } = await supabase
        .from('users')
        .select('area')
        .eq('id', id)
        .single();

      if (user?.area) {
        return NextResponse.json({
          locations: [user.area],
          primaryLocation: user.area
        });
      }
    }

    return NextResponse.json({
      locations: locationNames,
      primaryLocation
    });

  } catch (error: any) {
    console.error('GET /api/users/[id]/locations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id]/locations - Update user locations
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { locations, primaryLocation } = body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: 'Locations array is required and must not be empty' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Use the set_user_locations function
    const { error } = await supabase
      .rpc('set_user_locations', {
        user_uuid: id,
        locations: locations,
        primary_location: primaryLocation || locations[0]
      });

    if (error) {
      console.error('Error updating user locations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User locations updated successfully',
      locations,
      primaryLocation: primaryLocation || locations[0]
    });

  } catch (error: any) {
    console.error('PUT /api/users/[id]/locations error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}