"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Plus, Edit, Trash2, Search, MapPin, Phone, User, Clock, CheckCircle, AlertCircle, Star, CreditCard, Calendar, Stethoscope } from 'lucide-react';
import { useDirectData } from '@/lib/direct-data-provider';
import type { Clinic } from '@/lib/types';

const CLINIC_CLASSIFICATIONS = [
  { value: 'A', label: 'فئة A', color: 'bg-green-100 text-green-800', icon: '⭐⭐⭐' },
  { value: 'B', label: 'فئة B', color: 'bg-blue-100 text-blue-800', icon: '⭐⭐' },
  { value: 'C', label: 'فئة C', color: 'bg-yellow-100 text-yellow-800', icon: '⭐' },
  { value: 'D', label: 'فئة D', color: 'bg-gray-100 text-gray-800', icon: '○' }
];

const CREDIT_STATUSES = [
  { value: 'green', label: 'ائتمان ممتاز', color: 'bg-green-100 text-green-800', icon: '✅' },
  { value: 'yellow', label: 'ائتمان متوسط', color: 'bg-yellow-100 text-yellow-800', icon: '⚠️' },
  { value: 'red', label: 'ائتمان ضعيف', color: 'bg-red-100 text-red-800', icon: '❌' }
];

interface DirectClinicsManagementProps {
  showAddDialog?: boolean;
  onClinicAdded?: (clinic: Clinic) => void;
}

export function DirectClinicsManagement({ showAddDialog = false, onClinicAdded }: DirectClinicsManagementProps) {
  const {
    isLoading,
    createClinic,
    updateClinic,
    deleteClinic,
    getAllClinics,
    getAreas,
    getLines
  } = useDirectData();

  // الحالة المحلية - بدون كاش، فقط للعرض
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);

  // Defensive normalization for areas and lines derived from state
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedClassification, setSelectedClassification] = useState('all');
  const [selectedCreditStatus, setSelectedCreditStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('clinics');
  const [refreshing, setRefreshing] = useState(false);

  // نموذج العيادة
  const [clinicDialogOpen, setClinicDialogOpen] = useState(showAddDialog);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
  const [clinicForm, setClinicForm] = useState({
    name: '',
    doctorName: '',
    address: '',
    lat: 0,
    lng: 0,
    clinicPhone: '',
    doctorPhone: '',
    area: '',
    line: '',
    classification: 'B' as Clinic['classification'],
    creditStatus: 'green' as Clinic['creditStatus'],
    notes: '',
    isActive: true,
    registeredAt: new Date().toISOString().split('T')[0]
  });

  // تحميل البيانات مباشرة من قاعدة البيانات
  const loadData = async () => {
    try {
      setRefreshing(true);
      const [clinicsData, areasData, linesData] = await Promise.all([
        getAllClinics(),
        getAreas(),
        getLines()
      ]);
      
      setClinics(clinicsData);
      setAreas(areasData);
      setLines(linesData);
    } catch (error) {
      console.error('Failed to load clinics data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // تحميل البيانات عند التحميل الأول
  useEffect(() => {
    loadData();
  }, []);

  // تصفية العيادات
  const filteredClinics = clinics.filter(clinic => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clinic.clinicPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === 'all' || clinic.area === selectedArea;
    const matchesClassification = selectedClassification === 'all' || clinic.classification === selectedClassification;
    const matchesCreditStatus = selectedCreditStatus === 'all' || clinic.creditStatus === selectedCreditStatus;
    return matchesSearch && matchesArea && matchesClassification && matchesCreditStatus;
  });

  const activeClinics = clinics.filter(c => c.isActive);
  const inactiveClinics = clinics.filter(c => !c.isActive);
  const excellentCreditClinics = clinics.filter(c => c.creditStatus === 'green' && c.isActive);
  const poorCreditClinics = clinics.filter(c => c.creditStatus === 'red' && c.isActive);

  // إعادة تعيين النموذج
  const resetClinicForm = () => {
    setClinicForm({
      name: '',
      doctorName: '',
      address: '',
      lat: 0,
      lng: 0,
      clinicPhone: '',
      doctorPhone: '',
      area: '',
      line: '',
      classification: 'B',
      creditStatus: 'green',
      notes: '',
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0]
    });
    setEditingClinic(null);
  };

  // إضافة عيادة جديدة - اتصال مباشر
  const handleAddClinic = async () => {
    if (!clinicForm.name.trim() || !clinicForm.doctorName.trim() || !clinicForm.address.trim()) return;

    try {
      const newClinic = await createClinic({
        ...clinicForm,
        registeredAt: new Date(clinicForm.registeredAt).toISOString(),
        id: undefined // سيتم إنشاء ID جديد من قاعدة البيانات
      });

      // تحديث القائمة مباشرة
      await loadData();
      
      resetClinicForm();
      setClinicDialogOpen(false);
      
      if (onClinicAdded) {
        onClinicAdded(newClinic);
      }
    } catch (error) {
      console.error('Add clinic failed:', error);
    }
  };

  // تعديل عيادة - اتصال مباشر
  const handleEditClinic = async () => {
    if (!clinicForm.name.trim() || !clinicForm.doctorName.trim() || !clinicForm.address.trim() || !editingClinic) return;

    try {
      await updateClinic(editingClinic.id, {
        ...clinicForm,
        registeredAt: new Date(clinicForm.registeredAt).toISOString()
      });

      // تحديث القائمة مباشرة
      await loadData();
      
      resetClinicForm();
      setClinicDialogOpen(false);
    } catch (error) {
      console.error('Update clinic failed:', error);
    }
  };

  // حذف عيادة - اتصال مباشر (نقل إلى سلة المهملات)
  const handleDeleteClinic = async (clinic: Clinic) => {
    try {
      await deleteClinic(clinic.id);
      
      // تحديث القائمة مباشرة
      await loadData();
    } catch (error) {
      console.error('Delete clinic failed:', error);
    }
  };

  // فتح حوار التعديل
  const openEditClinicDialog = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name,
      doctorName: clinic.doctorName,
      address: clinic.address,
      lat: clinic.lat || 0,
      lng: clinic.lng || 0,
      clinicPhone: clinic.clinicPhone || '',
      doctorPhone: clinic.doctorPhone || '',
      area: clinic.area || '',
      line: clinic.line || '',
      classification: clinic.classification || 'B',
      creditStatus: clinic.creditStatus || 'green',
      notes: clinic.notes || '',
      isActive: clinic.isActive !== false,
      registeredAt: clinic.registeredAt ? clinic.registeredAt.split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setClinicDialogOpen(true);
  };

  // الحصول على معلومات التصنيف
  const getClassificationInfo = (classification: Clinic['classification']) => {
    return CLINIC_CLASSIFICATIONS.find(c => c.value === classification) || CLINIC_CLASSIFICATIONS[1];
  };

  // الحصول على معلومات الائتمان
  const getCreditStatusInfo = (creditStatus: Clinic['creditStatus']) => {
    return CREDIT_STATUSES.find(c => c.value === creditStatus) || CREDIT_STATUSES[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-green-500" />
            إدارة العيادات المباشرة
          </h2>
          <p className="text-muted-foreground">إدارة العيادات بالاتصال المباشر مع قاعدة البيانات</p>
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            تحديث مباشر
          </Button>
          
          <Badge variant="outline" className="px-3 py-1">
            {clinics.length} عيادة
          </Badge>
          
          {activeClinics.length > 0 && (
            <Badge variant="default" className="px-3 py-1 bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              {activeClinics.length} نشطة
            </Badge>
          )}
          
          {excellentCreditClinics.length > 0 && (
            <Badge variant="default" className="px-3 py-1 bg-blue-100 text-blue-800">
              <Star className="h-3 w-3 mr-1" />
              {excellentCreditClinics.length} ائتمان ممتاز
            </Badge>
          )}
          
          {poorCreditClinics.length > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              <AlertCircle className="h-3 w-3 mr-1" />
              {poorCreditClinics.length} ائتمان ضعيف
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-fit">
          <TabsTrigger value="clinics" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            العيادات
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            النشطة ({activeClinics.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            غير النشطة ({inactiveClinics.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            تحليلات
          </TabsTrigger>
        </TabsList>

        {/* Clinics Tab */}
        <TabsContent value="clinics" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="flex-1 relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="البحث في العيادات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-48">
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب المنطقة" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المناطق</SelectItem>
                      {safeAreas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={selectedClassification} onValueChange={setSelectedClassification}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {CLINIC_CLASSIFICATIONS.map((classification) => (
                      <SelectItem key={classification.value} value={classification.value}>
                        {classification.icon} {classification.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={selectedCreditStatus} onValueChange={setSelectedCreditStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="تصفية حسب الائتمان" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع حالات الائتمان</SelectItem>
                    {CREDIT_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.icon} {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Dialog open={clinicDialogOpen} onOpenChange={setClinicDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetClinicForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عيادة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingClinic ? 'تعديل العيادة' : 'إضافة عيادة جديدة'}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clinic-name">اسم العيادة</Label>
                    <Input
                      id="clinic-name"
                      value={clinicForm.name}
                      onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                      placeholder="اسم العيادة"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-doctorName">اسم الطبيب</Label>
                    <Input
                      id="clinic-doctorName"
                      value={clinicForm.doctorName}
                      onChange={(e) => setClinicForm({ ...clinicForm, doctorName: e.target.value })}
                      placeholder="اسم الطبيب"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="clinic-address">العنوان</Label>
                    <Textarea
                      id="clinic-address"
                      value={clinicForm.address}
                      onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                      placeholder="العنوان الكامل للعيادة"
                      required
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-clinicPhone">هاتف العيادة</Label>
                    <Input
                      id="clinic-clinicPhone"
                      value={clinicForm.clinicPhone}
                      onChange={(e) => setClinicForm({ ...clinicForm, clinicPhone: e.target.value })}
                      placeholder="هاتف العيادة"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-doctorPhone">هاتف الطبيب</Label>
                    <Input
                      id="clinic-doctorPhone"
                      value={clinicForm.doctorPhone}
                      onChange={(e) => setClinicForm({ ...clinicForm, doctorPhone: e.target.value })}
                      placeholder="هاتف الطبيب"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-area">المنطقة</Label>
                    <Select value={clinicForm.area} onValueChange={(value) => setClinicForm({ ...clinicForm, area: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنطقة" />
                      </SelectTrigger>
                    <SelectContent>
                      {safeAreas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-line">الخط</Label>
                    <Select value={clinicForm.line} onValueChange={(value) => setClinicForm({ ...clinicForm, line: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الخط" />
                      </SelectTrigger>
                    <SelectContent>
                      {safeLines.map((line) => (
                        <SelectItem key={line} value={line}>
                          {line}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-classification">التصنيف</Label>
                    <Select value={clinicForm.classification} onValueChange={(value: Clinic['classification']) => setClinicForm({ ...clinicForm, classification: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLINIC_CLASSIFICATIONS.map((classification) => (
                          <SelectItem key={classification.value} value={classification.value}>
                            {classification.icon} {classification.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-creditStatus">حالة الائتمان</Label>
                    <Select value={clinicForm.creditStatus} onValueChange={(value: Clinic['creditStatus']) => setClinicForm({ ...clinicForm, creditStatus: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDIT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.icon} {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-registeredAt">تاريخ التسجيل</Label>
                    <Input
                      id="clinic-registeredAt"
                      type="date"
                      value={clinicForm.registeredAt}
                      onChange={(e) => setClinicForm({ ...clinicForm, registeredAt: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clinic-isActive">الحالة</Label>
                    <Select value={clinicForm.isActive.toString()} onValueChange={(value) => setClinicForm({ ...clinicForm, isActive: value === 'true' })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">نشطة</SelectItem>
                        <SelectItem value="false">غير نشطة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="clinic-notes">ملاحظات</Label>
                    <Textarea
                      id="clinic-notes"
                      value={clinicForm.notes}
                      onChange={(e) => setClinicForm({ ...clinicForm, notes: e.target.value })}
                      placeholder="ملاحظات إضافية..."
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={editingClinic ? handleEditClinic : handleAddClinic}
                    disabled={isLoading || !clinicForm.name.trim() || !clinicForm.doctorName.trim() || !clinicForm.address.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : editingClinic ? (
                      <Edit className="h-4 w-4 mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {editingClinic ? 'حفظ التغييرات' : 'إضافة العيادة'}
                  </Button>
                  <Button variant="outline" onClick={() => setClinicDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Clinics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(isLoading || refreshing) && clinics.length === 0 ? (
              <div className="col-span-full flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <span className="mr-2">جاري التحميل المباشر...</span>
              </div>
            ) : (
              filteredClinics.map((clinic) => {
                const classificationInfo = getClassificationInfo(clinic.classification);
                const creditInfo = getCreditStatusInfo(clinic.creditStatus);
                
                return (
                  <Card key={clinic.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{clinic.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">د. {clinic.doctorName}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openEditClinicDialog(clinic)}
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
                                <AlertDialogTitle>حذف العيادة</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف عيادة "{clinic.name}"؟ سيتم نقلها إلى سلة المهملات.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteClinic(clinic)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={classificationInfo.color}>
                          {classificationInfo.icon} {classificationInfo.label}
                        </Badge>
                        <Badge className={creditInfo.color}>
                          {creditInfo.icon} {creditInfo.label}
                        </Badge>
                        {clinic.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            نشطة
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            غير نشطة
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span className="truncate">{clinic.address}</span>
                        </div>
                        {clinic.clinicPhone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>{clinic.clinicPhone}</span>
                          </div>
                        )}
                        {clinic.area && (
                          <div className="flex items-center text-sm">
                            <MapPin className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>المنطقة: {clinic.area}</span>
                          </div>
                        )}
                        {clinic.line && (
                          <div className="flex items-center text-sm">
                            <Building2 className="h-3 w-3 mr-2 text-muted-foreground" />
                            <span>الخط: {clinic.line}</span>
                          </div>
                        )}
                        <div className="flex items-center text-sm">
                          <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                          <span>تاريخ التسجيل: {new Date(clinic.registeredAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {filteredClinics.length === 0 && !isLoading && !refreshing && (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedArea !== 'all' || selectedClassification !== 'all' || selectedCreditStatus !== 'all' 
                  ? 'لا توجد عيادات تطابق الفلترة المحددة' 
                  : 'لم يتم إضافة أي عيادات بعد'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Active Clinics Tab */}
        <TabsContent value="active" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeClinics.map((clinic) => {
              const classificationInfo = getClassificationInfo(clinic.classification);
              const creditInfo = getCreditStatusInfo(clinic.creditStatus);
              return (
                <Card key={clinic.id} className="hover:shadow-md transition-shadow border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{clinic.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">د. {clinic.doctorName}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge className={classificationInfo.color} size="sm">
                            {classificationInfo.icon}
                          </Badge>
                          <Badge className={creditInfo.color} size="sm">
                            {creditInfo.icon}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Inactive Clinics Tab */}
        <TabsContent value="inactive" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveClinics.map((clinic) => {
              const classificationInfo = getClassificationInfo(clinic.classification);
              return (
                <Card key={clinic.id} className="hover:shadow-md transition-shadow opacity-75 border-gray-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white font-semibold">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{clinic.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">د. {clinic.doctorName}</p>
                        <Badge variant="secondary" className="mt-1">
                          {classificationInfo.icon} {classificationInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{activeClinics.length}</div>
                    <div className="text-sm text-muted-foreground">عيادات نشطة</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Star className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{clinics.filter(c => c.classification === 'A').length}</div>
                    <div className="text-sm text-muted-foreground">عيادات فئة A</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{excellentCreditClinics.length}</div>
                    <div className="text-sm text-muted-foreground">ائتمان ممتاز</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{poorCreditClinics.length}</div>
                    <div className="text-sm text-muted-foreground">ائتمان ضعيف</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution by Area */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع العيادات حسب المناطق</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {safeAreas.map((area) => {
                  const areaCount = clinics.filter(c => c.area === area).length;
                  const percentage = clinics.length > 0 ? Math.round((areaCount / clinics.length) * 100) : 0;
                  return (
                    <div key={area} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{area}</span>
                        <Badge variant="outline">{areaCount} عيادة</Badge>
                      </div>
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}