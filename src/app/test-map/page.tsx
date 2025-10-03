"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GoogleMapFixed from '@/components/GoogleMapFixed';

export default function TestMapPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setLocation({ lat, lng, address });
    console.log('Selected location:', { lat, lng, address });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>اختبار مكون الخريطة المحسن</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Location display */}
            {location && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">الموقع المحدد:</h3>
                <p><strong>خط العرض:</strong> {location.lat}</p>
                <p><strong>خط الطول:</strong> {location.lng}</p>
                {location.address && (
                  <p><strong>العنوان:</strong> {location.address}</p>
                )}
              </div>
            )}
            
            {/* Map component */}
            <GoogleMapFixed
              apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
              initialLat={30.0444}
              initialLng={31.2357}
              height="500px"
              onLocationSelect={handleLocationSelect}
              autoDetectLocation={false}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}