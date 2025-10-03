"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MapPin, Plus, Edit, Trash2, Route, Users, Building } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';

interface Area {
  id: string;
  name: string;
  description?: string;
  color: string;
  lines: Line[];
  usersCount?: number;
  clinicsCount?: number;
}

interface Line {
  id: string;
  name: string;
  areaId: string;
  color: string;
  description?: string;
  usersCount?: number;
  clinicsCount?: number;
}

const AREA_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

const LINE_COLORS = [
  '#1E40AF', '#DC2626', '#059669', '#D97706',
  '#7C3AED', '#0891B2', '#65A30D', '#EA580C'
];

export default function AreasLinesPage() {
  const { areas, lines, setAreas, setLines, users, clinics } = useDataProvider();
  const { toast } = useToast();
  
  const [localAreas, setLocalAreas] = useState<Area[]>([]);
  const [localLines, setLocalLines] = useState<Line[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDescription, setNewAreaDescription] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newLineDescription, setNewLineDescription] = useState('');
  const [selectedAreaForLine, setSelectedAreaForLine] = useState('');
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [editingLine, setEditingLine] = useState<Line | null>(null);
  const [addAreaOpen, setAddAreaOpen] = useState(false);
  const [addLineOpen, setAddLineOpen] = useState(false);

  useEffect(() => {
    // Normalize arrays defensively
    const arrAreas = Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []);
    const arrLines = Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []);

    // Convert simple arrays to structured data
    const structuredAreas = arrAreas.map((areaName: any, index: number) => ({
      id: `area-${index}`,
      name: String(areaName),
      color: AREA_COLORS[index % AREA_COLORS.length],
      lines: arrLines
        .filter((lineName: any) => 
          clinics.some(clinic => 
            clinic.area === String(areaName) && clinic.line === String(lineName)
          ) ||
          users.some(user => 
            user.area === String(areaName) && user.line === String(lineName)
          )
        )
        .map((lineName: any, lineIndex: number) => ({
          id: `line-${index}-${lineIndex}`,
          name: String(lineName),
          areaId: `area-${index}`,
          color: LINE_COLORS[lineIndex % LINE_COLORS.length]
        })),
      usersCount: users.filter(user => user.area === String(areaName)).length,
      clinicsCount: clinics.filter(clinic => clinic.area === String(areaName)).length,
    }));

    const structuredLines = arrLines.map((lineName: any, index: number) => {
      const relatedArea = arrAreas.find((areaName: any) => 
        clinics.some(clinic => 
          clinic.area === String(areaName) && clinic.line === String(lineName)
        ) ||
        users.some(user => 
          user.area === String(areaName) && user.line === String(lineName)
        )
      );
      const areaIndex = arrAreas.indexOf(relatedArea ?? '');
      
      return {
        id: `line-${index}`,
        name: String(lineName),
        areaId: `area-${areaIndex}`,
        color: LINE_COLORS[index % LINE_COLORS.length],
        usersCount: users.filter(user => user.line === String(lineName)).length,
        clinicsCount: clinics.filter(clinic => clinic.line === String(lineName)).length,
      };
    });

    setLocalAreas(structuredAreas);
    setLocalLines(structuredLines);
  }, [areas, lines, users, clinics]);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;

    const newArea: Area = {
      id: `area-${Date.now()}`,
      name: newAreaName.trim(),
      description: newAreaDescription.trim() || undefined,
      color: AREA_COLORS[localAreas.length % AREA_COLORS.length],
      lines: [],
      usersCount: 0,
      clinicsCount: 0,
    };

    const updatedAreas = [...areas, newAreaName.trim()];
    setAreas(updatedAreas);
    setLocalAreas([...localAreas, newArea]);

    setNewAreaName('');
    setNewAreaDescription('');
    setAddAreaOpen(false);

    toast({
      title: 'تمت إضافة المنطقة',
      description: `تمت إضافة منطقة "${newAreaName}" بنجاح.`,
    });
  };

  const handleAddLine = async () => {
    if (!newLineName.trim() || !selectedAreaForLine) return;

    const newLine: Line = {
      id: `line-${Date.now()}`,
      name: newLineName.trim(),
      areaId: selectedAreaForLine,
      color: LINE_COLORS[localLines.length % LINE_COLORS.length],
      description: newLineDescription.trim() || undefined,
      usersCount: 0,
      clinicsCount: 0,
    };

    const updatedLines = [...lines, newLineName.trim()];
    setLines(updatedLines);
    setLocalLines([...localLines, newLine]);

    setNewLineName('');
    setNewLineDescription('');
    setSelectedAreaForLine('');
    setAddLineOpen(false);

    toast({
      title: 'تمت إضافة الخط',
      description: `تمت إضافة خط "${newLineName}" بنجاح.`,
    });
  };

  const handleDeleteArea = async (area: Area) => {
    const updatedAreas = areas.filter(name => name !== area.name);
    setAreas(updatedAreas);
    setLocalAreas(localAreas.filter(a => a.id !== area.id));

    toast({
      title: 'تم حذف المنطقة',
      description: `تم حذف منطقة "${area.name}" بنجاح.`,
    });
  };

  const handleDeleteLine = async (line: Line) => {
    const updatedLines = lines.filter(name => name !== line.name);
    setLines(updatedLines);
    setLocalLines(localLines.filter(l => l.id !== line.id));

    toast({
      title: 'تم حذف الخط',
      description: `تم حذف خط "${line.name}" بنجاح.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المناطق والخطوط</h1>
          <p className="text-muted-foreground">إدارة المناطق الجغرافية وخطوط العمل</p>
        </div>
      </div>

      <Tabs defaultValue="areas" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-fit">
          <TabsTrigger value="areas" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            المناطق
          </TabsTrigger>
          <TabsTrigger value="lines" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            الخطوط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                {localAreas.length} منطقة
              </Badge>
            </div>
            <Dialog open={addAreaOpen} onOpenChange={setAddAreaOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة منطقة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة منطقة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">اسم المنطقة</label>
                    <Input
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="مثال: القاهرة"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">وصف المنطقة (اختياري)</label>
                    <Input
                      value={newAreaDescription}
                      onChange={(e) => setNewAreaDescription(e.target.value)}
                      placeholder="وصف المنطقة..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>
                      إضافة
                    </Button>
                    <Button variant="outline" onClick={() => setAddAreaOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localAreas.map((area) => (
              <Card key={area.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: area.color }}
                      />
                      <CardTitle className="text-lg">{area.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف المنطقة</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف منطقة "{area.name}"؟ 
                              سيؤثر هذا على {area.usersCount} مستخدم و {area.clinicsCount} عيادة.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteArea(area)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  {area.description && (
                    <p className="text-sm text-muted-foreground">{area.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>{area.usersCount} مستخدم</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4 text-green-500" />
                      <span>{area.clinicsCount} عيادة</span>
                    </div>
                  </div>
                  {area.lines.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground mb-2">الخطوط:</div>
                      <div className="flex flex-wrap gap-1">
                        {area.lines.map((line) => (
                          <Badge key={line.id} variant="secondary" className="text-xs">
                            {line.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="lines" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                {localLines.length} خط
              </Badge>
            </div>
            <Dialog open={addLineOpen} onOpenChange={setAddLineOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة خط
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة خط جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">المنطقة</label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={selectedAreaForLine}
                      onChange={(e) => setSelectedAreaForLine(e.target.value)}
                    >
                      <option value="">اختر المنطقة</option>
                      {localAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">اسم الخط</label>
                    <Input
                      value={newLineName}
                      onChange={(e) => setNewLineName(e.target.value)}
                      placeholder="مثال: خط 1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">وصف الخط (اختياري)</label>
                    <Input
                      value={newLineDescription}
                      onChange={(e) => setNewLineDescription(e.target.value)}
                      placeholder="وصف الخط..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddLine} 
                      disabled={!newLineName.trim() || !selectedAreaForLine}
                    >
                      إضافة
                    </Button>
                    <Button variant="outline" onClick={() => setAddLineOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {localLines.map((line) => {
              const parentArea = localAreas.find(area => area.id === line.areaId);
              return (
                <Card key={line.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: line.color }}
                        />
                        <CardTitle className="text-lg">{line.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف الخط</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف خط "{line.name}"؟ 
                                سيؤثر هذا على {line.usersCount} مستخدم و {line.clinicsCount} عيادة.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteLine(line)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    {line.description && (
                      <p className="text-sm text-muted-foreground">{line.description}</p>
                    )}
                    {parentArea && (
                      <Badge variant="outline" className="w-fit text-xs">
                        {parentArea.name}
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{line.usersCount} مستخدم</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-green-500" />
                        <span>{line.clinicsCount} عيادة</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}