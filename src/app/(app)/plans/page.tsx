"use client";

import { useState, useMemo } from 'react';
import { useDataProvider } from '@/lib/data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getVisibleClinicsForUser } from '@/lib/visibility';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Target, Calendar, User, CheckCircle, Trash2, AlertTriangle, Plus } from 'lucide-react';
import type { PlanTask } from '@/lib/types';
import i18n from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

const CreateTaskForm = ({ onSubmit, onClose }: { onSubmit: (task: Omit<PlanTask, 'id'>) => Promise<void>, onClose: () => void }) => {
  const { currentUser, users, clinics, planTasks } = useDataProvider();
  const visibleClinics = getVisibleClinicsForUser(currentUser, clinics, users);

  // Team-based tasks visibility
  const teamIds = (currentUser && users) ? users.filter(u => u.manager === currentUser.id).map(u => u.id) : [];
  const visibleTasks = (planTasks || []).filter(t => {
    if (!currentUser) return true;
    if (currentUser.role === 'admin' || currentUser.role === 'gm') return true;
    if (currentUser.role === 'manager' || currentUser.role === 'area_manager' || currentUser.role === 'line_manager') {
      return teamIds.includes(t.assignedTo || t.userId);
    }
    // reps see only their tasks
    return (t.assignedTo || t.userId) === currentUser.id;
  });
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
      await onSubmit({
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
      onClose();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
};

const TaskRow = ({ task, onDelete }: { task: PlanTask, onDelete: (task: PlanTask) => void }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Replace data source with visibleTasks below where tasks are rendered
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{task.title}</TableCell>
      <TableCell className="max-w-xs">
        <p className="text-sm text-muted-foreground truncate">
          {task.description || 'No description'}
        </p>
      </TableCell>
      <TableCell>
        <Badge className={getPriorityColor(task.priority)}>
          {task.priority}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className={getStatusColor(task.status)}>
          {task.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {formatDate(task.dueDate)}
        </div>
      </TableCell>
      <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="icon" aria-label="Delete task">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete task?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task "{task.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(task)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
};

export default function PlansPage() {
  const t = i18n.t;
  const { planTasks, isLoading, isClient, deletePlanTask, addPlanTask } = useDataProvider();
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredTasks = useMemo(() => {
    return planTasks.filter(task => {
      switch (filter) {
        case 'pending':
          return task.status === 'pending' || task.status === 'in_progress';
        case 'completed':
          return task.status === 'completed';
        default:
          return true;
      }
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [planTasks, filter]);

  const taskStats = useMemo(() => {
    const total = planTasks.length;
    const completed = planTasks.filter(t => t.status === 'completed').length;
    const pending = planTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
    const overdue = planTasks.filter(t => 
      (t.status === 'pending' || t.status === 'in_progress') && 
      new Date(t.dueDate) < new Date()
    ).length;
    
    return { total, completed, pending, overdue };
  }, [planTasks]);

  const handleCreateTask = async (taskData: Omit<PlanTask, 'id'>) => {
    await addPlanTask(taskData);
    setIsCreateDialogOpen(false);
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Plans & Tasks</h1>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <CreateTaskForm 
                onSubmit={handleCreateTask} 
                onClose={() => setIsCreateDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({planTasks.length})
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            onClick={() => setFilter('pending')}
            size="sm"
          >
            Pending ({taskStats.pending})
          </Button>
          <Button 
            variant={filter === 'completed' ? 'default' : 'outline'} 
            onClick={() => setFilter('completed')}
            size="sm"
          >
            Completed ({taskStats.completed})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{taskStats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <User className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Overview</CardTitle>
          <CardDescription>
            Manage and track your team's tasks and objectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map(task => (
                  <TaskRow key={task.id} task={task} onDelete={async (t) => await deletePlanTask(t.id)} />
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Target className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No tasks found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {filter === 'all' ? 'No tasks have been created yet.' : `No ${filter} tasks found.`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
