"use client";

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/data-provider';
import { getVisibleAreasForUser, getVisibleLinesForUser } from '@/lib/visibility';
import { generateUUID } from '@/lib/supabase-services';
import type { User } from '@/lib/types';
import bcrypt from 'bcryptjs';

interface AddUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddUserDialog({ open, onOpenChange }: AddUserDialogProps) {
    const { toast } = useToast();
    const { users, setUsers, areas, lines, clinics, currentUser } = useDataProvider();
    
    const [isLoading, setIsLoading] = useState(false);

    // Normalize visible lines into a guaranteed string[] to avoid runtime map errors
    const visibleLines = useMemo(() => {
        try {
            const base = Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []);
            const out = getVisibleLinesForUser(currentUser, base as any, clinics);
            const arr = Array.isArray(out) ? out : (out ? (Object.values(out as any) as any[]) : []);
            return (arr as any[]).filter(Boolean).map(String);
        } catch { return []; }
    }, [currentUser, lines, clinics]);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'medical_rep',
        area: '',
        line: '',
        managerId: '',
        primaryPhone: '',
        whatsappPhone: '',
        altPhone: '',
        salesTarget: '',
        visitsTarget: '',
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            username: '',
            email: '',
            password: '',
            role: 'medical_rep',
            area: '',
            line: '',
            managerId: '',
            primaryPhone: '',
            whatsappPhone: '',
            altPhone: '',
            salesTarget: '',
            visitsTarget: '',
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
            toast({
                variant: 'destructive',
                title: 'خطأ في التحقق',
                description: 'يرجى ملء جميع الحقول المطلوبة.',
            });
            return;
        }

        setIsLoading(true);
        
        try {
            // Hash password before saving
            const hashedPassword = await bcrypt.hash(formData.password, 12);
            
            const newUser: User = {
                id: generateUUID(),
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                password: hashedPassword,
                role: formData.role as any, // Support all role types
                hireDate: new Date().toISOString(),
                area: formData.area || undefined,
                line: formData.line || undefined,
                primaryPhone: formData.primaryPhone || undefined,
                whatsappPhone: formData.whatsappPhone || undefined,
                altPhone: formData.altPhone || undefined,
                salesTarget: formData.salesTarget ? parseInt(formData.salesTarget) : undefined,
                visitsTarget: formData.visitsTarget ? parseInt(formData.visitsTarget) : undefined,
                profilePicture: undefined,
            };

            // Use API endpoint to create user (server-side with service role)
            console.log('🚀 [CLIENT] Sending POST request to /api/users');
            console.log('📝 [CLIENT] User data:', {
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            });
            
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: newUser.id,
                    full_name: newUser.fullName,
                    username: newUser.username,
                    email: newUser.email,
                    password: hashedPassword,
                    role: newUser.role,
                    hire_date: newUser.hireDate,
                    area: newUser.area,
                    line: newUser.line,
                    manager_id: formData.managerId || null,
                    primary_phone: newUser.primaryPhone,
                    whatsapp_phone: newUser.whatsappPhone,
                    alt_phone: newUser.altPhone,
                    profile_picture: newUser.profilePicture,
                    sales_target: newUser.salesTarget,
                    visits_target: newUser.visitsTarget,
                }),
            });
            
            console.log('📦 [CLIENT] Response status:', response.status);

            if (!response.ok) {
                // Read error body robustly (JSON or text), to avoid logging empty {}
                const raw = await response.text();
                let errorMessage = 'Failed to create user';
                try {
                    const parsed = raw ? JSON.parse(raw) : {};
                    console.error('❌ [CLIENT] API error payload:', parsed);
                    errorMessage = parsed?.error || errorMessage;
                } catch (parseErr) {
                    console.error('❌ [CLIENT] API error text:', raw || String(parseErr));
                    if (raw) errorMessage = raw;
                }
                throw new Error(errorMessage);
            }
            
            console.log('✅ [CLIENT] User created successfully via API');

            // Update local cache after successful API call
            await setUsers(prev => [...prev, newUser]);
            
            toast({
                title: 'تم إنشاء المستخدم',
                description: `تم إنشاء المستخدم ${formData.fullName} بنجاح.`,
            });
            
            resetForm();
            onOpenChange(false);
        } catch (error) {
            console.error('Error creating user:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في إنشاء المستخدم. يرجى المحاولة مرة أخرى.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">إضافة مستخدم جديد</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Basic Information */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName">الاسم الكامل *</Label>
                            <Input
                                id="fullName"
                                value={formData.fullName}
                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">اسم المستخدم *</Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">البريد الإلكتروني *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">كلمة المرور *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">الدور *</Label>
                            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">مدير النظام</SelectItem>
                                    <SelectItem value="manager">مدير منطقة</SelectItem>
                                    <SelectItem value="medical_rep">مندوب طبي</SelectItem>
                                    <SelectItem value="accountant">محاسب</SelectItem>
                                    <SelectItem value="user">مستخدم عادي</SelectItem>
                                    <SelectItem value="test_user">مستخدم تجريبي</SelectItem>
                                    <SelectItem value="demo">عرض توضيحي</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-2">
                            <Label htmlFor="primaryPhone">الهاتف الأساسي</Label>
                            <Input
                                id="primaryPhone"
                                value={formData.primaryPhone}
                                onChange={(e) => handleInputChange('primaryPhone', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="whatsappPhone">واتساب</Label>
                            <Input
                                id="whatsappPhone"
                                value={formData.whatsappPhone}
                                onChange={(e) => handleInputChange('whatsappPhone', e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="altPhone">هاتف بديل</Label>
                            <Input
                                id="altPhone"
                                value={formData.altPhone}
                                onChange={(e) => handleInputChange('altPhone', e.target.value)}
                            />
                        </div>

                        {/* Work Information */}
                        <div className="space-y-2">
                            <Label htmlFor="area">المنطقة</Label>
                            <Select value={formData.area} onValueChange={(value) => handleInputChange('area', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المنطقة" />
                                </SelectTrigger>
                                <SelectContent>
                                    {useMemo(() => {
                                        try {
                                            const out = getVisibleAreasForUser(currentUser, Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []), clinics);
                                            const arr = Array.isArray(out) ? out : (out ? (Object.values(out as any) as any[]) : []);
                                            return (arr as any[]).filter(Boolean).map(String);
                                        } catch { return []; }
                                    }, [currentUser, areas, clinics]).map(area => (
                                        <SelectItem key={area} value={area}>{area}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="line">الخط</Label>
                            <Select value={formData.line} onValueChange={(value) => handleInputChange('line', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الخط" />
                                </SelectTrigger>
                                <SelectContent>
                                    {visibleLines.map(line => (
                                        <SelectItem key={line} value={line}>{line}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Manager Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="managerId">المدير المباشر</Label>
                            <Select value={formData.managerId} onValueChange={(value) => handleInputChange('managerId', value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المدير" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- لا يوجد مدير --</SelectItem>
                                    {users
                                        .filter(u => ['admin', 'manager'].includes(u.role) && u.isActive !== false)
                                        .map(manager => (
                                            <SelectItem key={manager.id} value={manager.id}>
                                                {manager.fullName} ({manager.role === 'admin' ? 'مدير نظام' : 'مدير'})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                                📄 يستخدم للموافقات وعرض البيانات والإشعارات
                            </p>
                        </div>

                        {/* Targets (only for medical reps) */}
                        {formData.role === 'medical_rep' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="salesTarget">هدف المبيعات</Label>
                                    <Input
                                        id="salesTarget"
                                        type="number"
                                        value={formData.salesTarget}
                                        onChange={(e) => handleInputChange('salesTarget', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="visitsTarget">هدف الزيارات</Label>
                                    <Input
                                        id="visitsTarget"
                                        type="number"
                                        value={formData.visitsTarget}
                                        onChange={(e) => handleInputChange('visitsTarget', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}