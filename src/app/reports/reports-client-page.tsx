
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Users as UsersIcon, Package, Receipt, HandCoins, BarChart3, Activity } from "lucide-react";
import type { Order, Collection, User, Product, Clinic, Expense } from '@/lib/types';
import { ChartContainer } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, Bar, BarChart } from "recharts";
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';


const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const AgeingDebtReport = ({ orders }: { orders: Order[] }) => {
    const { t } = useTranslation();
    const now = new Date();

    const debtsByAge = useMemo(() => {
        const categories = {
            '0-30': { total: 0, count: 0 },
            '31-60': { total: 0, count: 0 },
            '61-90': { total: 0, count: 0 },
            '91+': { total: 0, count: 0 },
        };

        orders.filter(o => o.status === 'pending').forEach(order => {
            const orderDate = new Date(order.orderDate);
            const diffDays = Math.ceil((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) {
                categories['0-30'].total += order.total;
                categories['0-30'].count += 1;
            } else if (diffDays <= 60) {
                categories['31-60'].total += order.total;
                categories['31-60'].count += 1;
            } else if (diffDays <= 90) {
                categories['61-90'].total += order.total;
                categories['61-90'].count += 1;
            } else {
                categories['91+'].total += order.total;
                categories['91+'].count += 1;
            }
        });

        return categories;
    }, [orders]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('reports.ageing_debt_analysis.title')}</CardTitle>
                <CardDescription>{t('reports.ageing_debt_analysis.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('reports.ageing_debt_analysis.age_range')}</TableHead>
                            <TableHead>{t('reports.ageing_debt_analysis.number_of_invoices')}</TableHead>
                            <TableHead className="text-right">{t('reports.ageing_debt_analysis.total_amount')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>0-30 {t('reports.ageing_debt_analysis.days')}</TableCell>
                            <TableCell>{debtsByAge['0-30'].count}</TableCell>
                            <TableCell className="text-right">{debtsByAge['0-30'].total.toFixed(2)} {t('common.egp')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>31-60 {t('reports.ageing_debt_analysis.days')}</TableCell>
                            <TableCell>{debtsByAge['31-60'].count}</TableCell>
                            <TableCell className="text-right">{debtsByAge['31-60'].total.toFixed(2)} {t('common.egp')}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>61-90 {t('reports.ageing_debt_analysis.days')}</TableCell>
                            <TableCell>{debtsByAge['61-90'].count}</TableCell>
                            <TableCell className="text-right">{debtsByAge['61-90'].total.toFixed(2)} {t('common.egp')}</TableCell>
                        </TableRow>
                         <TableRow>
                            <TableCell>91+ {t('reports.ageing_debt_analysis.days')}</TableCell>
                            <TableCell>{debtsByAge['91+'].count}</TableCell>
                            <TableCell className="text-right">{debtsByAge['91+'].total.toFixed(2)} {t('common.egp')}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const ProductProfitabilityReport = ({ orders, products }: { orders: Order[], products: Product[] }) => {
    const { t } = useTranslation();

    const productProfitability = useMemo(() => {
        const productData: { [key: string]: { sales: number; units: number } } = {};

        orders.forEach(order => {
            order.items.forEach(item => {
                if (!productData[item.productId]) {
                    productData[item.productId] = { sales: 0, units: 0 };
                }
                productData[item.productId].sales += item.quantity * item.price;
                productData[item.productId].units += item.quantity;
            });
        });

        return Object.entries(productData).map(([productId, data]) => {
            const product = products.find(p => p.id === productId);
            const cost = (product?.price || 0) * 0.6; // Assuming 40% profit margin
            const totalCost = cost * data.units;
            const profit = data.sales - totalCost;
            return {
                name: product?.name || 'Unknown Product',
                unitsSold: data.units,
                totalRevenue: data.sales,
                estimatedProfit: profit,
            };
        }).sort((a, b) => b.estimatedProfit - a.estimatedProfit);

    }, [orders, products]);
    
    return (
         <Card>
            <CardHeader>
                <CardTitle>{t('reports.product_profitability.title')}</CardTitle>
                <CardDescription>{t('reports.product_profitability.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('common.product')}</TableHead>
                            <TableHead>{t('common.quantity_sold')}</TableHead>
                            <TableHead>{t('reports.total_revenue')}</TableHead>
                            <TableHead className="text-right">{t('reports.product_profitability.estimated_profit')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productProfitability.map(item => (
                            <TableRow key={item.name}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>{item.unitsSold}</TableCell>
                                <TableCell>{item.totalRevenue.toFixed(2)} {t('common.egp')}</TableCell>
                                <TableCell className="text-right font-semibold">{item.estimatedProfit.toFixed(2)} {t('common.egp')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

const ExpenseAnalysisReport = ({ expenses }: { expenses: Expense[] }) => {
    const { t } = useTranslation();

    const expenseByCategory = useMemo(() => {
        const categoryData: { [key: string]: number } = {};
        expenses.forEach(exp => {
            categoryData[exp.category] = (categoryData[exp.category] || 0) + exp.amount;
        });
        return Object.entries(categoryData).map(([name, value]) => ({ name: t(`accounting.expenses.categories.${name}`), value }));
    }, [expenses, t]);

    const expenseByUser = useMemo(() => {
        const userData: { [key: string]: number } = {};
        expenses.forEach(exp => {
            userData[exp.userName] = (userData[exp.userName] || 0) + exp.amount;
        });
        return Object.entries(userData).map(([name, value]) => ({ name, value }));
    }, [expenses]);
    
    return (
        <div className="grid md:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>{t('reports.expense_analysis.by_category')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expenseByCategory}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()}`} />
                            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${t('common.egp')}`, t('common.amount')]} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t('reports.expense_analysis.by_user')}</CardTitle>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expenseByUser}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toLocaleString()}`} />
                            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} ${t('common.egp')}`, t('common.amount')]} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}

const PaymentBehaviorReport = ({ clinics, orders, collections }: { clinics: Clinic[], orders: Order[], collections: Collection[] }) => {
    const { t } = useTranslation();
    const getBadgeVariant = (score: string) => {
        if (score === 'ممتاز') return 'default';
        if (score === 'جيد') return 'secondary';
        return 'destructive';
    }

    const paymentData = useMemo(() => {
        return clinics.map(clinic => {
            const clinicOrders = orders.filter(o => o.clinicId === clinic.id && o.status === 'delivered' && o.dueDate);
            if (clinicOrders.length === 0) {
                return { name: clinic.name, doctorName: clinic.doctorName, avgDaysLate: null, score: 'لا توجد بيانات' };
            }

            let totalDaysLate = 0;
            let paidOrdersCount = 0;

            clinicOrders.forEach(order => {
                const orderCollections = collections.filter(c => c.orderId === order.id);
                const totalCollected = orderCollections.reduce((sum, c) => sum + c.amount, 0);

                if (totalCollected >= order.total) {
                    const lastCollectionDate = new Date(Math.max(...orderCollections.map(c => new Date(c.collectionDate).getTime())));
                    const dueDate = new Date(order.dueDate!);
                    const daysLate = Math.ceil((lastCollectionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    totalDaysLate += Math.max(0, daysLate);
                    paidOrdersCount++;
                }
            });
            
            if (paidOrdersCount === 0) {
                return { name: clinic.name, doctorName: clinic.doctorName, avgDaysLate: null, score: 'لا توجد بيانات' };
            }

            const avgDaysLate = totalDaysLate / paidOrdersCount;
            
            let score = '';
            if (avgDaysLate <= 1) score = 'ممتاز';
            else if (avgDaysLate <= 7) score = 'جيد';
            else score = 'ضعيف';

            return { name: clinic.name, doctorName: clinic.doctorName, avgDaysLate: avgDaysLate.toFixed(1), score };
        });
    }, [clinics, orders, collections]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('reports.payment_behavior.title')}</CardTitle>
                <CardDescription>{t('reports.payment_behavior.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('common.clinic')}</TableHead>
                            <TableHead>{t('reports.payment_behavior.avg_days_late')}</TableHead>
                            <TableHead className="text-right">{t('reports.payment_behavior.credit_score')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentData.map(item => (
                            <TableRow key={item.name}>
                                <TableCell>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.doctorName}</div>
                                </TableCell>
                                <TableCell>{item.avgDaysLate ?? 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant={getBadgeVariant(item.score)}>{item.score}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

interface ReportsClientPageProps {
    orders: Order[];
    collections: Collection[];
    users: User[];
    clinics: Clinic[];
    products: Product[];
    expenses: Expense[];
    areas: string[];
    lines: string[];
}


export function ReportsClientPage({
    orders,
    collections,
    users,
    clinics,
    products,
    expenses,
    areas,
    lines,
}: ReportsClientPageProps) {
    const { t, i18n } = useTranslation();
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const [selectedLine, setSelectedLine] = useState<string | null>(null);

    const filteredOrders = useMemo(() => {
        let tempOrders = [...orders];
        if (selectedArea) {
            const clinicIdsInArea = clinics.filter(c => c.area === selectedArea).map(c => c.id);
            tempOrders = tempOrders.filter(order => clinicIdsInArea.includes(order.clinicId));
        }
        if (selectedLine) {
            const clinicIdsInLine = clinics.filter(c => c.line === selectedLine).map(c => c.id);
            tempOrders = tempOrders.filter(order => clinicIdsInLine.includes(order.clinicId));
        }
        return tempOrders;
    }, [orders, clinics, selectedArea, selectedLine]);

    const totalRevenue = useMemo(() => {
        return filteredOrders.reduce((acc, order) => acc + order.total, 0);
    }, [filteredOrders]);

    const totalCollections = useMemo(() => {
        return collections.reduce((acc, collection) => acc + collection.amount, 0);
    }, [collections]);
    
    const totalExpenses = useMemo(() => {
        return expenses.reduce((acc, expense) => acc + expense.amount, 0);
    }, [expenses]);

    const totalClinics = useMemo(() => {
        return clinics.length;
    }, [clinics]);

    const totalProducts = useMemo(() => {
        return products.length;
    }, [products]);

    const monthlyRevenueData = useMemo(() => {
        const monthlyData: { [key: string]: number } = {};

        filteredOrders.forEach(order => {
            const monthYear = new Date(order.orderDate).toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyData[monthYear] = (monthlyData[monthYear] || 0) + order.total;
        });

        return Object.entries(monthlyData).map(([monthYear, total]) => ({
            monthYear,
            total
        }));
    }, [filteredOrders]);

     const topSellingProducts = useMemo(() => {
        const productSales: { [key: string]: number } = {};

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                productSales[item.productName] = (productSales[item.productName] || 0) + item.quantity;
            });
        });

        const sortedProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        return sortedProducts.map(([name, quantity]) => ({ name, quantity }));
    }, [filteredOrders]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
                <div className="flex gap-2">
                    {(() => {
                        const safeAreas = Array.isArray(areas) ? areas : (areas ? (Object.values(areas as any) as any[]) : []);
                        const safeLines = Array.isArray(lines) ? lines : (lines ? (Object.values(lines as any) as any[]) : []);
                        return (
                            <>
                                <Select onValueChange={(value) => setSelectedArea(value === 'all' ? null : value)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('reports.select_area')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('reports.all_areas')}</SelectItem>
                                        {safeAreas.filter(Boolean).map((area: any) => (
                                            <SelectItem key={String(area)} value={String(area)}>{String(area)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select onValueChange={(value) => setSelectedLine(value === 'all' ? null : value)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('reports.select_line')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('reports.all_lines')}</SelectItem>
                                        {safeLines.filter(Boolean).map((line: any) => (
                                            <SelectItem key={String(line)} value={String(line)}>{String(line)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        );
                    })()}
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard title={t('reports.total_revenue')} value={`${totalRevenue.toLocaleString(i18n.language)} ${t('common.egp')}`} icon={DollarSign} />
                <StatCard title={t('reports.total_collections')} value={`${totalCollections.toLocaleString(i18n.language)} ${t('common.egp')}`} icon={HandCoins} />
                <StatCard title={t('reports.total_expenses')} value={`${totalExpenses.toLocaleString(i18n.language)} ${t('common.egp')}`} icon={Receipt} />
                <StatCard title={t('reports.total_clinics')} value={totalClinics.toString()} icon={UsersIcon} />
                <StatCard title={t('reports.total_products')} value={totalProducts.toString()} icon={Package} />
            </div>

            <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview"><BarChart3 className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('reports.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="profitability"><DollarSign className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('reports.tabs.profitability')}</TabsTrigger>
                    <TabsTrigger value="debt_analysis"><Activity className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('reports.tabs.debt_analysis')}</TabsTrigger>
                    <TabsTrigger value="expense_analysis"><Receipt className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('reports.tabs.expense_analysis')}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('reports.monthly_revenue')}</CardTitle>
                            <CardDescription>{t('reports.monthly_revenue_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={monthlyRevenueData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="monthYear" />
                                    <YAxis />
                                    <Tooltip 
                                        contentStyle={{ direction: i18n.dir() as 'ltr' | 'rtl' }}
                                        cursor={{ fill: "hsl(var(--muted))" }}
                                        formatter={(value: number) => [`${value.toLocaleString(i18n.language)} ${t('common.egp')}`, t('reports.total_revenue')]}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={2}
                                        dot={false}
                                        name={t('reports.total_revenue')}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('reports.top_selling_products')}</CardTitle>
                                <CardDescription>{t('reports.top_selling_products_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('common.product')}</TableHead>
                                            <TableHead className="text-right">{t('common.quantity_sold')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topSellingProducts.map(product => (
                                            <TableRow key={product.name}>
                                                <TableCell>{product.name}</TableCell>
                                                <TableCell className="text-right">{product.quantity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <PaymentBehaviorReport clinics={clinics} orders={orders} collections={collections} />
                    </div>
                </TabsContent>
                <TabsContent value="profitability" className="mt-4">
                     <ProductProfitabilityReport orders={filteredOrders} products={products} />
                </TabsContent>
                <TabsContent value="debt_analysis" className="mt-4">
                     <AgeingDebtReport orders={filteredOrders} />
                </TabsContent>
                <TabsContent value="expense_analysis" className="mt-4">
                    <ExpenseAnalysisReport expenses={expenses} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
