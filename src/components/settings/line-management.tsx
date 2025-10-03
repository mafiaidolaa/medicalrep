"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Route, Plus, Edit, Trash2, Users, Building, Search, MapPin } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';

interface Line {
  id: string;
  name: string;
  description?: string;
  color: string;
  areaId?: string;
  areaName?: string;
  usersCount?: number;
  clinicsCount?: number;
  createdAt?: Date;
}

const LINE_COLORS = [
  '#1E40AF', '#DC2626', '#059669', '#D97706',
  '#7C3AED', '#0891B2', '#65A30D', '#EA580C',
  '#C2410C', '#0F766E', '#7C2D12', '#4C1D95'
];

export function LineManagement() {
  const { areas, lines, setLines, users, clinics, isClient } = useDataProvider();
  const { toast } = useToast();
  
  const [localLines, setLocalLines] = useState<Line[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Sanitize areas once and reuse everywhere
  const sanitizedAreas = useMemo(() => {
    try {
      return (areas || [])
        .map(a => (a ? String(a).trim() : ''))
        .filter(v => v.length > 0);
    } catch {
      return [] as string[];
    }
  }, [areas]);

  // Dev-only diagnostics to ensure no empty values leak into Select
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Avoid logging huge arrays repeatedly
      // eslint-disable-next-line no-console
      console.log('[LineManagement] areas(raw)->sanitized', areas, sanitizedAreas);
    }
  }, [areas, sanitizedAreas]);

  // Ensure selectedArea is always a valid option
  useEffect(() => {
    const allowed = new Set(['all', ...sanitizedAreas]);
    if (!allowed.has(selectedArea)) {
      setSelectedArea('all');
    }
  }, [sanitizedAreas, selectedArea]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<Line | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: LINE_COLORS[0],
    areaName: 'none'
  });

  // Keep formData.areaName valid based on sanitizedAreas
  useEffect(() => {
    const allowed = new Set(['none', ...sanitizedAreas]);
    if (!allowed.has(formData.areaName)) {
      setFormData(prev => ({ ...prev, areaName: 'none' }));
    }
  }, [sanitizedAreas, formData.areaName]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[LineManagement] formData(areaName)', formData.areaName);
    }
  }, [formData.areaName]);

  useEffect(() => {
    // Wait for client-side hydration
    if (!isClient) {
      return;
    }

    // Convert simple lines to structured data with area connections
    const structuredLines = lines.map((lineName, index) => {
      const relatedArea = areas.find(areaName => 
        clinics.some(clinic => 
          clinic.area === areaName && clinic.line === lineName
        ) ||
        users.some(user => 
          user.area === areaName && user.line === lineName
        )
      );

      return {
        id: `line-${index}`,
        name: lineName,
        color: LINE_COLORS[index % LINE_COLORS.length],
        areaName: relatedArea || '',
        usersCount: users.filter(user => user.line === lineName).length,
        clinicsCount: clinics.filter(clinic => clinic.line === lineName).length,
      };
    });

    setLocalLines(structuredLines);
    setIsLoading(false);
    
    // Debug info (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('LineManagement - Lines:', lines);
      console.log('LineManagement - Structured Lines:', structuredLines);
    }
  }, [lines, areas, users, clinics, isClient]);

  const filteredLines = localLines.filter(line => {
    const matchesSearch = line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         line.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'all' || line.areaName === selectedArea;
    return matchesSearch && matchesArea;
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: LINE_COLORS[0],
      areaName: 'none'
    });
    setSelectedLine(null);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;

    try {
      const newLine: Line = {
        id: `line-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        areaName: formData.areaName === 'none' ? '' : formData.areaName,
        usersCount: 0,
        clinicsCount: 0,
        createdAt: new Date()
      };

      const updatedLines = [...lines, formData.name.trim()];
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setLines(updatedLines);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        setLocalLines([...localLines, newLine]);
        resetForm();
        setAddDialogOpen(false);

        toast({
          title: 'تمت إضافة الخط',
          description: `تمت إضافة خط "${formData.name}" بنجاح وحفظه في قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error adding line:', error);
      toast({
        title: 'فشل في إضافة الخط',
        description: error.message || 'حدث خطأ أثناء إضافة الخط. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !selectedLine) return;

    try {
      const updatedLines = lines.map(name => 
        name === selectedLine.name ? formData.name.trim() : name
      );
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setLines(updatedLines);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        const updatedLocalLines = localLines.map(line =>
          line.id === selectedLine.id
            ? { 
                ...line, 
                name: formData.name.trim(), 
                description: formData.description.trim() || undefined, 
                color: formData.color,
                areaName: formData.areaName === 'none' ? '' : formData.areaName
              }
            : line
        );
        
        setLocalLines(updatedLocalLines);
        resetForm();
        setEditDialogOpen(false);

        toast({
          title: 'تم تحديث الخط',
          description: `تم تحديث خط "${formData.name}" بنجاح وحفظه في قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error updating line:', error);
      toast({
        title: 'فشل في تحديث الخط',
        description: error.message || 'حدث خطأ أثناء تحديث الخط. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (line: Line) => {
    try {
      const updatedLines = lines.filter(name => name !== line.name);
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setLines(updatedLines);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        setLocalLines(localLines.filter(l => l.id !== line.id));

        toast({
          title: 'تم حذف الخط',
          description: `تم حذف خط "${line.name}" بنجاح من قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error deleting line:', error);
      toast({
        title: 'فشل في حذف الخط',
        description: error.message || 'حدث خطأ أثناء حذف الخط. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (line: Line) => {
    setSelectedLine(line);
    setFormData({
      name: line.name,
      description: line.description || '',
      color: line.color,
      areaName: line.areaName || 'none'
    });
    setEditDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Route className="h-6 w-6 text-green-500" />
              إدارة الخطوط
            </h2>
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Route className="h-6 w-6 text-green-500" />
            إدارة الخطوط
          </h2>
          <p className="text-muted-foreground">إدارة خطوط العمل والمسارات في النظام</p>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {localLines.length} خط
          </Badge>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
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
                  <Label htmlFor="area-select">المنطقة (اختياري)</Label>
                  <Select value={formData.areaName} onValueChange={(value) => setFormData({ ...formData, areaName: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنطقة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون منطقة</SelectItem>
                      {sanitizedAreas.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">اسم الخط</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: خط 1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">وصف الخط (اختياري)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف الخط..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>اللون</Label>
                  <div className="flex gap-2 mt-2">
                    {LINE_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color === color ? 'border-black' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAdd} disabled={!formData.name.trim()}>
                    إضافة
                  </Button>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="البحث في الخطوط..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-64">
          <Select value={selectedArea} onValueChange={setSelectedArea}>
            <SelectTrigger>
              <SelectValue placeholder="تصفية حسب المنطقة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المناطق</SelectItem>
              {sanitizedAreas.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLines.map((line) => (
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(line)}
                  >
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
                          onClick={() => handleDelete(line)}
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
              {line.areaName && (
                <Badge variant="outline" className="w-fit text-xs flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {line.areaName}
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
        ))}
      </div>

      {/* Empty state when searching or filtering */}
      {filteredLines.length === 0 && (searchTerm || selectedArea !== 'all') && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            لا توجد خطوط تطابق الفلترة المحددة
          </p>
        </div>
      )}
      
      {/* Empty state when no lines at all */}
      {localLines.length === 0 && !searchTerm && selectedArea === 'all' && (
        <div className="text-center py-12">
          <Route className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد خطوط بعد</h3>
          <p className="mt-2 text-muted-foreground">ابدأ بإضافة أول خط للنظام</p>
          <div className="mt-6">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة خط
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الخط</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-area-select">المنطقة (اختياري)</Label>
              <Select value={formData.areaName} onValueChange={(value) => setFormData({ ...formData, areaName: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون منطقة</SelectItem>
                  {sanitizedAreas.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-name">اسم الخط</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: خط 1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">وصف الخط (اختياري)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف الخط..."
                rows={3}
              />
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 mt-2">
                {LINE_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? 'border-black' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                حفظ التغييرات
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}