"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MultiSelectLocations } from "@/components/ui/multi-select-locations";

interface AreaLineSelectorProps {
  areas: string[];
  lines: (string | undefined)[];
  area?: string;
  line?: string;
  locations?: string[];
  primaryLocation?: string;
  onChange: (v: { area?: string; line?: string; locations?: string[]; primaryLocation?: string }) => void;
  useMultiLocation?: boolean;
}

export default function AreaLineSelector({ 
  areas, 
  lines, 
  area, 
  line, 
  locations = [], 
  primaryLocation,
  onChange,
  useMultiLocation = true 
}: AreaLineSelectorProps) {
  // Defensive normalization for areas and lines
  const safeAreas = Array.isArray(areas)
    ? (areas.filter(Boolean).map(String) as string[])
    : (areas && typeof areas === 'object')
      ? (Object.values(areas as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  const safeLines = Array.isArray(lines)
    ? (lines.filter(Boolean).map(String) as string[])
    : (lines && typeof lines === 'object')
      ? (Object.values(lines as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  
  const handleLocationChange = (newLocations: string[]) => {
    onChange({ 
      area: primaryLocation || newLocations[0], 
      locations: newLocations,
      primaryLocation: primaryLocation || newLocations[0] 
    });
  };
  
  const handlePrimaryLocationChange = (newPrimary: string) => {
    onChange({ 
      area: newPrimary,
      locations,
      primaryLocation: newPrimary 
    });
  };
  
  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🌍 معلومات المواقع
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {useMultiLocation ? (
          // Modern multi-location selector
          <MultiSelectLocations
            locations={safeAreas}
            selectedLocations={locations}
            primaryLocation={primaryLocation}
            onSelectionChange={handleLocationChange}
            onPrimaryChange={handlePrimaryLocationChange}
            label="المواقع المطلوبة *"
            placeholder="اختر المواقع التي تخدمها هذه العيادة"
            required
            showPrimary
          />
        ) : (
          // Legacy single location selector
          <div className="space-y-2">
            <Label>المنطقة *</Label>
            <RadioGroup value={area} onValueChange={(v) => onChange({ area: v })} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {safeAreas.map((a) => (
                <div key={a} className="border rounded-md p-3 hover:border-primary transition-colors flex items-center gap-3">
                  <RadioGroupItem id={`area-${a}`} value={a} />
                  <Label htmlFor={`area-${a}`} className="cursor-pointer flex-1">{a}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Line Selector - Always shown */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            📋 الخط *
          </Label>
          <RadioGroup 
            value={line} 
            onValueChange={(v) => onChange({ line: v })} 
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {safeLines.map((l) => (
              <div 
                key={l} 
                className="border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 flex items-center gap-3 cursor-pointer group"
              >
                <RadioGroupItem id={`line-${l}`} value={l!} className="text-blue-600" />
                <Label 
                  htmlFor={`line-${l}`} 
                  className="cursor-pointer flex-1 font-medium group-hover:text-blue-700 transition-colors duration-200"
                >
                  {l}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        {/* Info message for multi-location */}
        {useMultiLocation && locations.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">
                ℹ️
              </div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">عيادة متعددة المواقع</p>
                <p>تم تحديد {locations.length} مواقع لهذه العيادة. الموقع الرئيسي: <strong>{primaryLocation}</strong></p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
