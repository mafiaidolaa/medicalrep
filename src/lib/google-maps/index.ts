// Google Maps Integration with Location Tracking
// @ts-nocheck
import { supabase } from '../supabase';

// Types for Google Maps integration
export interface LocationSettings {
  id: string;
  enabled: boolean;
  require_location: boolean;
  auto_detect_location: boolean;
  allow_manual_location: boolean;
  max_distance_km: number; // Maximum allowed distance from office
  min_accuracy_meters: number; // Minimum GPS accuracy required
  office_locations: OfficeLocation[];
  geofencing_enabled: boolean;
  privacy_mode: 'full' | 'approximate' | 'off';
  track_employee_movement: boolean;
  movement_alert_threshold: number; // km per hour
  created_at: string;
  updated_at: string;
}

export interface OfficeLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radius_km: number;
  is_primary: boolean;
  department?: string;
  region?: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: string;
  address?: string;
  source: 'gps' | 'network' | 'manual';
}

export interface ExpenseLocation extends LocationData {
  id: string;
  expense_item_id: string;
  distance_from_office: number;
  nearest_office_id?: string;
  is_within_allowed_radius: boolean;
  location_verified: boolean;
  manual_override?: boolean;
  override_reason?: string;
  created_at: string;
}

export interface LocationTracking {
  id: string;
  user_id: string;
  locations: LocationData[];
  start_time: string;
  end_time?: string;
  total_distance: number;
  average_speed: number;
  max_speed: number;
  unusual_movement_detected: boolean;
  created_at: string;
}

class GoogleMapsService {
  private map: google.maps.Map | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private currentLocation: LocationData | null = null;

  // Initialize Google Maps
  async initialize(): Promise<boolean> {
    try {
      if (typeof google === 'undefined') {
        await this.loadGoogleMapsAPI();
      }

      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
      
      return true;
    } catch (error) {
      console.error('Google Maps initialization failed:', error);
      return false;
    }
  }

  // Load Google Maps API dynamically
  private loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof google !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      
      document.head.appendChild(script);
    });
  }

  // Get location settings
  async getLocationSettings(): Promise<LocationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('location_settings')
        .select('*')
        .single();

      if (error && error.code === 'PGRST116') {
        return await this.createDefaultLocationSettings();
      }

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get location settings failed:', error);
      return null;
    }
  }

  // Create default location settings
  async createDefaultLocationSettings(): Promise<LocationSettings | null> {
    try {
      const defaultSettings = {
        enabled: true,
        require_location: false,
        auto_detect_location: true,
        allow_manual_location: true,
        max_distance_km: 50,
        min_accuracy_meters: 100,
        office_locations: [
          {
            name: 'المكتب الرئيسي',
            address: 'الرياض، المملكة العربية السعودية',
            lat: 24.7136,
            lng: 46.6753,
            radius_km: 10,
            is_primary: true,
          }
        ],
        geofencing_enabled: false,
        privacy_mode: 'approximate' as const,
        track_employee_movement: false,
        movement_alert_threshold: 100,
      };

      const { data, error } = await supabase
        .from('location_settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create default location settings failed:', error);
      return null;
    }
  }

  // Update location settings
  async updateLocationSettings(settings: Partial<LocationSettings>): Promise<LocationSettings | null> {
    try {
      const { data, error } = await supabase
        .from('location_settings')
        .update(settings)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update location settings failed:', error);
      return null;
    }
  }

  // Get current location
  async getCurrentLocation(options?: PositionOptions): Promise<LocationData | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.error('Geolocation is not supported');
        resolve(null);
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: LocationData = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            source: 'gps',
          };

          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.error('Get current location failed:', error);
          resolve(null);
        },
        defaultOptions
      );
    });
  }

  // Watch location changes
  watchLocation(
    callback: (location: LocationData | null) => void,
    options?: PositionOptions
  ): number | null {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
      ...options,
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          source: 'gps',
        };

        this.currentLocation = location;
        callback(location);
      },
      (error) => {
        console.error('Watch location failed:', error);
        callback(null);
      },
      defaultOptions
    );
  }

  // Stop watching location
  clearLocationWatch(watchId: number): void {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<LocationData | null> {
    if (!this.geocoder) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      if (!this.geocoder) {
        resolve(null);
        return;
      }

      this.geocoder.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            address: results[0].formatted_address,
            timestamp: new Date().toISOString(),
            source: 'network',
          });
        } else {
          console.error('Geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.geocoder) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      if (!this.geocoder) {
        resolve(null);
        return;
      }

      const latLng = new google.maps.LatLng(lat, lng);
      
      this.geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
          resolve(results[0].formatted_address);
        } else {
          console.error('Reverse geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Calculate distance between two points
  calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Find nearest office
  async findNearestOffice(location: LocationData): Promise<{
    office: OfficeLocation | null;
    distance: number;
  }> {
    try {
      const settings = await this.getLocationSettings();
      if (!settings?.office_locations?.length) {
        return { office: null, distance: Infinity };
      }

      let nearestOffice: OfficeLocation | null = null;
      let minDistance = Infinity;

      for (const office of settings.office_locations) {
        const distance = this.calculateDistance(location, office);
        if (distance < minDistance) {
          minDistance = distance;
          nearestOffice = office;
        }
      }

      return { office: nearestOffice, distance: minDistance };
    } catch (error) {
      console.error('Find nearest office failed:', error);
      return { office: null, distance: Infinity };
    }
  }

  // Validate location for expense
  async validateExpenseLocation(
    expenseItemId: string,
    location: LocationData
  ): Promise<ExpenseLocation | null> {
    try {
      const settings = await this.getLocationSettings();
      if (!settings?.enabled) {
        return null;
      }

      // Find nearest office and calculate distance
      const { office: nearestOffice, distance } = await this.findNearestOffice(location);
      
      // Check if location is within allowed radius
      const isWithinRadius = distance <= settings.max_distance_km;
      
      // Get address if not provided
      let address = location.address;
      if (!address) {
        address = await this.reverseGeocode(location.lat, location.lng);
      }

      const expenseLocation: Omit<ExpenseLocation, 'id' | 'created_at'> = {
        expense_item_id: expenseItemId,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        address,
        source: location.source,
        distance_from_office: distance,
        nearest_office_id: nearestOffice?.id,
        is_within_allowed_radius: isWithinRadius,
        location_verified: location.accuracy ? location.accuracy <= settings.min_accuracy_meters : false,
      };

      // Save to database
      const { data, error } = await supabase
        .from('expense_locations')
        .insert(expenseLocation)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Validate expense location failed:', error);
      return null;
    }
  }

  // Track user movement
  async startLocationTracking(userId: string): Promise<string | null> {
    try {
      const settings = await this.getLocationSettings();
      if (!settings?.track_employee_movement) {
        return null;
      }

      // Create tracking session
      const tracking = {
        user_id: userId,
        locations: [],
        start_time: new Date().toISOString(),
        total_distance: 0,
        average_speed: 0,
        max_speed: 0,
        unusual_movement_detected: false,
      };

      const { data, error } = await supabase
        .from('location_tracking')
        .insert(tracking)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Start location tracking failed:', error);
      return null;
    }
  }

  // Update location tracking
  async updateLocationTracking(
    trackingId: string,
    location: LocationData
  ): Promise<boolean> {
    try {
      const { data: tracking, error: fetchError } = await supabase
        .from('location_tracking')
        .select('*')
        .eq('id', trackingId)
        .single();

      if (fetchError || !tracking) return false;

      const locations = [...tracking.locations, location];
      const stats = this.calculateMovementStats(locations);

      const { error: updateError } = await supabase
        .from('location_tracking')
        .update({
          locations,
          total_distance: stats.totalDistance,
          average_speed: stats.averageSpeed,
          max_speed: stats.maxSpeed,
          unusual_movement_detected: stats.unusualMovement,
        })
        .eq('id', trackingId);

      return !updateError;
    } catch (error) {
      console.error('Update location tracking failed:', error);
      return false;
    }
  }

  // Stop location tracking
  async stopLocationTracking(trackingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('location_tracking')
        .update({
          end_time: new Date().toISOString(),
        })
        .eq('id', trackingId);

      return !error;
    } catch (error) {
      console.error('Stop location tracking failed:', error);
      return false;
    }
  }

  // Calculate movement statistics
  private calculateMovementStats(locations: LocationData[]): {
    totalDistance: number;
    averageSpeed: number;
    maxSpeed: number;
    unusualMovement: boolean;
  } {
    if (locations.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        unusualMovement: false,
      };
    }

    let totalDistance = 0;
    let maxSpeed = 0;
    const speeds: number[] = [];

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      const distance = this.calculateDistance(prev, curr);
      totalDistance += distance;

      const timeDiff = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / (1000 * 60 * 60); // hours
      const speed = timeDiff > 0 ? distance / timeDiff : 0;
      
      speeds.push(speed);
      maxSpeed = Math.max(maxSpeed, speed);
    }

    const averageSpeed = speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0;
    
    // Detect unusual movement (speed > 150 km/h consistently)
    const unusualMovement = speeds.filter(speed => speed > 150).length > speeds.length * 0.3;

    return {
      totalDistance,
      averageSpeed,
      maxSpeed,
      unusualMovement,
    };
  }

  // Get location history for user
  async getLocationHistory(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<LocationTracking[]> {
    try {
      let query = supabase
        .from('location_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false });

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get location history failed:', error);
      return [];
    }
  }

  // Create map instance
  createMap(container: HTMLElement, options?: google.maps.MapOptions): google.maps.Map | null {
    if (typeof google === 'undefined') {
      console.error('Google Maps API not loaded');
      return null;
    }

    const defaultOptions: google.maps.MapOptions = {
      zoom: 10,
      center: { lat: 24.7136, lng: 46.6753 }, // Riyadh
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      ...options,
    };

    this.map = new google.maps.Map(container, defaultOptions);
    return this.map;
  }

  // Add marker to map
  addMarker(
    position: google.maps.LatLngLiteral,
    options?: google.maps.MarkerOptions
  ): google.maps.Marker | null {
    if (!this.map) {
      console.error('Map not initialized');
      return null;
    }

    const marker = new google.maps.Marker({
      position,
      map: this.map,
      ...options,
    });

    return marker;
  }

  // Add circle (geofence) to map
  addCircle(
    center: google.maps.LatLngLiteral,
    radius: number,
    options?: google.maps.CircleOptions
  ): google.maps.Circle | null {
    if (!this.map) {
      console.error('Map not initialized');
      return null;
    }

    const circle = new google.maps.Circle({
      center,
      radius: radius * 1000, // Convert km to meters
      map: this.map,
      fillColor: '#4285f4',
      fillOpacity: 0.1,
      strokeColor: '#4285f4',
      strokeOpacity: 0.5,
      strokeWeight: 2,
      ...options,
    });

    return circle;
  }

  // Check if location is within geofence
  isLocationInGeofence(
    location: LocationData,
    geofence: { center: { lat: number; lng: number }; radius: number }
  ): boolean {
    const distance = this.calculateDistance(location, geofence.center);
    return distance <= geofence.radius;
  }

  // Get places suggestions
  async getPlaceSuggestions(query: string): Promise<google.maps.places.AutocompletePrediction[]> {
    return new Promise((resolve) => {
      if (typeof google === 'undefined') {
        resolve([]);
        return;
      }

      const service = new google.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'SA' }, // Saudi Arabia
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  // Get place details
  async getPlaceDetails(placeId: string): Promise<google.maps.places.PlaceResult | null> {
    return new Promise((resolve) => {
      if (typeof google === 'undefined' || !this.map) {
        resolve(null);
        return;
      }

      const service = new google.maps.places.PlacesService(this.map);
      
      service.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  // Privacy protection - approximate location
  approximateLocation(location: LocationData, radiusKm: number = 1): LocationData {
    // Add random offset within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    
    const lat = location.lat + (distance / 111.32) * Math.cos(angle); // 1 degree lat ≈ 111.32 km
    const lng = location.lng + (distance / (111.32 * Math.cos(location.lat * Math.PI / 180))) * Math.sin(angle);

    return {
      ...location,
      lat,
      lng,
      accuracy: Math.max(location.accuracy || 0, radiusKm * 1000),
    };
  }
}

export const googleMapsService = new GoogleMapsService();
export default googleMapsService;