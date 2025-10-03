
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, CheckCircle, Briefcase, Building, MapPin, User as UserIcon, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Clinic, PlanTask, User } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { taskTypes as getTaskTypes } from '../plan-utils';
import { useTranslation } from 'react-i18next';

interface NewPlanTaskClientPageProps {
    clinics: Clinic[];
    users: User[];
    areas: string[];
    lines: string[];
    currentUser: User | null;
    addPlanTaskAction: (task: Omit<PlanTask, 'id'>) => Promise<any>;
}

export function NewPlanTaskClientPage({
    clinics,
    users,
    areas,
    lines,
    currentUser,
    addPlanTaskAction,
}: NewPlanTaskClientPageProps) {
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    
    const taskTypes = getTaskTypes(t);

    // Form state
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedLine, setSelectedLine] = useState('');
    const [selectedClinic, setSelectedClinic] = useState('');
    const [selectedRep, setSelectedRep] = useState('');
    const [taskType, setTaskType] = useState('');
    const [taskDate, setTaskDate] = useState<Date | undefined>(new Date());
    const [taskTime, setTaskTime] = useState('');
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isManager = useMemo(() => {
        if (!currentUser) return false;
        const managerRoles = ['admin', 'gm', 'manager', 'area_manager', 'line_manager'];
        return managerRoles.includes(currentUser.role);
    }, [currentUser]);
    
    // Defensive normalization for areas and lines
    const safeAreas = useMemo(() => {
        if (Array.isArray(areas)) return areas.filter(Boolean).map(String);
        if (areas && typeof areas === 'object') return Object.values(areas as any).filter(Boolean).map(String);
        return [] as string[];
    }, [areas]);
    const safeLines = useMemo(() => {
        if (Array.isArray(lines)) return lines.filter(Boolean).map(String);
        if (lines && typeof lines === 'object') return Object.values(lines as any).filter(Boolean).map(String);
        return [] as string[];
    }, [lines]);
    
    const medicalReps = useMemo(() => users.filter(u => u.role === 'medical_rep'), [users]);

    useEffect(() => {
        if (!isManager && currentUser) {
            setSelectedRep(currentUser.id);
        }
    }, [isManager, currentUser]);

    const filteredClinics = useMemo(() => {
        if (!selectedArea || !selectedLine) return [];
        return clinics.filter(c => c.area === selectedArea && c.line === selectedLine);
    }, [selectedArea, selectedLine, clinics]);

    useEffect(() => {
        setSelectedClinic('');
    }, [selectedArea, selectedLine]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArea || !selectedLine || !selectedClinic || !selectedRep || !taskType || !taskDate) {
            toast({
                variant: 'destructive',
                title: 'الحقول المطلوبة مفقودة',
                description: 'يرجى ملء جميع الحقول الأساسية.',
            });
            return;
        }

        setIsSubmitting(true);
        
        const clinic = clinics.find(c => c.id === selectedClinic);
        const rep = users.find(u => u.id === selectedRep);

        if (!clinic || !rep) {
            toast({ variant: 'destructive', title: 'خطأ في البيانات' });
            setIsSubmitting(false);
            return;
        }

        const newTask: Omit<PlanTask, 'id'> = {
            clinicId: clinic.id,
            clinicName: clinic.name,
            userId: rep.id,
            userName: rep.fullName,
            area: selectedArea,
            line: selectedLine,
            taskType: taskType as any,
            date: taskDate.toISOString(),
            time: taskTime,
            notes: notes,
            isCompleted: false,
            // Required DB-aligned fields
            title: `${taskType} - ${clinic.name}`,
            description: notes,
            assignedTo: rep.id,
            dueDate: taskDate.toISOString(),
            status: 'pending',
            priority: 'medium',
        };

        try {
            await addPlanTaskAction(newTask);
            toast({
                title: 'نجاح',
                description: `تمت إضافة المهمة بنجاح.`,
            });
            router.push('/plans');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save task.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold tracking-tight">إضافة مهمة جديدة للخطة</h1>
            
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>تفاصيل المهمة</CardTitle>
                        <CardDescription>أدخل جميع المعلومات المطلوبة لإنشاء مهمة جديدة في الخطة الشهرية.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><MapPin/>المنطقة الجغرافية</Label>
                                <Select value={selectedArea} onValueChange={setSelectedArea} required>
                                    <SelectTrigger><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                                    <SelectContent>
                                        {safeAreas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Briefcase/>الخط التجاري</Label>
                                <Select value={selectedLine} onValueChange={setSelectedLine} required>
                                    <SelectTrigger><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                                    <SelectContent>
                                        {safeLines.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Building/>العيادة</Label>
                                <Select value={selectedClinic} onValueChange={setSelectedClinic} disabled={!selectedArea || !selectedLine} required>
                                    <SelectTrigger><SelectValue placeholder="اختر العيادة" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredClinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label className="flex items-center gap-2"><UserIcon/>المندوب المسؤول</Label>
                                <Select value={selectedRep} onValueChange={setSelectedRep} required disabled={!isManager}>
                                    <SelectTrigger><SelectValue placeholder="اختر المندوب" /></SelectTrigger>
                                    <SelectContent>
                                        {isManager ? (
                                            medicalReps.map(rep => <SelectItem key={rep.id} value={rep.id}>{rep.fullName}</SelectItem>)
                                        ) : (
                                            currentUser && <SelectItem value={currentUser.id}>{currentUser.fullName}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><FileText/>نوع المهمة</Label>
                                <Select value={taskType} onValueChange={setTaskType} required>
                                    <SelectTrigger><SelectValue placeholder="اختر نوع المهمة" /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(taskTypes).map(([key, value]) => {
                                            const Icon = value.icon;
                                            return (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        <Icon className={`h-4 w-4 ${value.color}`} />
                                                        <span>{value.label}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><CalendarIcon/>تاريخ المهمة</Label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="ml-2 h-4 w-4" />
                                            {taskDate ? format(taskDate, "PPP") : <span>اختر تاريخ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={taskDate} onSelect={setTaskDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Clock/>الوقت (اختياري)</Label>
                                <Input type="time" value={taskTime} onChange={e => setTaskTime(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>ملاحظات</Label>
                            <Textarea placeholder="أضف أي ملاحظات أو تفاصيل إضافية هنا..." value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                           <Button type="button" variant="ghost" onClick={() => router.push('/plans')}>إلغاء</Button>
                           <Button type="submit" size="lg" disabled={isSubmitting}>
                                <CheckCircle className="ml-2 h-4 w-4" />
                                {isSubmitting ? 'جاري الحفظ...' : 'حفظ المهمة'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
