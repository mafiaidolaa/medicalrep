"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataProvider } from '@/lib/data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import type { PlanTask } from '@/lib/types';
import { getVisibleClinicsForUser } from '@/lib/visibility';

export default function NewTaskPage() {
  const router = useRouter();
  const { addPlanTask, currentUser, users, clinics } = useDataProvider();
  const visibleClinics = getVisibleClinicsForUser(currentUser, clinics, users);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assignedTo: string;
    clinicId: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    status: 'pending';
  }>({
    title: '',
    description: '',
    assignedTo: currentUser?.id || '',
    clinicId: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate || !formData.assignedTo) return;

    setIsSubmitting(true);
    try {
      await addPlanTask({
        ...formData,
        userId: formData.assignedTo,
        userName: users.find(u => u.id === formData.assignedTo)?.fullName || 'Unknown',
        clinicName: formData.clinicId ? clinics.find(c => c.id === formData.clinicId)?.name || 'Unknown' : '',
        area: formData.clinicId ? clinics.find(c => c.id === formData.clinicId)?.area || '' : '',
        line: formData.clinicId ? clinics.find(c => c.id === formData.clinicId)?.line || '' : '',
        taskType: 'follow_up' as const,
        date: formData.dueDate,
        notes: formData.description,
        isCompleted: false,
      });
      router.push('/plans');
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Task title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Task description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To *</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clinic">Clinic (Optional)</Label>
                <Select
                  value={formData.clinicId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, clinicId: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select clinic" />
                  </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific clinic</SelectItem>
                      {visibleClinics.map(clinic => (
                        <SelectItem key={clinic.id} value={clinic.id}>
                          {clinic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
