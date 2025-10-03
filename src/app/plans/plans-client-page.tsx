
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Target, MapPin, Briefcase } from "lucide-react";
import type { PlanTask } from '@/lib/types';
import { taskTypes } from './plan-utils';
import { useTranslation } from 'react-i18next';

interface PlansClientPageProps {
    initialPlanTasks: PlanTask[];
    initialLines: string[];
    initialAreas: string[];
}

export function PlansClientPage({ initialPlanTasks, initialLines, initialAreas }: PlansClientPageProps) {
    const { t } = useTranslation();
    const [planTasks] = useState<PlanTask[]>(initialPlanTasks);
    const [lines] = useState<string[]>(initialLines);
    const [areas] = useState<string[]>(initialAreas);

    const groupedTasks = useMemo(() => {
        const result: { [line: string]: { [area: string]: PlanTask[] } } = {};
        
        for (const line of lines) {
            result[line] = {};
            for (const area of areas) {
                result[line][area] = [];
            }
        }
        
        planTasks.forEach(task => {
            if (result[task.line] && result[task.line][task.area]) {
                result[task.line][task.area].push(task);
            }
        });

        return result;
    }, [planTasks, lines, areas]);

    return (
        <>
        {planTasks.length === 0 ? (
             <Card>
                <CardContent className="pt-6">
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-semibold">{t('plans.no_active_plans')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('plans.start_adding_tasks')}</p>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <Accordion type="multiple" defaultValue={lines} className="w-full space-y-4">
                {Object.entries(groupedTasks).map(([line, areasData]) => (
                    <AccordionItem value={line} key={line} className="border-none">
                        <Card>
                            <CardHeader className="p-0">
                                <AccordionTrigger className="p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                            <Briefcase className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl">{t('plans.line_plans', { line: line })}</CardTitle>
                                            <CardDescription>{t('plans.view_all_plans')}</CardDescription>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                            </CardHeader>
                            <AccordionContent className="p-6 pt-0">
                                <Accordion type="multiple" className="w-full space-y-2">
                                     {Object.entries(areasData).filter(([, tasks]) => tasks.length > 0).map(([area, tasks]) => (
                                        <AccordionItem value={area} key={area} className="border rounded-md">
                                            <AccordionTrigger className="px-4 py-2 hover:no-underline">
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    <span>{area}</span>
                                                    <Badge variant="secondary">{t('plans.tasks_count', { count: tasks.length })}</Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-0">
                                                <div className="border-t">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>{t('plans.task_type')}</TableHead>
                                                            <TableHead>{t('common.clinic')}</TableHead>
                                                            <TableHead>{t('common.rep')}</TableHead>
                                                            <TableHead>{t('plans.date_time')}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {tasks.map(task => {
                                                             const taskInfo = taskTypes(t)[task.taskType as keyof ReturnType<typeof taskTypes>] || {};
                                                             const Icon = taskInfo.icon || Target;
                                                            return (
                                                                <TableRow key={task.id}>
                                                                    <TableCell>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`p-1.5 rounded-full ${taskInfo.bgColor}`}>
                                                                                <Icon className={`h-4 w-4 ${taskInfo.color}`} />
                                                                            </div>
                                                                            <span className="font-medium">{taskInfo.label}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>{task.clinicName}</TableCell>
                                                                    <TableCell>{task.userName}</TableCell>
                                                                    <TableCell>
                                                                        {new Date(task.date).toLocaleDateString()}
                                                                        {task.time && <span className="text-muted-foreground text-xs block">{task.time}</span>}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                     ))}
                                </Accordion>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                ))}
            </Accordion>
        )}
        </>
    );
}

    