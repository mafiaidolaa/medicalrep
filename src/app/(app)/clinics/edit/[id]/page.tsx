"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Building, Save, Plus, Trash2, Star, PhoneCall, MessageCircle } from 'lucide-react';
import AreaLineSelector from '@/components/clinics/AreaLineSelector';
import ClassificationSelector from '@/components/clinics/ClassificationSelector';
import { useDataProvider } from '@/lib/data-provider';
import type { Clinic, Contact } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';

export default function EditClinicPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  
  if (!params) {
    return <div>Loading...</div>;
  }
  
  const clinicId = params.id as string;

  const { clinics, setClinics, areas, lines } = useDataProvider();
  const clinic = useMemo(() => clinics.find(c => c.id === clinicId), [clinics, clinicId]);

  // Local editable state
  const [form, setForm] = useState<Partial<Clinic>>({});
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinic) {
      setForm({ ...clinic });
      setContacts([...(clinic.contacts ?? [])]);
    }
  }, [clinic]);

  const update = (patch: Partial<Clinic>) => setForm(prev => ({ ...prev, ...patch }));

  const setPrimary = (id: string) => {
    setContacts(prev => prev.map(c => ({ ...c, isPrimary: c.id === id })));
  };

  const addContact = () => {
    setContacts(prev => [
      ...prev,
      { id: crypto.randomUUID?.() ?? String(Date.now()), name: '', role: '', phone: '', email: '', preferredTime: '', isPrimary: prev.length === 0 }
    ]);
  };

  const removeContact = (id: string) => setContacts(prev => prev.filter(c => c.id !== id));

  const onSave = async () => {
    if (!clinic) return;
    setSaving(true);
    try {
      const normalized: Clinic = {
        ...clinic,
        name: form.name ?? clinic.name,
        doctorName: form.doctorName ?? clinic.doctorName,
        address: form.address ?? clinic.address,
        area: form.area ?? clinic.area,
        line: form.line ?? clinic.line,
        classification: form.classification ?? clinic.classification,
        creditStatus: form.creditStatus ?? clinic.creditStatus,
        clinicPhone: form.clinicPhone ?? clinic.clinicPhone,
        doctorPhone: form.doctorPhone ?? clinic.doctorPhone,
        lat: form.lat ?? clinic.lat,
        lng: form.lng ?? clinic.lng,
        // credit policy
        creditLimit: form.creditLimit !== undefined ? Number(form.creditLimit) : clinic.creditLimit,
        paymentTermsDays: form.paymentTermsDays !== undefined ? Number(form.paymentTermsDays) : clinic.paymentTermsDays,
        policyWarnUtilization: form.policyWarnUtilization !== undefined ? Number(form.policyWarnUtilization) : (clinic as any).policyWarnUtilization,
        policyBlockOverLimit: form.policyBlockOverLimit !== undefined ? Boolean(form.policyBlockOverLimit) : (clinic as any).policyBlockOverLimit,
        // contacts
        contacts,
      } as Clinic;

      await setClinics(prev => prev.map(c => c.id === clinicId ? normalized : c));
      router.push(`/clinics/${clinicId}`);
    } finally {
      setSaving(false);
    }
  };

  if (!clinic) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Alert>
              <AlertDescription>{t('clinic_profile.not_found_desc')}</AlertDescription>
            </Alert>
            <Button className="mt-6" onClick={() => router.push('/clinics')}>
              <ArrowLeft className="h-4 w-4 mr-2" />{t('clinic_profile.back_to_clinics')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const callHref = (p?: string) => p ? `tel:${p}` : undefined;
  const waHref = (p?: string) => p ? `https://wa.me/${(p||'').replace(/\D/g,'')}` : undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building className="h-8 w-8 text-primary" />
              {t('common.edit')} — {clinic.name}
            </h1>
            <p className="text-muted-foreground">{t('clinic_profile.doctor_name')}: {clinic.doctorName}</p>
          </div>
        </div>
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? t('common.submitting') : t('common.save_changes')}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('clinic_profile.overview')}</TabsTrigger>
          <TabsTrigger value="policy">{t('clinic_profile.credit_limit')}</TabsTrigger>
          <TabsTrigger value="contacts">{t('clinic_profile.contacts')}</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic_profile.clinic_information')}</CardTitle>
              <CardDescription>{t('common.details')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.clinic_name')}</Label>
                  <Input value={form.name ?? ''} onChange={e => update({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('clinic_profile.doctor_name')}</Label>
                  <Input value={form.doctorName ?? ''} onChange={e => update({ doctorName: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('common.address')}</Label>
                <Textarea rows={3} value={form.address ?? ''} onChange={e => update({ address: e.target.value })} />
              </div>

              <AreaLineSelector
                areas={areas}
                lines={lines}
                area={form.area}
                line={form.line}
                onChange={(v) => {
                  if (v.area !== undefined) update({ area: v.area });
                  if (v.line !== undefined) update({ line: v.line });
                }}
              />

              <ClassificationSelector
                classification={(form.classification ?? clinic.classification) as 'A' | 'B' | 'C'}
                creditStatus={(form.creditStatus ?? clinic.creditStatus) as 'green' | 'yellow' | 'red'}
                onChange={(v) => {
                  if (v.classification) update({ classification: v.classification });
                  if (v.creditStatus) update({ creditStatus: v.creditStatus });
                }}
              />

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common.clinic_phone')}</Label>
                  <Input value={form.clinicPhone ?? ''} onChange={e => update({ clinicPhone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.doctor_phone')}</Label>
                  <Input value={form.doctorPhone ?? ''} onChange={e => update({ doctorPhone: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit policy */}
        <TabsContent value="policy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('clinic_profile.credit_limit')} & {t('clinic_profile.payment_terms')}</CardTitle>
              <CardDescription>{t('clinic_profile.financial_summary') || 'Credit configuration for this clinic'}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('clinic_profile.credit_limit')}</Label>
                <Input type="number" step="0.01" value={form.creditLimit ?? ''} onChange={e => update({ creditLimit: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{t('clinic_profile.payment_terms')} (days)</Label>
                <Input type="number" value={form.paymentTermsDays ?? ''} onChange={e => update({ paymentTermsDays: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Warn at utilization %</Label>
                <Input type="number" value={(form as any).policyWarnUtilization ?? ''} onChange={e => update({ policyWarnUtilization: e.target.value === '' ? undefined : Number(e.target.value) } as any)} />
              </div>
              <div className="space-y-2 flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label>Block orders when over limit</Label>
                  <div className="text-xs text-muted-foreground">Prevents submitting orders if projected balance exceeds credit limit.</div>
                </div>
                <Switch checked={Boolean((form as any).policyBlockOverLimit)} onCheckedChange={(v) => update({ policyBlockOverLimit: v } as any)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>{t('clinic_profile.contacts')}</CardTitle>
                <CardDescription>{t('clinic_profile.add_contact')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addContact}>
                <Plus className="h-4 w-4 mr-2" /> {t('clinic_profile.add_contact')}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name')}</TableHead>
                      <TableHead>{t('common.role')}</TableHead>
                      <TableHead>{t('common.primaryPhone')}</TableHead>
                      <TableHead>{t('common.email')}</TableHead>
                      <TableHead>{t('clinic_profile.preferred_time')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c, idx) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Input value={c.name} onChange={e => setContacts(prev => prev.map((x,i) => i===idx ? { ...x, name: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <Input value={c.role} onChange={e => setContacts(prev => prev.map((x,i) => i===idx ? { ...x, role: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <Input value={c.phone} onChange={e => setContacts(prev => prev.map((x,i) => i===idx ? { ...x, phone: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <Input value={c.email ?? ''} onChange={e => setContacts(prev => prev.map((x,i) => i===idx ? { ...x, email: e.target.value } : x))} />
                        </TableCell>
                        <TableCell>
                          <Input value={c.preferredTime ?? ''} onChange={e => setContacts(prev => prev.map((x,i) => i===idx ? { ...x, preferredTime: e.target.value } : x))} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant={c.isPrimary ? 'default' : 'outline'} onClick={() => setPrimary(c.id)} title={t('clinic_profile.primary')!}>
                              <Star className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" asChild>
                              <a href={callHref(c.phone)}><PhoneCall className="h-4 w-4" /></a>
                            </Button>
                            <Button size="icon" variant="ghost" asChild>
                              <a href={waHref(c.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => removeContact(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? t('common.submitting') : t('common.save_changes')}
        </Button>
      </div>
    </div>
  );
}
