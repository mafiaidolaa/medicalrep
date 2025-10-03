"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapPin, Route, Search, Check, X, Users, Building } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { cn } from '@/lib/utils';

interface AreaLineSelection {
  area?: string;
  line?: string;
}

interface AreaLineSelectorProps {
  value?: AreaLineSelection;
  onChange?: (selection: AreaLineSelection) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  mode?: 'area-only' | 'line-only' | 'both';
  className?: string;
}

interface Area {
  id: string;
  name: string;
  color: string;
  usersCount: number;
  clinicsCount: number;
  lines: Line[];
}

interface Line {
  id: string;
  name: string;
  areaName: string;
  color: string;
  usersCount: number;
  clinicsCount: number;
}

const AREA_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
  '#EC4899', '#14B8A6', '#6366F1', '#F59E0B'
];

const LINE_COLORS = [
  '#1E40AF', '#DC2626', '#059669', '#D97706',
  '#7C3AED', '#0891B2', '#65A30D', '#EA580C',
  '#C2410C', '#0F766E', '#7C2D12', '#4C1D95'
];

export function AreaLineSelector({
  value = {},
  onChange,
  placeholder = "اختر المنطقة والخط",
  allowEmpty = false,
  mode = 'both',
  className
}: AreaLineSelectorProps) {
  const { areas, lines, users, clinics } = useDataProvider();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelection, setLocalSelection] = useState<AreaLineSelection>(value);
  const [structuredAreas, setStructuredAreas] = useState<Area[]>([]);
  const [structuredLines, setStructuredLines] = useState<Line[]>([]);

  useEffect(() => {
    const arrAreas = Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []);
    const arrLines = Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []);

    // Convert simple arrays to structured data with relationships
    const areaData = arrAreas.map((areaName: any, index: number) => ({
      id: `area-${index}`,
      name: String(areaName),
      color: AREA_COLORS[index % AREA_COLORS.length],
      usersCount: users.filter(user => user.area === String(areaName)).length,
      clinicsCount: clinics.filter(clinic => clinic.area === String(areaName)).length,
      lines: arrLines
        .filter((lineName: any) => 
          clinics.some(clinic => clinic.area === String(areaName) && clinic.line === String(lineName)) ||
          users.some(user => user.area === String(areaName) && user.line === String(lineName))
        )
        .map((lineName: any, lineIndex: number) => ({
          id: `line-${index}-${lineIndex}`,
          name: String(lineName),
          areaName: String(areaName),
          color: LINE_COLORS[lineIndex % LINE_COLORS.length],
          usersCount: users.filter(user => user.line === String(lineName) && user.area === String(areaName)).length,
          clinicsCount: clinics.filter(clinic => clinic.line === String(lineName) && clinic.area === String(areaName)).length,
        }))
    }));

    const lineData = arrLines.map((lineName: any, index: number) => {
      const relatedArea = arrAreas.find((areaName: any) => 
        clinics.some(clinic => clinic.area === String(areaName) && clinic.line === String(lineName)) ||
        users.some(user => user.area === String(areaName) && user.line === String(lineName))
      );

      return {
        id: `line-${index}`,
        name: String(lineName),
        areaName: String(relatedArea || ''),
        color: LINE_COLORS[index % LINE_COLORS.length],
        usersCount: users.filter(user => user.line === String(lineName)).length,
        clinicsCount: clinics.filter(clinic => clinic.line === String(lineName)).length,
      };
    });

    setStructuredAreas(areaData);
    setStructuredLines(lineData);
  }, [areas, lines, users, clinics]);

  useEffect(() => {
    setLocalSelection(value);
  }, [value]);

  const filteredAreas = structuredAreas.filter(area =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLines = structuredLines.filter(line =>
    line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    line.areaName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAreaSelect = (area: Area) => {
    const newSelection = { ...localSelection, area: area.name };
    if (mode === 'both' && localSelection.line) {
      // Check if current line belongs to new area, if not clear it
      const lineInArea = area.lines.some(l => l.name === localSelection.line);
      if (!lineInArea) {
        newSelection.line = undefined;
      }
    }
    setLocalSelection(newSelection);
    if (mode === 'area-only') {
      onChange?.(newSelection);
      setOpen(false);
    }
  };

  const handleLineSelect = (line: Line) => {
    const newSelection = { 
      ...localSelection, 
      line: line.name,
      ...(mode === 'both' && { area: line.areaName })
    };
    setLocalSelection(newSelection);
    if (mode === 'line-only') {
      onChange?.(newSelection);
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    onChange?.(localSelection);
    setOpen(false);
  };

  const handleClear = () => {
    const emptySelection = {};
    setLocalSelection(emptySelection);
    onChange?.(emptySelection);
    setOpen(false);
  };

  const getDisplayValue = () => {
    if (!value.area && !value.line) return placeholder;
    
    const parts = [];
    if (value.area && (mode === 'area-only' || mode === 'both')) {
      parts.push(value.area);
    }
    if (value.line && (mode === 'line-only' || mode === 'both')) {
      parts.push(value.line);
    }
    
    return parts.join(' - ') || placeholder;
  };

  const getAreaColor = (areaName: string) => {
    const area = structuredAreas.find(a => a.name === areaName);
    return area?.color || '#6B7280';
  };

  const getLineColor = (lineName: string) => {
    const line = structuredLines.find(l => l.name === lineName);
    return line?.color || '#6B7280';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value.area && !value.line && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 w-full">
            {value.area && (mode === 'area-only' || mode === 'both') && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getAreaColor(value.area) }}
                />
                <MapPin className="h-3 w-3" />
              </div>
            )}
            {value.line && (mode === 'line-only' || mode === 'both') && (
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getLineColor(value.line) }}
                />
                <Route className="h-3 w-3" />
              </div>
            )}
            <span className="flex-1 truncate">{getDisplayValue()}</span>
          </div>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'area-only' && <><MapPin className="h-5 w-5" /> اختر المنطقة</>}
            {mode === 'line-only' && <><Route className="h-5 w-5" /> اختر الخط</>}
            {mode === 'both' && <><MapPin className="h-4 w-4" /><Route className="h-4 w-4" /> اختر المنطقة والخط</>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="البحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Selection Display */}
          {(localSelection.area || localSelection.line) && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">الاختيار الحالي:</span>
                    {localSelection.area && (mode === 'area-only' || mode === 'both') && (
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-1"
                        style={{ backgroundColor: `${getAreaColor(localSelection.area)}20`, color: getAreaColor(localSelection.area) }}
                      >
                        <MapPin className="h-3 w-3" />
                        {localSelection.area}
                      </Badge>
                    )}
                    {localSelection.line && (mode === 'line-only' || mode === 'both') && (
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-1"
                        style={{ backgroundColor: `${getLineColor(localSelection.line)}20`, color: getLineColor(localSelection.line) }}
                      >
                        <Route className="h-3 w-3" />
                        {localSelection.line}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocalSelection({})}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Areas Table */}
            {(mode === 'area-only' || mode === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-blue-500" />
                    المناطق ({filteredAreas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredAreas.map((area) => (
                        <div
                          key={area.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            localSelection.area === area.name 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          )}
                          onClick={() => handleAreaSelect(area)}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: area.color }}
                            />
                            <div>
                              <div className="font-medium">{area.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {area.usersCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {area.clinicsCount}
                                </span>
                              </div>
                            </div>
                          </div>
                          {localSelection.area === area.name && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                      {filteredAreas.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد مناطق متاحة
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Lines Table */}
            {(mode === 'line-only' || mode === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Route className="h-5 w-5 text-green-500" />
                    الخطوط ({filteredLines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredLines.map((line) => (
                        <div
                          key={line.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            localSelection.line === line.name 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50",
                            mode === 'both' && localSelection.area && localSelection.area !== line.areaName && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => {
                            if (mode === 'both' && localSelection.area && localSelection.area !== line.areaName) return;
                            handleLineSelect(line);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: line.color }}
                            />
                            <div>
                              <div className="font-medium">{line.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-3">
                                {line.areaName && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {line.areaName}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {line.usersCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {line.clinicsCount}
                                </span>
                              </div>
                            </div>
                          </div>
                          {localSelection.line === line.name && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                      {filteredLines.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          لا توجد خطوط متاحة
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {allowEmpty && (
              <Button variant="outline" onClick={handleClear}>
                <X className="h-4 w-4 mr-2" />
                مسح الاختيار
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            {mode === 'both' && (
              <Button 
                onClick={handleConfirm}
                disabled={(!localSelection.area && !localSelection.line)}
              >
                <Check className="h-4 w-4 mr-2" />
                تأكيد الاختيار
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}