"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Plus, Edit, Trash2, Users, Building, Search } from 'lucide-react';
import { useDataProvider } from '@/lib/data-provider';
import { useToast } from '@/hooks/use-toast';

interface Area {
  id: string;
  name: string;
  description?: string;
  color: string;
  usersCount?: number;
  clinicsCount?: number;
  createdAt?: Date;
}

const AREA_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
  '#EC4899', '#14B8A6', '#F59E0B', '#6366F1'
];

export function AreaManagement() {
  const { areas, setAreas, users, clinics, isClient, getClinics } = useDataProvider();
  const { toast } = useToast();
  
  // Defensive normalization for areas
  const safeAreas = Array.isArray(areas)
    ? (areas.filter(Boolean).map(String) as string[])
    : (areas && typeof areas === 'object')
      ? (Object.values(areas as any).filter(Boolean).map(String) as string[])
      : ([] as string[]);
  
  const [localAreas, setLocalAreas] = useState<Area[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: AREA_COLORS[0]
  });

  useEffect(() => {
    // Wait for client-side hydration
    if (!isClient) {
      return;
    }

    // Convert simple areas to structured data
    const structuredAreas = safeAreas.map((areaName, index) => ({
      id: `area-${index}`,
      name: areaName,
      color: AREA_COLORS[index % AREA_COLORS.length],
      usersCount: users.filter(user => user.area === areaName).length,
      clinicsCount: clinics.filter(clinic => clinic.area === areaName).length,
    }));

    setLocalAreas(structuredAreas);
    setIsLoading(false);
    
    // Debug info (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('AreaManagement - Areas:', areas);
      console.log('AreaManagement - Structured Areas:', structuredAreas);
      console.log('AreaManagement - Users:', users.length);
      console.log('AreaManagement - Clinics:', clinics.length);
    }
  }, [areas, users, clinics, isClient]);

  const filteredAreas = localAreas.filter(area =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    area.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: AREA_COLORS[0]
    });
    setSelectedArea(null);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;

    try {
      const newArea: Area = {
        id: `area-${Date.now()}`,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        usersCount: 0,
        clinicsCount: 0,
        createdAt: new Date()
      };

      const updatedAreas = [...areas, formData.name.trim()];
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setAreas(updatedAreas);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        setLocalAreas([...localAreas, newArea]);
        resetForm();
        setAddDialogOpen(false);

        toast({
          title: 'تمت إضافة المنطقة',
          description: `تمت إضافة منطقة "${formData.name}" بنجاح وحفظها في قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error adding area:', error);
      toast({
        title: 'فشل في إضافة المنطقة',
        description: error.message || 'حدث خطأ أثناء إضافة المنطقة. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    if (!formData.name.trim() || !selectedArea) return;

    try {
      const updatedAreas = areas.map(name => 
        name === selectedArea.name ? formData.name.trim() : name
      );
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setAreas(updatedAreas);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        const updatedLocalAreas = localAreas.map(area =>
          area.id === selectedArea.id
            ? { ...area, name: formData.name.trim(), description: formData.description.trim() || undefined, color: formData.color }
            : area
        );
        
        setLocalAreas(updatedLocalAreas);
        resetForm();
        setEditDialogOpen(false);

        toast({
          title: 'تم تحديث المنطقة',
          description: `تم تحديث منطقة "${formData.name}" بنجاح وحفظها في قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error updating area:', error);
      toast({
        title: 'فشل في تحديث المنطقة',
        description: error.message || 'حدث خطأ أثناء تحديث المنطقة. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (area: Area) => {
    try {
      const updatedAreas = areas.filter(name => name !== area.name);
      
      // حفظ في قاعدة البيانات أولاً
      const result = await setAreas(updatedAreas);
      
      if (result.success) {
        // تحديث الواجهة فقط في حالة النجاح
        setLocalAreas(localAreas.filter(a => a.id !== area.id));

        toast({
          title: 'تم حذف المنطقة',
          description: `تم حذف منطقة "${area.name}" بنجاح من قاعدة البيانات.`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error deleting area:', error);
      toast({
        title: 'فشل في حذف المنطقة',
        description: error.message || 'حدث خطأ أثناء حذف المنطقة. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (area: Area) => {
    setSelectedArea(area);
    setFormData({
      name: area.name,
      description: area.description || '',
      color: area.color
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
              <MapPin className="h-6 w-6 text-blue-500" />
              إدارة المناطق
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
            <MapPin className="h-6 w-6 text-blue-500" />
            إدارة المناطق
          </h2>
          <p className="text-muted-foreground">إدارة المناطق الجغرافية في النظام</p>
        </div>
        
        <div className="flex gap-3">
          <Badge variant="outline" className="px-3 py-1">
            {localAreas.length} منطقة
          </Badge>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
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
                  <Label htmlFor="name">اسم المنطقة</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: القاهرة"
                  />
                </div>
                <div>
                  <Label htmlFor="description">وصف المنطقة (اختياري)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف المنطقة..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>اللون</Label>
                  <div className="flex gap-2 mt-2">
                    {AREA_COLORS.map((color) => (
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

      {/* Search */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="البحث في المناطق..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAreas.map((area) => (
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(area)}
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
                        <AlertDialogTitle>حذف المنطقة</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف منطقة "{area.name}"؟ 
                          سيؤثر هذا على {area.usersCount} مستخدم و {area.clinicsCount} عيادة.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(area)}
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state when searching */}
      {filteredAreas.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد مناطق تطابق البحث "{searchTerm}"</p>
        </div>
      )}
      
      {/* Empty state when no areas at all */}
      {localAreas.length === 0 && !searchTerm && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">لا توجد مناطق بعد</h3>
          <p className="mt-2 text-muted-foreground">ابدأ بإضافة أول منطقة للنظام</p>
          <div className="mt-6">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة منطقة
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المنطقة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المنطقة</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: القاهرة"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">وصف المنطقة (اختياري)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="وصف المنطقة..."
                rows={3}
              />
            </div>
            <div>
              <Label>اللون</Label>
              <div className="flex gap-2 mt-2">
                {AREA_COLORS.map((color) => (
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