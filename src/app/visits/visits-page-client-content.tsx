
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import i18n from '@/lib/i18n';

export function VisitsPageClientContent() {
    const t = i18n.t;
    return (
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">{t('visits.title')}</h1>
            <Link href="/visits/new">
                <Button>
                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('visits.new_visit_button')}
                </Button>
            </Link>
        </div>
    );
}
