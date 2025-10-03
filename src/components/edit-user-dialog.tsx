"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDataProvider } from '@/lib/data-provider';
import { getVisibleAreasForUser, getVisibleLinesForUser } from '@/lib/visibility';
import type { User } from '@/lib/types';

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
    const { toast } = useToast();
    const { users, updateUser, areas, lines, clinics, currentUser } = useDataProvider();
    
    const [isLoading, setIsLoading] = useState(false);

    // Normalize visible lines
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
    // Password controls (admin only)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (user && open) {
            setFormData({
                fullName: user.fullName || '',
                username: user.username || '',
                email: user.email || '',
                role: user.role || 'medical_rep',
                area: user.area || '',
                line: user.line || '',
                managerId: user.managerId || '',
                primaryPhone: user.primaryPhone || '',
                whatsappPhone: user.whatsappPhone || '',
                altPhone: user.altPhone || '',
                salesTarget: user.salesTarget?.toString() || '',
                visitsTarget: user.visitsTarget?.toString() || '',
            });
            setShowCurrentPassword(false);
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [user, open]);

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const resetForm = () => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                username: user.username || '',
                email: user.email || '',
                role: user.role || 'medical_rep',
                area: user.area || '',
                line: user.line || '',
                managerId: user.managerId || '',
                primaryPhone: user.primaryPhone || '',
                whatsappPhone: user.whatsappPhone || '',
                altPhone: user.altPhone || '',
                salesTarget: user.salesTarget?.toString() || '',
                visitsTarget: user.visitsTarget?.toString() || '',
            });
            setShowCurrentPassword(false);
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) return;
        
        if (!formData.fullName || !formData.username || !formData.email) {
            toast({
                variant: 'destructive',
                title: 'خطأ في التحقق',
                description: 'يرجى ملء جميع الحقول المطلوبة.',
            });
            return;
        }

        // If admin is changing password, validate new password
        if (newPassword || confirmPassword) {
            if (currentUser?.role !== 'admin') {
                toast({ variant: 'destructive', title: 'صلاحيات غير كافية', description: 'فقط المدير يمكنه تغيير كلمة المرور.' });
                return;
            }
            if (newPassword.length < 6) {
                toast({ variant: 'destructive', title: 'كلمة المرور قصيرة', description: 'الحد الأدنى 6 أحرف.' });
                return;
            }
            if (newPassword !== confirmPassword) {
                toast({ variant: 'destructive', title: 'عدم تطابق كلمات المرور', description: 'يرجى التأكد من التطابق.' });
                return;
            }
        }

        setIsLoading(true);
        
        try {
            const updatedData: Partial<User> = {
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                role: formData.role as any, // Support all role types
                area: formData.area || undefined,
                line: formData.line || undefined,
                managerId: formData.managerId || undefined,
                primaryPhone: formData.primaryPhone || undefined,
                whatsappPhone: formData.whatsappPhone || undefined,
                altPhone: formData.altPhone || undefined,
                salesTarget: formData.salesTarget ? parseInt(formData.salesTarget) : undefined,
                visitsTarget: formData.visitsTarget ? parseInt(formData.visitsTarget) : undefined,
            };
            if (currentUser?.role === 'admin' && newPassword) {
                updatedData.password = newPassword;
            }

            await updateUser(user.id, updatedData);
            
            toast({
                title: 'تم تحديث المستخدم',
                description: `تم تحديث بيانات ${formData.fullName} بنجاح.`,
            });
            
            onOpenChange(false);
        } catch (error) {
            console.error('Error updating user:', error);
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في تحديث المستخدم. يرجى المحاولة مرة أخرى.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">تحرير بيانات المستخدم</DialogTitle>
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
                            <Select value={formData.area} onValueChange={(value) => handleInputChange('area', value === 'none' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المنطقة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">بدون منطقة</SelectItem>
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
                            <Select value={formData.line} onValueChange={(value) => handleInputChange('line', value === 'none' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر الخط" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">بدون خط</SelectItem>
                                    {visibleLines.map(line => (
                                        <SelectItem key={line} value={line}>{line}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Manager Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="managerId">المدير المباشر</Label>
                            <Select value={formData.managerId} onValueChange={(value) => handleInputChange('managerId', value === 'none' ? '' : value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر المدير" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- لا يوجد مدير --</SelectItem>
                                    {users
                                        .filter(u => ['admin', 'manager'].includes(u.role) && u.isActive !== false && u.id !== user?.id)
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

                    {/* Admin-only password section */}
{currentUser?.role === 'admin' && (
                        <div className="space-y-3 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">إدارة كلمة المرور</div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
                                        let pwd = '';
                                        for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                                        setNewPassword(pwd);
                                        setConfirmPassword(pwd);
                                    }}
                                >
                                    إعادة تعيين كلمة مرور عشوائية
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>كلمة المرور الحالية</Label>
                                    <Input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        value={user?.password || ''}
                                        readOnly
                                    />
                                    <Button type="button" variant="outline" size="sm" onClick={() => setShowCurrentPassword(v => !v)}>
                                        {showCurrentPassword ? 'إخفاء' : 'إظهار'}
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>كلمة مرور جديدة</Label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="اتركها فارغة دون تغيير"
                                    />
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="تأكيد كلمة المرور الجديدة"
                                    />
                                    {newPassword && (
                                        <div className="flex items-center gap-2">
                                            <Input readOnly value={newPassword} />
                                            <Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(newPassword)}>
                                                نسخ
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">تنبيه أمني: يُفضّل عدم عرض كلمات المرور. النظام الحالي يخزن كلمة المرور بنص صريح. ننصح بترقيته إلى تخزين مُشفّر/مُجزّأ لاحقًا.</div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                resetForm();
                                onOpenChange(false);
                            }}
                            disabled={isLoading}
                        >
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'جاري التحديث...' : 'تحديث البيانات'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
