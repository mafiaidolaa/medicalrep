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
import type { Visit } from '@/lib/types';
import { getVisibleClinicsForUser } from '@/lib/visibility';
import { locationService } from '@/lib/location-service';

export default function NewVisitPage() {
  const router = useRouter();
  const { addVisit, currentUser, clinics, users } = useDataProvider();
  const visibleClinics = getVisibleClinicsForUser(currentUser, clinics, users);
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

    // Serialize professional extras into notes (preserved in DB)
    const meta = {
      objective: formData.objective || undefined,
      metWith: formData.metWith || undefined,
      outcomeNotes: formData.outcomeNotes || undefined,
      location: geo.lat && geo.lng ? { lat: geo.lat, lng: geo.lng } : undefined,
    };
    const metaStr = Object.values(meta).some(Boolean) ? `\n\n---\nmeta:${JSON.stringify(meta)}` : '';

    setIsSubmitting(true);
    try {
      await addVisit({
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
      router.push('/visits');
    } catch (error) {
      console.error('Error creating visit:', error);
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
        <h1 className="text-3xl font-bold tracking-tight">Create New Visit</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent>
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
                  {visibleClinics.map(clinic => (
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Visit'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
