"use client";

import { useState, useMemo } from 'react';
import { useDataProvider } from '@/lib/data-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Briefcase, MapPin, User, Plus } from 'lucide-react';
import type { Visit, Clinic } from '@/lib/types';
import i18n from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { locationService } from '@/lib/location-service';

const CreateVisitForm = ({ onSubmit, onClose }: { onSubmit: (visit: Omit<Visit, 'id'>) => Promise<void>, onClose: () => void }) => {
  const { currentUser, clinics } = useDataProvider();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geo, setGeo] = useState<{ lat?: number; lng?: number }>({});
  const [formData, setFormData] = useState({
    clinicId: '',
    visitDate: new Date().toISOString().slice(0,16),
    purpose: '',
    notes: '',
    outcome: '',
    nextVisitDate: '',
    objective: '',
    metWith: '',
    outcomeNotes: '',
  });

  const captureLocation = async () => {
    try {
      const data = await locationService.getCurrentLocation();
      if (data) {
        setGeo({ lat: data.latitude, lng: data.longitude });
      }
    } catch (e) {
      // ignore capture errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clinicId || !formData.visitDate || !formData.purpose) return;

    const clinic = clinics.find(c => c.id === formData.clinicId);

    const meta = {
      objective: formData.objective || undefined,
      metWith: formData.metWith || undefined,
      outcomeNotes: formData.outcomeNotes || undefined,
      location: geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : undefined,
    };
    const metaStr = Object.values(meta).some(Boolean) ? `\n\n---\nmeta:${JSON.stringify(meta)}` : '';
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        clinicId: formData.clinicId,
        clinicName: clinic?.name || 'Unknown Clinic',
        visitDate: formData.visitDate,
        purpose: formData.purpose,
        notes: (formData.notes || '') + metaStr || undefined,
        outcome: formData.outcome as Visit['outcome'] || undefined,
        nextVisitDate: formData.nextVisitDate || undefined,
        representativeId: currentUser?.id || '',
        isCompleted: false,
      });
      onClose();
    } catch (error) {
      console.error('Error creating visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clinic">Clinic *</Label>
        <Select
          value={formData.clinicId}
          onValueChange={(value) => setFormData(prev => ({ ...prev, clinicId: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select clinic" />
          </SelectTrigger>
          <SelectContent>
            {clinics.map(clinic => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name} - {clinic.doctorName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="visitDate">Visit Date *</Label>
          <Input
            id="visitDate"
            type="datetime-local"
            value={formData.visitDate}
            onChange={(e) => setFormData(prev => ({ ...prev, visitDate: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nextVisitDate">Next Visit Date (Optional)</Label>
          <Input
            id="nextVisitDate"
            type="date"
            value={formData.nextVisitDate}
            onChange={(e) => setFormData(prev => ({ ...prev, nextVisitDate: e.target.value }))}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="purpose">Purpose *</Label>
        <Input
          id="purpose"
          placeholder="Purpose of visit"
          value={formData.purpose}
          onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome (Optional)</Label>
        <Select
          value={formData.outcome}
          onValueChange={(value) => setFormData(prev => ({ ...prev, outcome: value === 'unset' ? '' : value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unset">Not set</SelectItem>
            <SelectItem value="successful">Successful</SelectItem>
            <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
            <SelectItem value="follow_up_needed">Follow-up Needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="objective">Objective</Label>
          <Select
            value={formData.objective}
            onValueChange={(value) => setFormData(prev => ({ ...prev, objective: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose objective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_product">New product</SelectItem>
              <SelectItem value="collection">Collection</SelectItem>
              <SelectItem value="problem_solving">Problem solving</SelectItem>
              <SelectItem value="relationship_building">Relationship</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="metWith">Met with</Label>
          <Input
            id="metWith"
            placeholder="Dr. / Assistant name"
            value={formData.metWith}
            onChange={(e) => setFormData(prev => ({ ...prev, metWith: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcomeNotes">Outcome notes</Label>
        <Textarea
          id="outcomeNotes"
          placeholder="Result, agreements, follow-up required..."
          value={formData.outcomeNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, outcomeNotes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" onClick={captureLocation}>Use my location</Button>
        {geo.lat && geo.lng && (
          <span className="text-xs text-muted-foreground">Location captured: {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}</span>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Visit notes and observations"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Visit'}
        </Button>
      </div>
    </form>
  );
};

const VisitCard = ({ visit, clinic }: { visit: Visit; clinic?: Clinic }) => {
  const t = i18n.t;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="hover:border-primary transition-all">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{clinic?.name || 'Unknown Clinic'}</span>
          <Badge variant="outline">
            {new Date(visit.visitDate) > new Date() ? 'Upcoming' : 'Past'}
          </Badge>
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatDate(visit.visitDate)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Purpose:</span>
            <span>{visit.purpose}</span>
          </div>
          {clinic?.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{clinic.address}</span>
            </div>
          )}
          {visit.notes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {visit.notes}
            </p>
          )}
          {visit.outcome && (
            <div className="mt-2">
              <span className="text-sm font-medium">Outcome: </span>
              <span className="text-sm">{visit.outcome}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// export helpers
function exportCSV(name: string, rows: Array<Record<string, any>>) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${name}.csv`; a.click(); URL.revokeObjectURL(url);
}
async function exportPDF(rows: Array<Record<string, any>>, settings: any) {
  const branding = settings ? {
    title: settings.site_title,
    companyAddress: settings.company_address,
    phone: settings.company_phone,
    email: settings.company_email,
    website: settings.company_website,
    logo: settings.logo_path,
    layout: settings.print_review_style || 'classic'
  } : undefined;
  const res = await fetch('/api/export/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entity: 'visits', clinic: { id: 'all', name: 'All Clinics' }, rows, lang: settings?.rtl_support ? 'ar' : 'en', branding }) });
  if (!res.ok) { alert('PDF export failed'); return; }
  const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `visits.pdf`; a.click(); URL.revokeObjectURL(url);
}

export default function VisitsPage() {
  const t = i18n.t;
  const { visits, clinics, isLoading, isClient, addVisit } = useDataProvider();
  const settings = useSiteSettingsValue();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredVisits = useMemo(() => {
    const now = new Date();
    return visits.filter(visit => {
      const visitDate = new Date(visit.visitDate);
      switch (filter) {
        case 'upcoming':
          return visitDate > now;
        case 'past':
          return visitDate <= now;
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [visits, filter]);

  const getClinicById = (clinicId: string) => {
    return clinics.find(c => c.id === clinicId);
  };

  const handleCreateVisit = async (visitData: Omit<Visit, 'id'>) => {
    await addVisit(visitData);
    setIsCreateDialogOpen(false);
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Visits</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV('visits', filteredVisits.map(v => ({ clinic: getClinicById(v.clinicId)?.name || '', date: new Date(v.visitDate).toLocaleString(), purpose: v.purpose, status: v.isCompleted ? 'done' : 'pending', notes: v.notes || '' })))}>Export CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportPDF(filteredVisits.map(v => ({ clinic: getClinicById(v.clinicId)?.name || '', date: new Date(v.visitDate).toLocaleString(), purpose: v.purpose, status: v.isCompleted ? 'done' : 'pending', notes: v.notes || '' })), settings)}>PDF</Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Visit</DialogTitle>
              </DialogHeader>
              <CreateVisitForm 
                onSubmit={handleCreateVisit} 
                onClose={() => setIsCreateDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            size="sm"
          >
            All ({visits.length})
          </Button>
          <Button 
            variant={filter === 'upcoming' ? 'default' : 'outline'} 
            onClick={() => setFilter('upcoming')}
            size="sm"
          >
            Upcoming
          </Button>
          <Button 
            variant={filter === 'past' ? 'default' : 'outline'} 
            onClick={() => setFilter('past')}
            size="sm"
          >
            Past
          </Button>
        </div>
      </div>

      {filteredVisits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisits.map(visit => (
            <VisitCard 
              key={visit.id} 
              visit={visit} 
              clinic={getClinicById(visit.clinicId)} 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No visits found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'all' ? 'No visits have been recorded yet.' : `No ${filter} visits found.`}
          </p>
        </div>
      )}
    </div>
  );
}
