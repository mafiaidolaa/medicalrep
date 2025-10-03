"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Crosshair, Search, AlertTriangle } from "lucide-react";
import GoogleMapFixed from "@/components/GoogleMapFixed";
import { useMaps, useGeolocation } from "@/contexts/maps-context";
import { useClinicRegistrationLocation } from "@/hooks/use-controlled-geolocation";
import { loadGoogleMapsAPI } from "@/lib/google-maps-loader";

export type SelectedLocation = { lat: number; lng: number; address?: string };

interface LocationSelectorProps {
  apiKey?: string;
  autoDetect?: boolean;
  value?: SelectedLocation | null;
  onChange?: (v: SelectedLocation) => void;
}

export default function LocationSelector({ apiKey, autoDetect = true, value, onChange }: LocationSelectorProps) {
  const maps = useMaps();
  const geolocation = useGeolocation();
  const [address, setAddress] = useState(value?.address || "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // استخدام إعدادات النظام أولاً، ثم apiKey المُمرر كبديل
  const effectiveApiKey = maps.isEnabled ? maps.config.apiKey : apiKey;
  const mapsAvailable = Boolean(effectiveApiKey) && maps.isEnabled;

  const ensureMapsScript = useCallback(async () => {
    if (!effectiveApiKey) return false;
    if (typeof window === 'undefined') return false;
    if ((window as any).google?.maps?.places) return true;
    
    try {
      // Use singleton loader to prevent multiple script insertions
      await loadGoogleMapsAPI({
        apiKey: effectiveApiKey,
        libraries: ['places'],
        language: maps.config.language,
        region: maps.config.region
      });
      return true;
    } catch (error) {
      console.error('Failed to load Google Maps:', error);
      return false;
    }
  }, [effectiveApiKey, maps.config.language, maps.config.region]);

  // Initialize Places Autocomplete on the search input
  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;
    let listener: google.maps.MapsEventListener | null = null;

    const init = async () => {
      const ok = await ensureMapsScript();
      if (!ok || !inputRef.current) return;
      // @ts-ignore - types provided by @types/google.maps
      autocomplete = new google.maps.places.Autocomplete(inputRef.current!, {
        fields: ['geometry', 'formatted_address'],
        componentRestrictions: undefined,
      });
      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace();
        const loc = place?.geometry?.location;
        if (loc) {
          const lat = loc.lat();
          const lng = loc.lng();
          const addr = place.formatted_address || inputRef.current!.value;
          setAddress(addr);
          handleSelected(lat, lng, addr);
        }
      });
    };

    init();

    return () => {
      if (listener) listener.remove();
    };
  }, [ensureMapsScript]);

  const handleSelected = useCallback((lat: number, lng: number, addr?: string) => {
    onChange?.({ lat, lng, address: addr || address });
    if (addr && !address) setAddress(addr);
  }, [onChange, address]);

  const geocodeSearch = useCallback(async () => {
    if (!address?.trim()) return;
    if (!geolocation.isAvailable) { 
      setError("خدمة الخرائط غير متاحة. يرجى التحقق من الإعدادات."); 
      return; 
    }
    try {
      setBusy(true); setError(null);
      const result = await geolocation.geocode(address);
      if (result) {
        handleSelected(result.lat, result.lng, result.address);
      } else {
        setError("لم يتم العثور على نتائج للعنوان المحدد");
      }
    } catch (e: any) {
      setError("فشل في البحث عن العنوان");
    } finally {
      setBusy(false);
    }
  }, [address, geolocation, handleSelected]);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-background/80 border border-border shadow-sm rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          اختيار الموقع التفاعلي (Interactive Location Selection)
        </CardTitle>
        <CardDescription>
          ابحث، استخدم GPS، أو انقر على الخريطة لتحديد موقع العيادة بدقة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1">
            <Label htmlFor="searchAddress">العنوان (Search Address)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={inputRef} id="searchAddress" placeholder="اكتب العنوان أو اسم المكان..." value={address} onChange={(e) => setAddress(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="flex md:items-end gap-2">
            <Button type="button" variant="secondary" onClick={geocodeSearch} disabled={!address || busy} className="w-full md:w-auto">
              <Search className="h-4 w-4 mr-2" /> بحث
            </Button>
            {/* Current location button is inside the map controls; this gives a secondary place if map is disabled */}
            {!mapsAvailable && (
              <Button type="button" variant="outline" disabled className="w-full md:w-auto">
                <Crosshair className="h-4 w-4 mr-2" /> تحديد موقعي
              </Button>
            )}
          </div>
        </div>

        {/* Map or fallback */}
        {mapsAvailable ? (
          <GoogleMapFixed
            apiKey={effectiveApiKey!}
            initialLat={value?.lat}
            initialLng={value?.lng}
            autoDetectLocation={autoDetect}
            onLocationSelect={handleSelected}
            height="360px"
            useSystemSettings={true}
          />
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {maps.error 
                ? `خطأ في خدمة الخرائط: ${maps.error}` 
                : "خرائط جوجل غير مفعلة. يرجى تفعيلها من إعدادات النظام أو إدخال الإحداثيات يدويًا."
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Manual coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lat">خط العرض (Latitude)</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              placeholder="30.0444"
              value={value?.lat ?? ""}
              onChange={(e) => handleSelected(parseFloat(e.target.value || "0"), value?.lng ?? 0, value?.address)}
            />
          </div>
          <div>
            <Label htmlFor="lng">خط الطول (Longitude)</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              placeholder="31.2357"
              value={value?.lng ?? ""}
              onChange={(e) => handleSelected(value?.lat ?? 0, parseFloat(e.target.value || "0"), value?.address)}
            />
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
