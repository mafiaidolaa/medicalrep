"use client";

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MapPin, Phone, User, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Clinic } from '@/lib/types';
import { getVisibleClinicsForUser } from '@/lib/visibility';

interface ClinicSelectorProps {
  value?: string;
  onChange?: (clinicId: string, clinic?: Clinic) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDetails?: boolean;
  currentUser?: any;
  allClinics: Clinic[];
  orders?: any[];
  collections?: any[];
}

export function ClinicSelector({
  value,
  onChange,
  placeholder = "اختر العيادة",
  disabled = false,
  className,
  showDetails = true,
  currentUser,
  allClinics,
  orders = [],
  collections = []
}: ClinicSelectorProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Get clinics visible to current user
  const visibleClinics = useMemo(() => {
    return getVisibleClinicsForUser(currentUser, allClinics, []);
  }, [currentUser, allClinics]);

  // Get selected clinic data
  const selectedClinic = value ? visibleClinics.find(c => c.id === value) : undefined;

  // Filter clinics for search dialog
  const filteredClinics = useMemo(() => {
    if (!searchTerm) return visibleClinics;
    const term = searchTerm.toLowerCase();
    return visibleClinics.filter(clinic => 
      clinic.name.toLowerCase().includes(term) ||
      clinic.doctorName.toLowerCase().includes(term) ||
      clinic.address.toLowerCase().includes(term) ||
      clinic.area?.toLowerCase().includes(term) ||
      clinic.line?.toLowerCase().includes(term)
    );
  }, [visibleClinics, searchTerm]);

  // Calculate clinic metrics
  const getClinicMetrics = (clinic: Clinic) => {
    const clinicOrders = orders.filter(o => o.clinicId === clinic.id);
    const clinicCollections = collections.filter(c => c.clinicId === clinic.id);
    
    const totalSales = clinicOrders.reduce((s, o) => s + (o.totalAmount ?? o.total ?? 0), 0);
    const totalCollected = clinicCollections.reduce((s, c) => s + c.amount, 0);
    const currentDebt = Math.max(0, totalSales - totalCollected);
    
    // Last interaction
    const lastOrderDate = clinicOrders.map(o => o.orderDate).sort().at(-1);
    const lastCollectionDate = clinicCollections.map(c => c.collectionDate).sort().at(-1);
    
    return {
      totalSales,
      currentDebt,
      lastOrderDate,
      lastCollectionDate,
      orderCount: clinicOrders.length
    };
  };

  // Get credit status
  const getCreditStatus = (clinic: Clinic) => {
    if (!clinic.creditLimit) return 'none';
    
    const metrics = getClinicMetrics(clinic);
    const utilization = (metrics.currentDebt / clinic.creditLimit) * 100;
    
    if (utilization >= 90) return 'danger';
    if (utilization >= 70) return 'warning';
    if (utilization >= 50) return 'caution';
    return 'good';
  };

  const getCreditStatusColor = (status: string) => {
    switch (status) {
      case 'danger': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'caution': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCreditStatusIcon = (status: string) => {
    switch (status) {
      case 'danger': return <AlertTriangle className="h-3 w-3" />;
      case 'warning': return <Clock className="h-3 w-3" />;
      case 'good': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const handleSelect = (clinicId: string) => {
    const clinic = visibleClinics.find(c => c.id === clinicId);
    onChange?.(clinicId, clinic);
    setSearchOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Selector */}
      <div className="flex gap-2">
        <Select 
          value={value} 
          onValueChange={handleSelect}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {visibleClinics.map(clinic => {
              const creditStatus = getCreditStatus(clinic);
              return (
                <SelectItem key={clinic.id} value={clinic.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{clinic.name}</span>
                    {creditStatus !== 'none' && (
                      <Badge 
                        className={cn("ml-2 text-xs", getCreditStatusColor(creditStatus))}
                        variant="outline"
                      >
                        {getCreditStatusIcon(creditStatus)}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        
        {/* Advanced Search Button */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={disabled}>
              <Search className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>البحث في العيادات</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="ابحث بالاسم، الطبيب، العنوان، المنطقة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <ScrollArea className="h-96">
                <div className="grid gap-3">
                  {filteredClinics.map(clinic => {
                    const metrics = getClinicMetrics(clinic);
                    const creditStatus = getCreditStatus(clinic);
                    
                    return (
                      <Card 
                        key={clinic.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-accent",
                          value === clinic.id && "ring-2 ring-primary"
                        )}
                        onClick={() => handleSelect(clinic.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {clinic.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{clinic.name}</h3>
                                  {creditStatus !== 'none' && (
                                    <Badge 
                                      className={cn("text-xs", getCreditStatusColor(creditStatus))}
                                      variant="outline"
                                    >
                                      {getCreditStatusIcon(creditStatus)}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>د. {clinic.doctorName}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{clinic.address}</span>
                                  </div>
                                  
                                  {clinic.clinicPhone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      <span>{clinic.clinicPhone}</span>
                                    </div>
                                  )}
                                  
                                  {clinic.area && (
                                    <Badge variant="secondary" className="text-xs">
                                      {clinic.area} {clinic.line && `- ${clinic.line}`}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-left text-xs space-y-1">
                              <div className="text-muted-foreground">إجمالي الطلبات: {metrics.orderCount}</div>
                              <div className="text-muted-foreground">
                                المديونية: {metrics.currentDebt.toLocaleString('ar-EG')} ج.م
                              </div>
                              {clinic.creditLimit && (
                                <div className="text-muted-foreground">
                                  الحد الائتماني: {clinic.creditLimit.toLocaleString('ar-EG')} ج.م
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {filteredClinics.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      لا توجد عيادات مطابقة للبحث
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selected Clinic Details */}
      {showDetails && selectedClinic && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {selectedClinic.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {selectedClinic.name}
              {(() => {
                const creditStatus = getCreditStatus(selectedClinic);
                return creditStatus !== 'none' && (
                  <Badge 
                    className={cn("text-xs", getCreditStatusColor(creditStatus))}
                    variant="outline"
                  >
                    {getCreditStatusIcon(creditStatus)}
                  </Badge>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">الطبيب</div>
                <div className="font-medium">د. {selectedClinic.doctorName}</div>
              </div>
              
              <div>
                <div className="text-muted-foreground mb-1">المنطقة/الخط</div>
                <div className="font-medium">
                  {selectedClinic.area || 'غير محدد'} 
                  {selectedClinic.line && ` - ${selectedClinic.line}`}
                </div>
              </div>
              
              {(() => {
                const metrics = getClinicMetrics(selectedClinic);
                return (
                  <>
                    <div>
                      <div className="text-muted-foreground mb-1">المديونية الحالية</div>
                      <div className="font-medium text-orange-600">
                        {metrics.currentDebt.toLocaleString('ar-EG')} ج.م
                      </div>
                    </div>
                    
                    {selectedClinic.creditLimit && (
                      <div>
                        <div className="text-muted-foreground mb-1">الحد الائتماني</div>
                        <div className="font-medium text-blue-600">
                          {selectedClinic.creditLimit.toLocaleString('ar-EG')} ج.م
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}