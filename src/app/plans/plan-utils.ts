
import { Briefcase, HandCoins, ShoppingCart, MessageSquareWarning, ClipboardList } from 'lucide-react';
import type { TFunction } from 'i18next';

export const taskTypes = (t: TFunction) => ({
    visit: { label: t('plans.task_types.visit'), icon: Briefcase, color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
    collection: { label: t('plans.task_types.collection'), icon: HandCoins, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    order: { label: t('plans.task_types.order'), icon: ShoppingCart, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    follow_up: { label: t('plans.task_types.follow_up'), icon: ClipboardList, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    problem: { label: t('plans.task_types.problem'), icon: MessageSquareWarning, color: 'text-red-500', bgColor: 'bg-red-500/10' },
});
