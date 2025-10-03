"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectLocations } from "@/components/ui/multi-select-locations";
import { useMultiLocationData } from "@/lib/multi-location-data-provider";
import { Building2, MapPin, Star, Phone, User, Search, Filter, Plus } from 'lucide-react';
import type { Clinic } from '@/lib/types';

interface MultiLocationClinicListProps {
  onAddClinic?: () => void;
  onEditClinic?: (clinic: Clinic) => void;
  onViewClinic?: (clinic: Clinic) => void;
  showAddButton?: boolean;
}

export const MultiLocationClinicList: React.FC<MultiLocationClinicListProps> = ({
  onAddClinic,
  onEditClinic,
  onViewClinic,
  showAddButton = true
}) => {
  const {
    getClinicsForUser,
    getAllAreas,
    currentUser,
    isLoading,
    filterClinicsByLocation
  } = useMultiLocationData();

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterLocations, setSelectedFilterLocations] = useState<string[]>([]);
  const [isLoadingClinics, setIsLoadingClinics] = useState(true);

  const allAreas = getAllAreas();

  useEffect(() => {
    const loadClinics = async () => {
      try {
        setIsLoadingClinics(true);
        const clinicsData = await getClinicsForUser();
        setClinics(clinicsData);
        setFilteredClinics(clinicsData);
      } catch (error) {
        console.error('Failed to load clinics:', error);
      } finally {
        setIsLoadingClinics(false);
      }
    };

    loadClinics();
  }, [getClinicsForUser]);

  // Apply filters
  useEffect(() => {
    let filtered = clinics;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(clinic =>
        clinic.name?.toLowerCase().includes(term) ||
        clinic.doctor_name?.toLowerCase().includes(term) ||
        clinic.address?.toLowerCase().includes(term) ||
        clinic.clinic_phone?.includes(term) ||
        clinic.doctor_phone?.includes(term)
      );
    }

    // Location filter
    if (selectedFilterLocations.length > 0) {
      filtered = filterClinicsByLocation(filtered, selectedFilterLocations);
    }

    setFilteredClinics(filtered);
  }, [clinics, searchTerm, selectedFilterLocations, filterClinicsByLocation]);

  const getClinicLocations = (clinic: Clinic): { locations: string[], primary: string } => {
    if (clinic.clinic_locations?.length > 0) {
      return {
        locations: clinic.clinic_locations.map(loc => loc.location_name),
        primary: clinic.clinic_locations.find(loc => loc.is_primary)?.location_name || ''
      };
    }
    
    // Fallback to area field
    return {
      locations: clinic.area ? [clinic.area] : [],
      primary: clinic.area || ''
    };
  };

  const ClinicCard = ({ clinic }: { clinic: Clinic }) => {
    const { locations, primary } = getClinicLocations(clinic);
    const isMultiLocation = locations.length > 1;

    return (
      <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
                {clinic.name}
                {isMultiLocation && (
                  <Badge variant="secondary" className="text-xs">
                    🌍 متعدد المواقع
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                <User className="w-4 h-4" />
                {clinic.doctor_name}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2">
              {onViewClinic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewClinic(clinic)}
                >
                  عرض
                </Button>
              )}
              {onEditClinic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditClinic(clinic)}
                >
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Locations */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">المواقع:</div>
            <div className="flex flex-wrap gap-2">
              {locations.map(location => (
                <Badge
                  key={location}
                  variant={location === primary ? "default" : "outline"}
                  className={`flex items-center gap-1 ${
                    location === primary 
                      ? 'bg-blue-500 text-white' 
                      : 'border-gray-300'
                  }`}
                >
                  <MapPin className="w-3 h-3" />
                  {location}
                  {location === primary && (
                    <Star className="w-3 h-3 fill-current" />
                  )}
                </Badge>
              ))}
            </div>
            {isMultiLocation && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <Star className="w-3 h-3" />
                الموقع الرئيسي: <strong>{primary}</strong>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            {clinic.clinic_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>هاتف العيادة: {clinic.clinic_phone}</span>
              </div>
            )}
            {clinic.doctor_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>هاتف الطبيب: {clinic.doctor_phone}</span>
              </div>
            )}
          </div>

          {/* Address */}
          {clinic.address && (
            <div className="text-sm text-gray-600 pt-2 border-t border-gray-100">
              <strong>العنوان:</strong> {clinic.address}
            </div>
          )}

          {/* Classification & Status */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex gap-2">
              <Badge variant="outline">
                تصنيف {clinic.classification || 'B'}
              </Badge>
              <Badge 
                variant="outline"
                className={`${
                  clinic.credit_status === 'green' ? 'border-green-500 text-green-700' :
                  clinic.credit_status === 'yellow' ? 'border-yellow-500 text-yellow-700' :
                  clinic.credit_status === 'red' ? 'border-red-500 text-red-700' :
                  ''
                }`}
              >
                {clinic.credit_status === 'green' ? '🟢' : 
                 clinic.credit_status === 'yellow' ? '🟡' : 
                 clinic.credit_status === 'red' ? '🔴' : ''} 
                ائتماني
              </Badge>
            </div>
            
            <div className="text-xs text-gray-500">
              الخط: {clinic.line || 'غير محدد'}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading || isLoadingClinics) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="mr-2">جاري تحميل العيادات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            العيادات
            {currentUser?.role !== 'admin' && (
              <Badge variant="outline" className="text-xs">
                حسب مواقعك
              </Badge>
            )}
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredClinics.length} عيادة 
            {clinics.length !== filteredClinics.length && ` من أصل ${clinics.length}`}
          </p>
        </div>

        {showAddButton && onAddClinic && (
          <Button onClick={onAddClinic} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 ml-2" />
            إضافة عيادة جديدة
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            فلترة وبحث
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="بحث في العيادات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Location Filter */}
            <MultiSelectLocations
              locations={allAreas}
              selectedLocations={selectedFilterLocations}
              onSelectionChange={setSelectedFilterLocations}
              label=""
              placeholder="فلترة حسب المنطقة"
              showPrimary={false}
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredClinics.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد عيادات
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedFilterLocations.length > 0 
                ? 'لا توجد عيادات تطابق الفلاتر المحددة'
                : currentUser?.role === 'admin' 
                  ? 'لم يتم تسجيل أي عيادات بعد'
                  : 'لا توجد عيادات في مواقعك المحددة'
              }
            </p>
            {showAddButton && onAddClinic && (
              <Button onClick={onAddClinic} variant="outline">
                <Plus className="w-4 h-4 ml-2" />
                إضافة عيادة جديدة
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredClinics.map(clinic => (
            <ClinicCard key={clinic.id} clinic={clinic} />
          ))}
        </div>
      )}

      {/* Stats */}
      {filteredClinics.length > 0 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-6 text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            <span>📊 إجمالي: {filteredClinics.length} عيادة</span>
            <span>
              🌍 متعددة المواقع: {filteredClinics.filter(c => 
                getClinicLocations(c).locations.length > 1
              ).length}
            </span>
            <span>
              📍 موقع واحد: {filteredClinics.filter(c => 
                getClinicLocations(c).locations.length === 1
              ).length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};