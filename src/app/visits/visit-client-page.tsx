
"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, CheckCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Visit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useDataProvider } from '@/lib/data-provider';

export function VisitClientPage() {
  const { t, i18n } = useTranslation();
  const { visits, setVisits } = useDataProvider();
  const { toast } = useToast();
  
  const handleToggleComplete = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if(visit) {
        const updatedVisits = visits.map(v => v.id === visitId ? {...v, isCompleted: !v.isCompleted} : v);
        setVisits(updatedVisits);
        toast({
            title: !visit.isCompleted ? t('visits.visit_completed') : t('visits.visit_marked_pending'),
            description: t('visits.visit_updated', { clinicName: visit.clinicName }),
        });
    }
  }

  const upcomingVisits = visits.filter(v => !v.isCompleted);
  const completedVisits = visits.filter(v => v.isCompleted);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {visits.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">{t('visits.no_visits_recorded')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('visits.start_creating_visits')}</p>
        </div>
      ) : (
        <div className="grid gap-8">
            <div>
                <h2 className="text-xl font-semibold mb-4">{t('visits.upcoming_visits')} ({upcomingVisits.length})</h2>
                {upcomingVisits.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {upcomingVisits.map((visit) => (
                            <Card key={visit.id}>
                            <CardHeader>
                                <CardTitle>{visit.clinicName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 pt-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(visit.visitDate)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 h-14">{visit.notes || t('visits.no_notes')}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant={'outline'} size="sm" onClick={() => handleToggleComplete(visit.id)}>
                                    <CheckCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                    {t('visits.complete_visit')}
                                </Button>
                                <Badge variant="secondary">{t('visits.scheduled')}</Badge>
                            </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : <p className="text-muted-foreground">{t('visits.no_upcoming_visits')}</p>}
            </div>
             <div>
                <h2 className="text-xl font-semibold mb-4">{t('visits.completed_visits')} ({completedVisits.length})</h2>
                 {completedVisits.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {completedVisits.map((visit) => (
                            <Card key={visit.id} className="bg-muted/50">
                            <CardHeader>
                                <CardTitle>{visit.clinicName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 pt-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(visit.visitDate)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-3 h-14">{visit.notes || t('visits.no_notes')}</p>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                 <Button variant={'secondary'} size="sm" onClick={() => handleToggleComplete(visit.id)}>
                                    <CheckCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-green-500" />
                                    {t('visits.undo_completion')}
                                </Button>
                                <Badge variant="default" className="bg-green-600">{t('visits.completed')}</Badge>
                            </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : <p className="text-muted-foreground">{t('visits.no_completed_visits')}</p>}
            </div>
        </div>
      )}
    </div>
  );
}
