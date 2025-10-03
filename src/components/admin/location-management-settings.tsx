"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useMultiLocationData } from "@/lib/multi-location-data-provider";
import { 
  MapPin, Plus, Trash2, Edit, Save, X, 
  Settings, Globe, Users, Building2,
  AlertTriangle, Check, Info
} from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LocationStats {
  area: string;
  clinicsCount: number;
  usersCount: number;
  canDelete: boolean;
}

interface LocationManagementSettingsProps {
  onSettingsChange?: (settings: any) => void;
}

export const LocationManagementSettings: React.FC<LocationManagementSettingsProps> = ({
  onSettingsChange
}) => {
  const {
    getAllAreas,
    getAllLines,
    getAllClinics,
    getAllUsers,
    currentUser
  } = useMultiLocationData();

  const [areas, setAreas] = useState<string[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStats[]>([]);
  const [editingArea, setEditingArea] = useState<string>('');
  const [editingLine, setEditingLine] = useState<string>('');
  const [newArea, setNewArea] = useState('');
  const [newLine, setNewLine] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ type: 'success' | 'error' | 'info', text: string }[]>([]);

  // Multi-location settings
  const [settings, setSettings] = useState({
    enableMultiLocation: true,
    requirePrimaryLocation: true,
    maxLocationsPerClinic: 10,
    maxLocationsPerUser: 5,
    allowLocationTransfer: true,
    autoAssignPrimary: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allAreas, allLines, allClinics, allUsers] = await Promise.all([
        getAllAreas(),
        getAllLines(),
        getAllClinics(),
        getAllUsers()
      ]);

      setAreas(allAreas);
      setLines(allLines);

      // Calculate location statistics
      const stats: LocationStats[] = allAreas.map(area => {
        const areaClinicCount = allClinics.filter(clinic => {
          if (clinic.clinic_locations?.length > 0) {
            return clinic.clinic_locations.some((loc: any) => loc.location_name === area);
          }
          return clinic.area === area;
        }).length;

        const areaUserCount = allUsers.filter(user => {
          if (user.user_locations?.length > 0) {
            return user.user_locations.some((loc: any) => loc.location_name === area);
          }
          return user.area === area;
        }).length;

        return {
          area,
          clinicsCount: areaClinicCount,
          usersCount: areaUserCount,
          canDelete: areaClinicCount === 0 && areaUserCount === 0
        };
      });

      setLocationStats(stats);
    } catch (error) {
      console.error('Failed to load data:', error);
      addMessage('error', 'فشل في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (type: 'success' | 'error' | 'info', text: string) => {
    const newMessage = { type, text };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg !== newMessage));
    }, 5000);
  };

  const handleAddArea = async () => {
    if (!newArea.trim()) return;

    const trimmedArea = newArea.trim();
    if (areas.includes(trimmedArea)) {
      addMessage('error', 'هذه المنطقة موجودة بالفعل');
      return;
    }

    try {
      // Save to system settings
      const response = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'app_areas',
          setting_value: [...areas, trimmedArea]
        })
      });

      if (response.ok) {
        setAreas(prev => [...prev, trimmedArea]);
        setLocationStats(prev => [...prev, {
          area: trimmedArea,
          clinicsCount: 0,
          usersCount: 0,
          canDelete: true
        }]);
        setNewArea('');
        addMessage('success', `تم إضافة المنطقة "${trimmedArea}" بنجاح`);
      } else {
        addMessage('error', 'فشل في إضافة المنطقة');
      }
    } catch (error) {
      addMessage('error', 'حدث خطأ أثناء إضافة المنطقة');
    }
  };

  const handleAddLine = async () => {
    if (!newLine.trim()) return;

    const trimmedLine = newLine.trim();
    if (lines.includes(trimmedLine)) {
      addMessage('error', 'هذا الخط موجود بالفعل');
      return;
    }

    try {
      const response = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'app_lines',
          setting_value: [...lines, trimmedLine]
        })
      });

      if (response.ok) {
        setLines(prev => [...prev, trimmedLine]);
        setNewLine('');
        addMessage('success', `تم إضافة الخط "${trimmedLine}" بنجاح`);
      } else {
        addMessage('error', 'فشل في إضافة الخط');
      }
    } catch (error) {
      addMessage('error', 'حدث خطأ أثناء إضافة الخط');
    }
  };

  const handleDeleteArea = async (areaToDelete: string) => {
    const stats = locationStats.find(s => s.area === areaToDelete);
    if (!stats?.canDelete) {
      addMessage('error', 'لا يمكن حذف هذه المنطقة لأنها مرتبطة بعيادات أو مستخدمين');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف المنطقة "${areaToDelete}"؟`)) {
      return;
    }

    try {
      const updatedAreas = areas.filter(area => area !== areaToDelete);
      const response = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'app_areas',
          setting_value: updatedAreas
        })
      });

      if (response.ok) {
        setAreas(updatedAreas);
        setLocationStats(prev => prev.filter(s => s.area !== areaToDelete));
        addMessage('success', `تم حذف المنطقة "${areaToDelete}" بنجاح`);
      } else {
        addMessage('error', 'فشل في حذف المنطقة');
      }
    } catch (error) {
      addMessage('error', 'حدث خطأ أثناء حذف المنطقة');
    }
  };

  const handleEditArea = async (oldArea: string, newAreaName: string) => {
    if (!newAreaName.trim() || newAreaName.trim() === oldArea) {
      setEditingArea('');
      return;
    }

    const trimmedNewArea = newAreaName.trim();
    if (areas.includes(trimmedNewArea)) {
      addMessage('error', 'اسم المنطقة الجديد موجود بالفعل');
      return;
    }

    try {
      const updatedAreas = areas.map(area => area === oldArea ? trimmedNewArea : area);
      const response = await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'app_areas',
          setting_value: updatedAreas
        })
      });

      if (response.ok) {
        setAreas(updatedAreas);
        setLocationStats(prev => prev.map(s => 
          s.area === oldArea ? { ...s, area: trimmedNewArea } : s
        ));
        setEditingArea('');
        addMessage('success', `تم تعديل المنطقة من "${oldArea}" إلى "${trimmedNewArea}"`);
      } else {
        addMessage('error', 'فشل في تعديل المنطقة');
      }
    } catch (error) {
      addMessage('error', 'حدث خطأ أثناء تعديل المنطقة');
    }
  };

  const handleSettingsChange = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);

    try {
      await fetch('/api/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setting_key: 'multi_location_settings',
          setting_value: newSettings
        })
      });
      addMessage('success', 'تم حفظ الإعدادات بنجاح');
    } catch (error) {
      addMessage('error', 'فشل في حفظ الإعدادات');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            غير مسموح
          </h3>
          <p className="text-gray-600">
            هذه الصفحة متاحة للمشرفين فقط
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {messages.map((message, index) => (
        <Alert key={index} className={`${
          message.type === 'success' ? 'border-green-500 bg-green-50' :
          message.type === 'error' ? 'border-red-500 bg-red-50' :
          'border-blue-500 bg-blue-50'
        }`}>
          {message.type === 'success' && <Check className="h-4 w-4 text-green-600" />}
          {message.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
          {message.type === 'info' && <Info className="h-4 w-4 text-blue-600" />}
          <AlertDescription className={`${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </AlertDescription>
        </Alert>
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            إدارة المواقع والمناطق
          </h2>
          <p className="text-gray-600 mt-1">
            إدارة المناطق والخطوط والإعدادات المتعلقة بالمواقع المتعددة
          </p>
        </div>
      </div>

      {/* Multi-Location Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            إعدادات المواقع المتعددة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>تفعيل المواقع المتعددة</Label>
                <Switch
                  checked={settings.enableMultiLocation}
                  onCheckedChange={(checked) => handleSettingsChange('enableMultiLocation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>إجبار تحديد موقع رئيسي</Label>
                <Switch
                  checked={settings.requirePrimaryLocation}
                  onCheckedChange={(checked) => handleSettingsChange('requirePrimaryLocation', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>السماح بنقل المواقع</Label>
                <Switch
                  checked={settings.allowLocationTransfer}
                  onCheckedChange={(checked) => handleSettingsChange('allowLocationTransfer', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxLocationsPerClinic">أقصى مواقع للعيادة</Label>
                <Input
                  id="maxLocationsPerClinic"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.maxLocationsPerClinic}
                  onChange={(e) => handleSettingsChange('maxLocationsPerClinic', parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxLocationsPerUser">أقصى مواقع للمستخدم</Label>
                <Input
                  id="maxLocationsPerUser"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxLocationsPerUser}
                  onChange={(e) => handleSettingsChange('maxLocationsPerUser', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            إدارة المناطق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Area */}
          <div className="flex gap-2">
            <Input
              placeholder="اسم المنطقة الجديدة"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddArea()}
            />
            <Button onClick={handleAddArea} disabled={!newArea.trim()}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة
            </Button>
          </div>

          {/* Areas List */}
          <div className="grid gap-4">
            {locationStats.map((stats) => (
              <div key={stats.area} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {editingArea === stats.area ? (
                    <div className="flex items-center gap-2">
                      <Input
                        defaultValue={stats.area}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditArea(stats.area, (e.target as HTMLInputElement).value);
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const input = document.querySelector(`input[value="${stats.area}"]`) as HTMLInputElement;
                          if (input) {
                            handleEditArea(stats.area, input.value);
                          }
                        }}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingArea('')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{stats.area}</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="w-3 h-3 ml-1" />
                      {stats.clinicsCount} عيادة
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 ml-1" />
                      {stats.usersCount} مستخدم
                    </Badge>
                  </div>

                  <div className="flex gap-1">
                    {editingArea !== stats.area && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingArea(stats.area)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteArea(stats.area)}
                      disabled={!stats.canDelete}
                      className={!stats.canDelete ? 'opacity-50' : 'hover:bg-red-50 hover:text-red-600'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lines Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋 إدارة الخطوط
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Line */}
          <div className="flex gap-2">
            <Input
              placeholder="اسم الخط الجديد"
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddLine()}
            />
            <Button onClick={handleAddLine} disabled={!newLine.trim()}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة
            </Button>
          </div>

          {/* Lines List */}
          <div className="flex flex-wrap gap-2">
            {lines.map((line) => (
              <Badge key={line} variant="outline" className="text-sm px-3 py-1">
                {line}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};