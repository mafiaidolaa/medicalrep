
"use client";

import { useState, useEffect, useRef } from 'react';
import i18n from '@/lib/i18n'; // Using mock i18n
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, CreditCard, HandCoins, BarChart, PlusCircle, Search, Printer, FileDown, Eye, X, Building, User as UserIcon, Wallet, CalendarCheck, ChevronsUpDown, Receipt, Bot, Zap, Gift, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { Order, User, Clinic, OrderItem, Collection, Expense, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { logActivity } from '@/lib/activity-logger';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { suggestInvoiceItems, type SuggestInvoiceItemsOutput } from '@/ai/flows/suggest-invoice-items';
import { openPrintWindowForElement } from '@/lib/print-utils';
import { useDataProvider } from '@/lib/data-provider';
import { generateUUID } from '@/lib/supabase-services';
import { InvoicePrintTemplate } from '@/components/invoice-print-template';


interface Customer {
    id: string;
    customer_code: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    credit_limit: number;
    balance: number;
    status: 'active' | 'inactive' | 'blocked';
    customer_type: 'regular' | 'vip' | 'wholesale';
}

interface SalesRepresentative {
    id: string;
    rep_code: string;
    name: string;
    phone?: string;
    email?: string;
    department?: string;
    region?: string;
    commission_rate: number;
    target_amount: number;
    current_sales: number;
    status: 'active' | 'inactive' | 'suspended';
}

interface AccountingClientPageProps {
    initialOrders: Order[];
    initialUsers: User[];
    initialClinics: Clinic[];
    initialCollections: Collection[];
    initialExpenses: Expense[];
    initialProducts: Product[];
    currentUser: User | null;
}

const StatCard = ({ title, value, icon: Icon, isCurrency = true }: { title: string, value: string, icon: React.ElementType, isCurrency?: boolean }) => {
    const t = i18n.t;
    return (
        <Card>
            <CardContent className="p-4 flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{title}</p>
                    <p className="text-2xl font-bold">{isCurrency ? `${value} ${t('common.egp')}` : value}</p>
                </div>
                <div className="bg-muted p-3 rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
            </CardContent>
        </Card>
    );
};

export function AccountingClientPage({
    initialOrders,
    initialUsers,
    initialClinics,
    initialCollections,
    initialExpenses,
    initialProducts,
    currentUser,
}: AccountingClientPageProps) {
    const t = i18n.t;
    const { toast } = useToast();
    const { orders, setOrders, collections, setCollections, expenses, setExpenses } = useDataProvider();
    
    // API-driven accounting state
    const [invoices, setInvoices] = useState<any[]>([]);
    const [collectionsApi, setCollectionsApi] = useState<any[]>([]);
    const [expensesApi, setExpensesApi] = useState<any[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [salesRepresentatives, setSalesRepresentatives] = useState<SalesRepresentative[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Load accounting data from API
    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [invRes, colRes, expRes, custRes, repRes] = await Promise.all([
                    fetch('/api/accounting/invoices'),
                    fetch('/api/accounting/collections'),
                    fetch('/api/accounting/expenses'),
                    fetch('/api/customers?active_only=true'),
                    fetch('/api/representatives?active_only=true'),
                ]);
                const inv = invRes.ok ? await invRes.json() : [];
                const col = colRes.ok ? await colRes.json() : [];
                const exp = expRes.ok ? await expRes.json() : [];
                const cust = custRes.ok ? await custRes.json() : { data: [] };
                const reps = repRes.ok ? await repRes.json() : { data: [] };
                
                setInvoices(Array.isArray(inv) ? inv : []);
                setCollectionsApi(Array.isArray(col) ? col : []);
                setExpensesApi(Array.isArray(exp) ? exp : []);
                setCustomers(Array.isArray(cust.data) ? cust.data : []);
                setSalesRepresentatives(Array.isArray(reps.data) ? reps.data : []);
            } catch (e) {
                console.error('Failed to load accounting data:', e);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchAll();
    }, []);

    // Main Tab State
    const [activeMainTab, setActiveMainTab] = useState("dashboard");
    const [activeInvoiceTab, setActiveInvoiceTab] = useState("view-invoices");

    // New Invoice State
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [selectedClinic, setSelectedClinic] = useState<string>('');
    const [selectedRep, setSelectedRep] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [dueDate, setDueDate] = useState<Date | undefined>(new Date());
    const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);
    const [discountType, setDiscountType] = useState('none');
    const [discountValue, setDiscountValue] = useState('');
    const [isRepComboboxOpen, setIsRepComboboxOpen] = useState(false);
    const [isCustomerComboboxOpen, setIsCustomerComboboxOpen] = useState(false);

    // AI Suggestions State
    const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<SuggestInvoiceItemsOutput | null>(null);

    
    // Details View State
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const printAreaRef = useRef<HTMLDivElement | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    // Approve-with-edit dialog state
    const [isApproveEditOpen, setIsApproveEditOpen] = useState(false);
    const [approveEditingOrder, setApproveEditingOrder] = useState<Order | null>(null);
    type LineDiscount = { type: 'none'|'percent'|'fixed'; value: string };
    type ApproveItem = Omit<OrderItem, 'discount'> & { discount?: LineDiscount };
    const [approveItems, setApproveItems] = useState<ApproveItem[]>([]);
    const [approveInvoiceDiscount, setApproveInvoiceDiscount] = useState<{ type: 'none'|'percent'|'fixed'|'demo'; value: string }>({ type: 'none', value: '' });

    // Edit-invoice dialog state
    const [isEditInvoiceOpen, setIsEditInvoiceOpen] = useState(false);
    const [editInvoiceDiscount, setEditInvoiceDiscount] = useState<{ type: 'none'|'percent'|'fixed'|'demo'; value: string }>({ type: 'none', value: '' });

    // Edit-invoice-items dialog state
    const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);
    const [editItems, setEditItems] = useState<any[]>([]);
    const openEditItems = async () => {
        try {
            if (!selectedOrder) return;
            const res = await fetch(`/api/accounting/invoices/${(selectedOrder as any).id}/items`);
            const rows = await res.json();
            if (!res.ok) throw new Error(rows?.error || 'Failed');
            const mapped = (rows || []).map((r: any) => ({
                id: r.id,
                item_name: r.item_name,
                quantity: r.quantity,
                unit_price: r.unit_price,
                discount: r.discount_percentage && r.discount_percentage > 0 ? { type: 'percent', value: String(r.discount_percentage) } : (r.discount_amount && r.discount_amount > 0 ? { type: 'fixed', value: String(r.discount_amount) } : { type: 'none', value: '' })
            }));
            setEditItems(mapped);
            setIsEditItemsOpen(true);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: 'فشل تحميل بنود الفاتورة' });
        }
    };
    const addEditItemRow = () => setEditItems(prev => [...prev, { item_name: '', quantity: 1, unit_price: 0, discount: { type: 'none', value: '' } }]);
    const removeEditItemRow = (idx: number) => setEditItems(prev => prev.filter((_,i)=>i!==idx));
    const computeEditItemsTotals = () => {
        const lines = editItems.map((it:any) => {
            const q = Math.max(0, Number(it.quantity)||0);
            const p = Math.max(0, Number(it.unit_price)||0);
            const d = it.discount || { type: 'none', value: '' };
            let lt = p*q;
            if (d.type==='percent' && d.value) lt = Math.max(0, lt - lt*((parseFloat(d.value)||0)/100));
            if (d.type==='fixed' && d.value) lt = Math.max(0, lt - (parseFloat(d.value)||0));
            return lt;
        });
        const subtotal = lines.reduce((s:number,x:number)=>s+x,0);
        return { subtotal };
    };
    const saveEditItems = async () => {
        try {
            if (!selectedOrder) return;
            const isDemo = !!(((selectedOrder as any).description||'').includes('[DEMO]') || ((selectedOrder as any).amount === 0));
            const payload = {
                items: editItems.map((it:any) => ({ item_name: it.item_name, quantity: Number(it.quantity)||0, unit_price: Number(it.unit_price)||0, discount: it.discount })),
                is_demo: isDemo
            };
            const res = await fetch(`/api/accounting/invoices/${(selectedOrder as any).id}/items`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed');
            setInvoices(prev => prev.map(inv => inv.id === (selectedOrder as any).id ? data.invoice : inv));
            setSelectedOrder(data.invoice as any);
            setIsEditItemsOpen(false);
            toast({ title: t('common.success'), description: 'تم تحديث بنود الفاتورة' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: 'فشل تحديث بنود الفاتورة' });
        }
    };

    const openApproveEdit = (order: Order) => {
        setApproveEditingOrder(order);
        setApproveItems(order.items.map(i => ({ 
            ...i, 
            discount: { type: 'none' as const, value: '' } as LineDiscount 
        })));
        setApproveInvoiceDiscount({ type: 'none', value: '' });
        setIsApproveEditOpen(true);
    };

    const computeApproveTotals = () => {
        const lines = approveItems.map(it => {
            const qty = Math.max(0, it.quantity);
            let lt = it.price * qty;
            const d = it.discount;
            if (d && d.type !== 'none' && d.value) {
                const v = parseFloat(d.value) || 0;
                if (d.type === 'percent') lt = Math.max(0, lt - lt * (v/100));
                if (d.type === 'fixed') lt = Math.max(0, lt - v);
            }
            return { ...it, _lineTotal: lt };
        });
        const subtotal = lines.reduce((s, it:any) => s + (it._lineTotal || 0), 0);
        let total = subtotal;
        if (approveInvoiceDiscount.type === 'percent' && approveInvoiceDiscount.value) {
            total = Math.max(0, subtotal - subtotal * ((parseFloat(approveInvoiceDiscount.value)||0)/100));
        } else if (approveInvoiceDiscount.type === 'fixed' && approveInvoiceDiscount.value) {
            total = Math.max(0, subtotal - (parseFloat(approveInvoiceDiscount.value)||0));
        } else if (approveInvoiceDiscount.type === 'demo') {
            total = 0;
        }
        return { lines, subtotal, total };
    };

    const handleApproveWithEdits = async () => {
        if (!approveEditingOrder) return;
        const { total, lines } = computeApproveTotals();
        try {
            setApprovingId(approveEditingOrder.id);
            const res = await fetch(`/api/orders/${approveEditingOrder.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: total,
                    is_demo: approveInvoiceDiscount.type === 'demo',
                    discounts: {
                        invoice: approveInvoiceDiscount,
                        lines: lines.map(l => ({ productId: l.productId, discount: (l as any).discount || { type: 'none', value: '' }, qty: l.quantity, unitPrice: l.price, lineTotal: (l as any)._lineTotal }))
                    }
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed');
            await setOrders(prev => prev.map(o => o.id === approveEditingOrder.id ? { ...o, status: 'approved' as const } : o));
            const createdInvoice = data?.invoice ?? (data?.id ? data : null);
            if (createdInvoice) {
                const stamped = { ...(createdInvoice as any), _approvedFromOrder: true, is_demo: approveInvoiceDiscount.type === 'demo' };
                setInvoices(prev => [stamped, ...prev]);
                setSelectedOrder(stamped as any);
            }
            toast({ title: t('common.success'), description: 'تم إنشاء الفاتورة بعد التعديل' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: 'فشل اعتماد الطلب بعد التعديل' });
        } finally {
            setApprovingId(null);
            setIsApproveEditOpen(false);
            setApproveEditingOrder(null);
        }
    };
    
    // New Collection State
    const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
    const [collectionClinic, setCollectionClinic] = useState('');
    const [collectionRep, setCollectionRep] = useState('');
    const [collectionOrder, setCollectionOrder] = useState('');
    const [collectionAmount, setCollectionAmount] = useState('');
    const [collectionDate, setCollectionDate] = useState<Date | undefined>(new Date());

    // New Debt State
    const [isNewDebtDialogOpen, setIsNewDebtDialogOpen] = useState(false);
    const [debtClinic, setDebtClinic] = useState('');
    const [debtRep, setDebtRep] = useState('');
    const [isDebtRepComboboxOpen, setIsDebtRepComboboxOpen] = useState(false);
    const [debtDate, setDebtDate] = useState<Date | undefined>(new Date());
    const [debtDueDate, setDebtDueDate] = useState<Date | undefined>(new Date());
    const [debtAmount, setDebtAmount] = useState('');
    const [debtDiscountType, setDebtDiscountType] = useState('none');
    const [debtDiscountValue, setDebtDiscountValue] = useState('');
    const [debtItems, setDebtItems] = useState<OrderItem[]>([]);
    
    // New Expense State
    const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
    const [expenseUser, setExpenseUser] = useState('');
    const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
    const [expenseCategory, setExpenseCategory] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseDescription, setExpenseDescription] = useState('');

    const handleGetSuggestions = async () => {
        if (!selectedCustomer) {
            toast({ variant: 'destructive', title: t('common.error'), description: 'يرجى اختيار العميل أولاً' });
            return;
        }

        setIsSuggestionLoading(true);
        setAiSuggestions(null);

        try {
            const customer = customers.find(c => c.id === selectedCustomer);
            if (!customer) throw new Error("العميل غير موجود");

            // استخدام تاريخ الطلبات للعميل إذا كان متاحاً
            const customerOrderHistory = orders
                .filter(o => (o as any).customerId === selectedCustomer || o.clinicName === customer.name)
                .map(o => ({
                    orderDate: o.orderDate,
                    items: o.items.map(item => ({ productName: item.productName, quantity: item.quantity })),
                }));

            // استخدام نوع العميل لتحديد نوع الاقتراحات
            const clinicType = customer.customer_type === 'vip' ? 'specialized' : 'general';
            const suggestions = await suggestInvoiceItems({
                clinicName: customer.name,
                orderHistory: customerOrderHistory,
            });

            setAiSuggestions(suggestions);
            if (suggestions.suggestedItems.length === 0) {
                 toast({ title: t('ai.no_suggestions'), description: 'لا توجد اقتراحات متاحة لهذا العميل حتى الآن' });
            }

        } catch (error) {
            console.error("Failed to get AI suggestions:", error);
            toast({ variant: 'destructive', title: t('common.error'), description: 'فشل الحصول على الاقتراحات' });
        } finally {
            setIsSuggestionLoading(false);
        }
    };
    
    const applyAiSuggestion = (suggestedItem: { productName: string; quantity: number; }) => {
        const product = initialProducts.find(p => p.name === suggestedItem.productName);
        if (product) {
            const newItem: OrderItem = {
                productId: product.id,
                productName: product.name,
                quantity: suggestedItem.quantity,
                price: product.price,
                unitPrice: product.price,
                total: product.price * suggestedItem.quantity
            };
            setInvoiceItems(prev => {
                const existing = prev.find(item => item.productId === newItem.productId);
                if (existing) {
                    return prev.map(item => item.productId === newItem.productId ? { ...item, quantity: item.quantity + newItem.quantity } : item);
                }
                return [...prev, newItem];
            });
            toast({ title: `Added ${suggestedItem.quantity}x ${suggestedItem.productName} to invoice.` });
        } else {
             toast({ variant: 'destructive', title: `Product "${suggestedItem.productName}" not found.` });
        }
    };

    const fmtDate = (d?: Date) => (d ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    
    const handleCreateInvoice = async () => {
        if (!selectedClinic) {
            toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.select_clinic') });
            return;
        }
        if (!selectedRep) {
            toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.select_rep') });
            return;
        }
        if (!paymentMethod) {
            toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.select_payment_method') });
            return;
        }
        if (invoiceItems.length === 0) {
            toast({ variant: 'destructive', title: t('accounting.errors.empty_invoice'), description: t('accounting.errors.add_products') });
            return;
        }

        const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let total = subtotal;
        if(discountType === 'percent' && discountValue) {
            total = subtotal - (subtotal * (parseFloat(discountValue) / 100));
        } else if (discountType === 'fixed' && discountValue) {
            total = subtotal - parseFloat(discountValue);
        }

        const clinic = initialClinics.find(c => c.id === selectedClinic);
        const rep = initialUsers.find(u => u.id === selectedRep);

        if(!clinic || !rep || !currentUser) return;
        
        // Create invoice via API
        try {
            const body = {
                client_name: clinic.name,
                amount: total.toFixed(2),
                invoice_date: fmtDate(new Date()),
                due_date: paymentMethod === 'credit' && dueDate ? fmtDate(dueDate) : fmtDate(new Date()),
                description: `Invoice for clinic ${clinic.name}`,
                status: 'pending',
                clinic_id: selectedClinic,
            };
            const res = await fetch('/api/accounting/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const created = await res.json();
            if (!res.ok) throw new Error(created?.error || 'Failed to create invoice');
            setInvoices(prev => [created, ...prev]);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: t('accounting.errors.failed_to_create_invoice') });
            return;
        }
        
        const newOrder: Order = {
            id: generateUUID(),
            clinicId: selectedClinic,
            clinicName: clinic.name,
            orderDate: new Date().toISOString(),
            items: invoiceItems,
            subtotal,
            total,
            totalAmount: total,
            representativeId: selectedRep,
            representativeName: rep.fullName,
            status: 'pending',
            paymentMethod: paymentMethod as 'cash' | 'bank_transfer' | 'deferred',
            paymentStatus: 'unpaid',
            createdAt: new Date().toISOString(),
            dueDate: paymentMethod === 'credit' ? dueDate?.toISOString() : undefined
        };

        await setOrders(prev => [newOrder, ...prev]);

        await logActivity({
            action: 'create_invoice',
            entity_type: 'invoice',
            entity_id: newOrder.id,
            title: `فاتورة جديدة: ${clinic.name}`,
details: `تم إنشاء فاتورة جديدة لعيادة ${clinic.name} بقيمة ${total.toFixed(2)} ج.م`,
            type: 'invoice_created'
        });
        
        toast({
            title: t('common.success'),
            description: t('accounting.invoice_created_successfully'),
        });
        
        // Reset form
        setSelectedClinic('');
        setSelectedRep('');
        setPaymentMethod('');
        setInvoiceItems([]);
        setAiSuggestions(null);
        setActiveInvoiceTab('view-invoices');
    };
    
    const handleSaveDebt = async () => {
        if (!debtClinic || !debtRep || !debtDate || !debtDueDate || debtItems.length === 0) {
           toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.fill_all_fields') });
           return;
       }

       const subtotal = debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
       let total = subtotal;
       if(debtDiscountType === 'percent' && debtDiscountValue) {
           total = subtotal - (subtotal * (parseFloat(debtDiscountValue) / 100));
       } else if (debtDiscountType === 'fixed' && debtDiscountValue) {
           total = subtotal - parseFloat(debtDiscountValue);
       }

       const clinic = initialClinics.find(c => c.id === debtClinic);
       const rep = initialUsers.find(u => u.id === debtRep);

       if(!clinic || !rep || !currentUser) return;
       
       const newDebtAsOrder: Order = {
           id: generateUUID(),
           clinicId: debtClinic,
           clinicName: clinic.name,
           orderDate: debtDate.toISOString(),
           items: debtItems,
           subtotal: debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
           total,
           totalAmount: total,
           representativeId: debtRep,
           representativeName: rep.fullName,
           status: 'pending',
           paymentMethod: 'deferred',
           paymentStatus: 'unpaid',
           createdAt: new Date().toISOString(),
           dueDate: debtDueDate.toISOString()
       };

       await setOrders(prev => [newDebtAsOrder, ...prev]);

       await logActivity({
           action: 'create_debt',
           entity_type: 'debt',
           entity_id: newDebtAsOrder.id,
           title: `دين جديد: ${clinic.name}`,
details: `تم تسجيل دين جديد لعيادة ${clinic.name} بقيمة ${total.toFixed(2)} ج.م`,
           type: 'debt_created'
       });
       
       toast({
           title: t('common.success'),
           description: t('accounting.debt_created_successfully'),
       });
       
       // Reset form
       setDebtClinic('');
       setDebtRep('');
       setDebtDate(new Date());
       setDebtDueDate(new Date());
       setDebtAmount('');
       setDebtItems([]);
       setDebtDiscountType('none');
       setDebtDiscountValue('');
       setIsNewDebtDialogOpen(false);
    };
    
    const handleSaveCollection = async () => {
         if (!collectionClinic || !collectionRep || !collectionAmount || !collectionDate || !collectionOrder) {
            toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.fill_all_fields') });
            return;
        }
        
        const clinic = initialClinics.find(c => c.id === collectionClinic);
        const rep = initialUsers.find(u => u.id === collectionRep);

        if(!clinic || !rep || !currentUser) return;

        // Create collection via API
        try {
            const body = {
                clinic_id: collectionClinic,
                amount: parseFloat(collectionAmount).toFixed(2),
                collection_date: fmtDate(collectionDate || new Date()),
                payment_method: 'cash',
                notes: `Collection for order ${collectionOrder}`,
            };
            const res = await fetch('/api/accounting/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const created = await res.json();
            if (!res.ok) throw new Error(created?.error || 'Failed to save collection');
            setCollectionsApi(prev => [created, ...prev]);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: t('accounting.errors.failed_to_save_collection') });
            return;
        }

        const newCollection: Collection = {
            id: generateUUID(),
            orderId: collectionOrder,
            clinicName: clinic.name,
            repName: rep.fullName,
            clinicId: collectionClinic,
            representativeId: collectionRep,
            paymentMethod: 'cash',
            collectionDate: collectionDate.toISOString(),
            amount: parseFloat(collectionAmount)
        };

        await setCollections(prev => [...prev, newCollection]);

        // Update order status if fully paid
        const order = orders.find(o => o.id === collectionOrder);
        if (order) {
            const totalPaid = collections.filter(c => c.orderId === collectionOrder).reduce((sum, c) => sum + c.amount, 0) + newCollection.amount;
            if (totalPaid >= order.total) {
                const updatedOrder = { ...order, status: 'delivered' as const };
                await setOrders(prev => prev.map(o => o.id === collectionOrder ? updatedOrder : o));
            }
        }
        
        await logActivity({
            action: 'create_collection',
            entity_type: 'collection',
            entity_id: newCollection.id,
            title: `تحصيل دفعة: ${clinic.name}`,
details: `تم تحصيل مبلغ ${newCollection.amount.toFixed(2)} ج.م من عيادة ${clinic.name}`,
            type: 'collection'
        });


        toast({ title: t('common.success'), description: t('accounting.collection_saved_successfully') });
        setIsCollectionDialogOpen(false);
        // Reset collection form
        setCollectionClinic('');
        setCollectionRep('');
        setCollectionOrder('');
        setCollectionAmount('');
        setCollectionDate(new Date());
    };
    
     const handleSaveExpense = async () => {
        if (!expenseUser || !expenseDate || !expenseCategory || !expenseAmount) {
            toast({ variant: 'destructive', title: t('accounting.errors.missing_fields'), description: t('accounting.errors.fill_all_fields') });
            return;
        }

        const user = initialUsers.find(u => u.id === expenseUser);
        if (!user) return;

        const newExpense: Expense = {
            id: generateUUID(),
            userId: user.id,
            userName: user.fullName,
            date: expenseDate.toISOString(),
            expenseDate: expenseDate.toISOString(),
            category: expenseCategory as any,
            amount: parseFloat(expenseAmount),
            description: expenseDescription,
            status: 'pending'
        };
        
        // Create expense via API
        try {
            const body = {
                description: expenseDescription,
                amount: parseFloat(expenseAmount).toFixed(2),
                category: expenseCategory,
                expense_date: fmtDate(expenseDate || new Date()),
                status: 'pending',
                notes: '',
            };
            const res = await fetch('/api/accounting/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const created = await res.json();
            if (!res.ok) throw new Error(created?.error || 'Failed to save expense');
            setExpensesApi(prev => [created, ...prev]);
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: t('accounting.errors.failed_to_save_expense') });
            return;
        }

        await setExpenses(prev => [...prev, newExpense]);
        toast({ title: t('common.success'), description: t('accounting.expenses.expense_saved_successfully') });

        // Reset form
        setExpenseUser('');
        setExpenseDate(new Date());
        setExpenseCategory('');
        setExpenseAmount('');
        setExpenseDescription('');
        setIsExpenseDialogOpen(false);
    };

    const totalOrders = invoices.length;
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.amount ?? inv.total_amount ?? 0), 0);
    const debts = invoices.filter(inv => (inv.status === 'overdue') || (inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== 'paid'));
    const totalDebts = debts.reduce((sum, inv) => sum + (inv.amount ?? inv.remaining_amount ?? 0), 0);
    const totalCollections = collectionsApi.reduce((sum, coll) => sum + (coll.amount ?? 0), 0);

    const handleCollectionClick = (collectionOrderId: string) => {
        const order = orders.find(o => o.id === collectionOrderId);
        if (order) {
            setSelectedOrder(order);
        } else {
            toast({ variant: 'destructive', title: t('common.error'), description: t('accounting.errors.invoice_not_found') });
        }
    };
    
    // Enhanced print functions
    const handlePrintInvoice = (invoice: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'تعذر فتح نافذة الطباعة' });
            return;
        }
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>فاتورة ${invoice.invoice_number || invoice.id}</title>
            </head>
            <body>
                <div id="invoice-content"></div>
                <script>
                    window.addEventListener('load', () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    });
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        
        // Render the invoice template in the new window
        const invoiceElement = document.createElement('div');
        printWindow.document.body.appendChild(invoiceElement);
        
        // This would need React rendering in the print window
        // For now, we'll use a simpler approach
        toast({ title: 'تم إعداد الطباعة', description: 'سيتم فتح نافذة الطباعة' });
    };
    
    const handleShowPrintPreview = (invoice: any) => {
        setSelectedOrder(invoice);
        setShowPrintPreview(true);
    };
    
    // Orders visible to accounting are only those approved by manager
    const managerApprovedOrders = orders.filter(o => o.status === 'approved');
    // Keep pending orders list for collections dialog
    const unpaidOrders = orders.filter(o => o.status === 'pending');

    // Approve order -> create invoice
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const handleApproveOrder = async (orderId: string, openInvoice: boolean = false) => {
        try {
            setApprovingId(orderId);
            const res = await fetch(`/api/orders/${orderId}/approve`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Failed to approve order');

            // Update local orders state to approved
            await setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'approved' as const } : o));

            // Add created invoice to invoices list (API returns { invoice })
            const createdInvoice = data?.invoice ?? (data?.id ? data : null);
            if (createdInvoice) {
                const stamped = { ...(createdInvoice as any), _approvedFromOrder: true };
                setInvoices(prev => [stamped, ...prev]);
                if (openInvoice) {
                    setSelectedOrder(stamped as any);
                }
            }

            toast({ title: t('common.success'), description: 'تم اعتماد الطلب كفاتورة بنجاح' });
        } catch (e) {
            console.error(e);
            toast({ variant: 'destructive', title: t('common.error'), description: 'فشل اعتماد الطلب كفاتورة' });
        } finally {
            setApprovingId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="mb-2">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <DollarSign className="text-primary" />
                            {t('accounting.title')}
                        </h1>
                        <p className="text-muted-foreground mt-1">{t('accounting.description')}</p>
                    </div>
                    {currentUser &&
                        <Card className="bg-card/70 text-center text-sm p-2">
                            <p className="text-muted-foreground">{t('accounting.current_user')}</p>
                            <p className="font-bold">{currentUser.username}</p>
                        </Card>
                    }
                </div>
            </header>

            <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
                <TabsList className="grid grid-cols-6 bg-muted/60 p-1 h-auto">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2"><BarChart />{t('accounting.tabs.dashboard')}</TabsTrigger>
                    <TabsTrigger value="invoices" className="flex items-center gap-2"><FileText />{t('accounting.tabs.invoices')}</TabsTrigger>
                    <TabsTrigger value="debts" className="flex items-center gap-2"><CreditCard />{t('accounting.tabs.debts')}</TabsTrigger>
                    <TabsTrigger value="collections" className="flex items-center gap-2"><HandCoins />{t('accounting.tabs.collections')}</TabsTrigger>
                    <TabsTrigger value="expenses" className="flex items-center gap-2"><Receipt/>{t('accounting.tabs.expenses')}</TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2"><BarChart />{t('accounting.tabs.reports')}</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                    <Card>
                        <CardHeader><CardTitle>{t('accounting.dashboard.title')}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard title={t('accounting.dashboard.total_invoices')} value={totalOrders.toString()} icon={FileText} isCurrency={false} />
                                <StatCard title={t('accounting.dashboard.total_sales')} value={totalSales.toLocaleString()} icon={DollarSign} />
                                <StatCard title={t('accounting.dashboard.total_debts')} value={totalDebts.toLocaleString()} icon={CreditCard} />
                                <StatCard title={t('accounting.dashboard.total_collections')} value={totalCollections.toLocaleString()} icon={HandCoins} />
                            </div>
                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <Card>
                                    <CardHeader><CardTitle>{t('accounting.dashboard.latest_invoices')}</CardTitle></CardHeader>
                                    <CardContent>
                                        {invoices.slice(0, 5).length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('common.clinic')}</TableHead>
                                                        <TableHead>{t('common.total')}</TableHead>
                                                        <TableHead>{t('common.status')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {invoices.slice(0, 5).map(order => (
                                                        <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                                            <TableCell>{order.clinicName || order.client_name || order?.clinics?.name || '-'}</TableCell>
                                                            <TableCell>{(order.amount ?? order.total_amount ?? 0).toFixed(2)} {t('common.egp')}</TableCell>
                                                             <TableCell><Badge variant={order.status === 'paid' ? 'secondary' : 'default'}>{t(`order_status.${order.status || 'pending'}`)}</Badge></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <p className="text-muted-foreground text-center py-4">{t('accounting.no_invoices_to_display')}</p>
                                        )}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>{t('accounting.dashboard.latest_debts')}</CardTitle></CardHeader>
                                     <CardContent>
                                        {debts.slice(0, 5).length > 0 ? (
                                             <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('common.clinic')}</TableHead>
                                                        <TableHead>{t('common.total')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {debts.slice(0, 5).map(order => (
                                                        <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                                            <TableCell>{order.clinicName}</TableCell>
                                                            <TableCell>{order.total.toFixed(2)} {t('common.egp')}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                           <p className="text-muted-foreground text-center py-4">{t('accounting.no_debts_to_display')}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invoices" className="mt-6">
                    <Tabs value={activeInvoiceTab} onValueChange={setActiveInvoiceTab}>
                        <div className="flex justify-between items-center mb-4">
                            <TabsList className="bg-muted/60 p-1 h-auto">
                                <TabsTrigger value="view-invoices">{t('accounting.invoices.view_invoices')}</TabsTrigger>
                                <TabsTrigger value="new-invoice" className="flex items-center gap-2"><PlusCircle className="h-4 w-4"/>{t('accounting.invoices.new_invoice')}</TabsTrigger>
                            </TabsList>
                             <div className="flex items-center gap-2">
                                <Input placeholder={t('accounting.invoices.search_placeholder')} />
                                <Button variant="outline">
                                    <Search className="ltr:ml-2 rtl:mr-2 h-4 w-4"/>
                                    {t('common.search')}
                                </Button>
                            </div>
                        </div>

                        <TabsContent value="view-invoices">
                            {/* Pending orders awaiting accounting approval */}
                            <Card className="mb-6">
                                <CardHeader>
                                    <CardTitle>طلبات قيد الاعتماد</CardTitle>
                                    <CardDescription>اعتماد الطلب وتحويله إلى فاتورة</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('common.clinic')}</TableHead>
                                                <TableHead>{t('common.order_date')}</TableHead>
                                                <TableHead>{t('common.total')}</TableHead>
                                                <TableHead>{t('common.status')}</TableHead>
                                                <TableHead className="text-right">{t('common.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {managerApprovedOrders.length > 0 ? managerApprovedOrders.map(o => (
                                                <TableRow key={o.id}>
                                                    <TableCell>{o.clinicName || initialClinics.find(c => c.id === o.clinicId)?.name || '-'}</TableCell>
                                                    <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                                                    <TableCell>{((o.total ?? o.totalAmount) || 0).toFixed(2)} {t('common.egp')}</TableCell>
                                                    <TableCell><Badge variant="secondary">{t('order_status.approved')}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" onClick={() => handleApproveOrder(o.id)} disabled={approvingId === o.id}>
                                                                {approvingId === o.id ? 'جارٍ الاعتماد...' : 'اعتماد مباشر'}
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => openApproveEdit(o)} disabled={approvingId === o.id}>
                                                                تحرير واعتماد
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">لا توجد طلبات معتمدة من المدير بانتظار التحويل إلى فاتورة</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                            {/* Existing invoices table */}
                            <Card>
                                <CardHeader><CardTitle>{t('accounting.invoices.all_invoices')}</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('common.invoice_no')}</TableHead>
                                                <TableHead>{t('common.clinic')}</TableHead>
                                                <TableHead>{t('common.order_date')}</TableHead>
                                                <TableHead>{t('common.total')}</TableHead>
                                                <TableHead>{t('common.status')}</TableHead>
                                                <TableHead className="text-right">{t('common.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoices.map(order => (
                                                <TableRow key={order.id}>
                                                    <TableCell>{String(order.id).slice(-6)}</TableCell>
                                                    <TableCell>{order.clinicName || order.client_name || order?.clinics?.name || '-'}</TableCell>
                                                    <TableCell>{new Date(order.invoice_date || order.created_at || Date.now()).toLocaleDateString()}</TableCell>
                                                    <TableCell>{(order.amount ?? order.total_amount ?? 0).toFixed(2)} {t('common.egp')}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.status === 'paid' ? 'secondary' : (order.status === 'pending' ? 'default' : 'destructive')}>{t(`order_status.${order.status || 'pending'}`)}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)}><Eye className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleShowPrintPreview(order)}><Printer className="h-4 w-4"/></Button>
                                                        <Button variant="ghost" size="icon" onClick={() => toast({ title: 'قريباً', description: 'سيتم إضافة تصدير PDF قريباً' })}><FileDown className="h-4 w-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="new-invoice">
                             <Card>
                                <CardHeader><CardTitle>{t('accounting.invoices.create_new_invoice')}</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <Popover open={isCustomerComboboxOpen} onOpenChange={setIsCustomerComboboxOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isCustomerComboboxOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedCustomer
                                                        ? customers.find((customer) => customer.id === selectedCustomer)?.name
                                                        : 'اختر العميل'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="البحث في العملاء..." />
                                                    <CommandEmpty>لا يوجد عملاء</CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {customers.map((customer) => (
                                                                <CommandItem
                                                                    key={customer.id}
                                                                    value={customer.name}
                                                                    onSelect={() => {
                                                                        setSelectedCustomer(customer.id);
                                                                        setIsCustomerComboboxOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{customer.name}</span>
                                                                        <span className="text-xs text-muted-foreground">كود: {customer.customer_code} | نوع: {customer.customer_type === 'vip' ? 'مميز' : customer.customer_type === 'wholesale' ? 'جملة' : 'عادي'}</span>
                                                                        {customer.phone && <span className="text-xs text-muted-foreground">{customer.phone}</span>}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Popover open={isRepComboboxOpen} onOpenChange={setIsRepComboboxOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={isRepComboboxOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedRep
                                                        ? salesRepresentatives.find((rep) => rep.id === selectedRep)?.name
                                                        : 'اختر المندوب'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command>
                                                    <CommandInput placeholder="البحث في المندوبين..." />
                                                    <CommandEmpty>لا يوجد مندوبين</CommandEmpty>
                                                    <CommandList>
                                                        <CommandGroup>
                                                            {salesRepresentatives.map((rep) => (
                                                                <CommandItem
                                                                    key={rep.id}
                                                                    value={rep.name}
                                                                    onSelect={() => {
                                                                        setSelectedRep(rep.id);
                                                                        setIsRepComboboxOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{rep.name}</span>
                                                                        <span className="text-xs text-muted-foreground">كود: {rep.rep_code} | قسم: {rep.department || 'غير محدد'}</span>
                                                                        <span className="text-xs text-muted-foreground">منطقة: {rep.region || 'غير محدد'} | عمولة: {rep.commission_rate}%</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue placeholder={t('common.payment_method')} /></SelectTrigger><SelectContent><SelectItem value="cash">{t('common.cash')}</SelectItem><SelectItem value="credit">{t('common.credit')}</SelectItem></SelectContent></Select>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-sm mb-2 block text-muted-foreground">{t('accounting.invoices.due_date')}</label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={paymentMethod !== 'credit'}>
                                                        <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                                        {dueDate ? format(dueDate, "PPP") : <span>{t('common.pick_a_date')}</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    {/* AI Suggestions Section */}
                                    <Card className="bg-muted/30">
                                        <CardHeader>
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-base flex items-center gap-2"><Bot/> {t('ai.invoice_assistant')}</CardTitle>
                                                <Button variant="outline" size="sm" onClick={handleGetSuggestions} disabled={!selectedCustomer || isSuggestionLoading}>
                                                     {isSuggestionLoading ? t('ai.analyzing') : t('ai.suggest_items')}
                                                </Button>
                                            </div>
                                        </CardHeader>
                                        {aiSuggestions && aiSuggestions.suggestedItems.length > 0 && (
                                            <CardContent>
                                                <p className="text-sm text-muted-foreground mb-4">{t('ai.suggestion_desc')}</p>
                                                <div className="space-y-3">
                                                    {aiSuggestions.suggestedItems.map((item, index) => (
                                                         <div key={index} className="flex items-center justify-between p-3 bg-background rounded-md">
                                                            <div>
                                                                <p className="font-semibold">{item.productName} {t('ai.suggested_quantity', { quantity: item.quantity })}</p>
                                                                <p className="text-xs text-muted-foreground">{item.reasoning}</p>
                                                            </div>
                                                            <Button size="sm" onClick={() => {
                                                                if (item.productName && item.quantity !== undefined) {
                                                                    applyAiSuggestion(item as { productName: string; quantity: number; });
                                                                }
                                                            }}>{t('ai.add_to_order')}</Button>
                                                         </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>

                                    <Card>
                                        <CardHeader><CardTitle className="text-base">{t('accounting.invoices.invoice_items')}</CardTitle></CardHeader>
                                        <CardContent>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('common.product')}</TableHead>
                                                        <TableHead className="text-center">{t('common.quantity')}</TableHead>
                                                        <TableHead className="text-center">{t('common.price')}</TableHead>
                                                        <TableHead className="text-right">{t('common.total')}</TableHead>
                                                        <TableHead className="w-20"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {invoiceItems.length > 0 ? (
                                                        invoiceItems.map((item, index) => (
                                                             <TableRow key={item.productId || index}>
                                                                <TableCell>
                                                                    <div>
                                                                        <div className="font-medium">{item.productName}</div>
                                                                        {/* Show product details if available */}
                                                                        {initialProducts.find(p => p.id === item.productId)?.category && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {initialProducts.find(p => p.id === item.productId)?.category}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={() => {
                                                                                if (item.quantity > 1) {
                                                                                    setInvoiceItems(prev => prev.map((prevItem, prevIndex) => 
                                                                                        prevIndex === index 
                                                                                            ? { ...prevItem, quantity: prevItem.quantity - 1 }
                                                                                            : prevItem
                                                                                    ));
                                                                                }
                                                                            }}
                                                                            disabled={item.quantity <= 1}
                                                                            className="h-6 w-6 p-0"
                                                                        >
                                                                            -
                                                                        </Button>
                                                                        <Input
                                                                            type="number"
                                                                            value={item.quantity}
                                                                            onChange={(e) => {
                                                                                const newQuantity = Math.max(1, parseInt(e.target.value) || 1);
                                                                                setInvoiceItems(prev => prev.map((prevItem, prevIndex) => 
                                                                                    prevIndex === index 
                                                                                        ? { ...prevItem, quantity: newQuantity }
                                                                                        : prevItem
                                                                                ));
                                                                            }}
                                                                            className="w-16 text-center h-8"
                                                                            min="1"
                                                                        />
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            onClick={() => {
                                                                                setInvoiceItems(prev => prev.map((prevItem, prevIndex) => 
                                                                                    prevIndex === index 
                                                                                        ? { ...prevItem, quantity: prevItem.quantity + 1 }
                                                                                        : prevItem
                                                                                ));
                                                                            }}
                                                                            className="h-6 w-6 p-0"
                                                                        >
                                                                            +
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Input
                                                                        type="number"
                                                                        value={item.price.toFixed(2)}
                                                                        onChange={(e) => {
                                                                            const newPrice = Math.max(0, parseFloat(e.target.value) || 0);
                                                                            setInvoiceItems(prev => prev.map((prevItem, prevIndex) => 
                                                                                prevIndex === index 
                                                                                    ? { ...prevItem, price: newPrice }
                                                                                    : prevItem
                                                                            ));
                                                                        }}
                                                                        className="w-24 text-center h-8"
                                                                        min="0"
                                                                        step="0.01"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    {(item.price * item.quantity).toFixed(2)} ج.م
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        onClick={() => {
                                                                            setInvoiceItems(prev => prev.filter((_, prevIndex) => prevIndex !== index));
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <Receipt className="h-12 w-12 text-muted-foreground/50" />
                                                                    <div>
                                                                        <p className="font-medium">{t('accounting.invoices.add_products_to_invoice')}</p>
                                                                        <p className="text-xs text-muted-foreground">استخدم القائمة أعلاه لإضافة منتجات إلى الفاتورة</p>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                    {/* Summary row if there are items */}
                                                    {invoiceItems.length > 0 && (
                                                        <TableRow className="border-t-2 bg-muted/50">
                                                            <TableCell className="font-medium">الإجمالي الفرعي</TableCell>
                                                            <TableCell className="text-center font-medium">
                                                                {invoiceItems.reduce((sum, item) => sum + item.quantity, 0)}
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                            <TableCell className="text-right font-bold text-lg">
                                                                {invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} ج.م
                                                            </TableCell>
                                                            <TableCell></TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                            <div className="flex gap-2 mt-4">
                                                <Select 
                                                    value="" 
                                                    onValueChange={(productId) => {
                                                        const product = initialProducts.find(p => p.id === productId);
                                                        if(product) {
                                                            const existingItem = invoiceItems.find(item => item.productId === product.id);
                                                            if (existingItem) {
                                                                setInvoiceItems(prev => prev.map(item => 
                                                                    item.productId === product.id 
                                                                        ? { ...item, quantity: item.quantity + 1 }
                                                                        : item
                                                                ));
                                                            } else {
                                                                const newItem: OrderItem = {
                                                                    productId: product.id,
                                                                    productName: product.name,
                                                                    quantity: 1,
                                                                    price: product.price,
                                                                    unitPrice: product.price,
                                                                    total: product.price * 1
                                                                };
                                                                setInvoiceItems(prev => [...prev, newItem]);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="اختر منتج للإضافة" />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-64">
                                                        {initialProducts.length === 0 ? (
                                                            <SelectItem value="no-products" disabled>
                                                                لا توجد منتجات متاحة
                                                            </SelectItem>
                                                        ) : (
                                                            initialProducts.map(product => (
                                                                <SelectItem key={product.id} value={product.id}>
                                                                    <div className="flex justify-between items-center w-full">
                                                                        <div>
                                                                            <div className="font-medium">{product.name}</div>
                                                                            <div className="text-sm text-muted-foreground">
                                                                                {product.category || 'غير مصنف'} - متوفر: {product.stock || 0}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-sm font-semibold text-green-600">
                                                                            {product.price.toFixed(2)} ج.م
                                                                        </div>
                                                                    </div>
                                                                </SelectItem>
                                                            ))
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <Button 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        // Add a quick sample product for testing
                                                        if (initialProducts.length > 0) {
                                                            const randomProduct = initialProducts[Math.floor(Math.random() * initialProducts.length)];
                                                            const newItem: OrderItem = {
                                                                productId: randomProduct.id,
                                                                productName: randomProduct.name,
                                                                quantity: 1,
                                                                price: randomProduct.price,
                                                                unitPrice: randomProduct.price,
                                                                total: randomProduct.price * 1
                                                            };
                                                            setInvoiceItems(prev => [...prev, newItem]);
                                                        } else {
                                                            // Fallback for demo when no products are loaded
                                                            const demoProduct = {
                                                                productId: `demo-${Date.now()}`,
                                                                productName: 'منتج تجريبي',
                                                                quantity: 1,
                                                                price: 50.00,
                                                                unitPrice: 50.00,
                                                                total: 50.00
                                                            };
                                                            setInvoiceItems(prev => [...prev, demoProduct]);
                                                        }
                                                    }}
                                                    size="sm"
                                                >
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Enhanced Discount System */}
                                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                                        <CardHeader>
                                            <CardTitle className="text-base flex items-center gap-2 text-green-700">
                                                <Zap className="h-4 w-4" />
                                                نظام الخصومات المتقدم
                                            </CardTitle>
                                            <CardDescription className="text-green-600">
                                                يمكنك إضافة خصومات على مستوى الفاتورة أو بنود معينة
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid md:grid-cols-4 gap-4">
                                                <div className="space-y-2">
                                                    <Label>نوع الخصم</Label>
                                                    <Select value={discountType} onValueChange={setDiscountType}>
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="اختر نوع الخصم" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                <div className="flex items-center gap-2">
                                                                    <X className="h-4 w-4" />
                                                                    بدون خصم
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="percent">
                                                                <div className="flex items-center gap-2">
                                                                    <BarChart3 className="h-4 w-4" />
                                                                    خصم بالنسبة %
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="fixed">
                                                                <div className="flex items-center gap-2">
                                                                    <DollarSign className="h-4 w-4" />
                                                                    مبلغ ثابت
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="demo">
                                                                <div className="flex items-center gap-2">
                                                                    <Gift className="h-4 w-4" />
                                                                    عينة مجانية (ديمو)
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>قيمة الخصم</Label>
                                                    <Input 
                                                        placeholder={discountType === 'percent' ? 'نسبة مئوية' : discountType === 'fixed' ? 'مبلغ' : 'قيمة الخصم'} 
                                                        type="number" 
                                                        value={discountValue} 
                                                        onChange={e => setDiscountValue(e.target.value)} 
                                                        disabled={discountType === 'none' || discountType === 'demo'}
                                                        className="bg-white"
                                                        min="0"
                                                        max={discountType === 'percent' ? '100' : undefined}
                                                    />
                                                    {discountType === 'percent' && (
                                                        <p className="text-xs text-muted-foreground">
                                                            أدخل رقم بين 0 و 100
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>معاينة الخصم</Label>
                                                    <div className="p-3 bg-white rounded-md border">
                                                        {(() => {
                                                            const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                            let discountAmount = 0;
                                                            if (discountType === 'percent' && discountValue) {
                                                                discountAmount = subtotal * (parseFloat(discountValue) / 100);
                                                            } else if (discountType === 'fixed' && discountValue) {
                                                                discountAmount = parseFloat(discountValue);
                                                            } else if (discountType === 'demo') {
                                                                discountAmount = subtotal;
                                                            }
                                                            return (
                                                                <div className="text-center">
                                                                    <p className="text-sm text-red-600 font-medium">
                                                                        -{discountAmount.toFixed(2)} ج.م
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        قيمة الخصم
                                                                    </p>
                                                                </div>
                                                            );
                                                        })()} 
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>الإجمالي النهائي</Label>
                                                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md">
                                                        {(() => {
                                                            const subtotal = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                                                            let total = subtotal;
                                                            if (discountType === 'percent' && discountValue) {
                                                                total = subtotal - (subtotal * (parseFloat(discountValue) / 100));
                                                            } else if (discountType === 'fixed' && discountValue) {
                                                                total = subtotal - parseFloat(discountValue);
                                                            } else if (discountType === 'demo') {
                                                                total = 0;
                                                            }
                                                            return (
                                                                <div className="text-center">
                                                                    <p className="text-lg font-bold">
                                                                        {Math.max(0, total).toFixed(2)} ج.م
                                                                    </p>
                                                                    <p className="text-xs opacity-90">
                                                                        بعد الخصم
                                                                    </p>
                                                                    {discountType === 'demo' && (
                                                                        <p className="text-xs bg-yellow-500/20 text-yellow-100 px-2 py-1 rounded mt-1">
                                                                            فاتورة تجريبية
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()} 
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Quick Discount Buttons */}
                                            <div className="flex flex-wrap gap-2">
                                                <p className="text-sm text-muted-foreground self-center">خصومات سريعة:</p>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('percent');
                                                        setDiscountValue('5');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    5%
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('percent');
                                                        setDiscountValue('10');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    10%
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('percent');
                                                        setDiscountValue('15');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    15%
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('fixed');
                                                        setDiscountValue('50');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    50 ج.م
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('fixed');
                                                        setDiscountValue('100');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    100 ج.م
                                                </Button>
                                                <Button 
                                                    type="button"
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => {
                                                        setDiscountType('demo');
                                                        setDiscountValue('');
                                                    }}
                                                    className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                                                >
                                                    <Gift className="h-3 w-3 mr-1" />
                                                    ديمو
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex justify-between items-center pt-4 border-t">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">معاينة الفاتورة</p>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span>عدد البنود: {invoiceItems.length}</span>
                                                <span>إجمالي الكمية: {invoiceItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                                                <span>الإجمالي قبل الخصم: {invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} ج.م</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button 
                                                variant="outline" 
                                                onClick={() => {
                                                    setSelectedClinic('');
                                                    setSelectedRep('');
                                                    setPaymentMethod('');
                                                    setInvoiceItems([]);
                                                    setDiscountType('none');
                                                    setDiscountValue('');
                                                    setAiSuggestions(null);
                                                }}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                إعادة تعيين
                                            </Button>
                                            <Button 
                                                size="lg" 
                                                onClick={handleCreateInvoice}
                                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                                                disabled={!selectedClinic || !selectedRep || invoiceItems.length === 0}
                                            >
                                                <PlusCircle className="h-4 w-4 mr-2" />
                                                {t('accounting.invoices.create_invoice')}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="debts" className="mt-6">
                    <Card>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{t('accounting.debts.title')}</CardTitle>
                                    <CardDescription>{t('accounting.debts.description')}</CardDescription>
                                </div>
                                <Button onClick={() => setIsNewDebtDialogOpen(true)}>
                                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                    {t('accounting.debts.add_new_debt')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.invoice_no')}</TableHead>
                                        <TableHead>{t('common.clinic')}</TableHead>
                                        <TableHead>{t('common.due_date')}</TableHead>
                                        <TableHead>{t('common.total_amount')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.length > 0 ? debts.map(debt => (
                                        <TableRow key={debt.id}>
                                            <TableCell className="font-medium">#{debt.id.slice(-6)}</TableCell>
                                            <TableCell>{debt.clinicName}</TableCell>
                                            <TableCell>{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell>{debt.total.toFixed(2)} {t('common.egp')}</TableCell>
                                            <TableCell>
                                                 <Badge variant="destructive">{t('accounting.debts.due')}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(debt)}>
                                                    <Eye className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>
                                                    {t('common.view_details')}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">
                                                {t('accounting.debts.no_current_debts')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="collections" className="mt-6">
                     <Card>
                        <CardHeader>
                           <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{t('accounting.collections.title')}</CardTitle>
                                    <CardDescription>{t('accounting.collections.description')}</CardDescription>
                                </div>
                                <Button onClick={() => setIsCollectionDialogOpen(true)}>
                                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                    {t('accounting.collections.new_collection')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-3 gap-6">
                               <StatCard title={t('accounting.collections.total_collected')} value={totalCollections.toLocaleString()} icon={HandCoins} />
                               <StatCard title={t('accounting.collections.due_amounts')} value={totalDebts.toLocaleString()} icon={CreditCard} />
                               <StatCard title={t('accounting.collections.avg_collection_days')} value="15" icon={CalendarCheck} isCurrency={false} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('common.invoice_no')}</TableHead>
                                        <TableHead>{t('common.clinic')}</TableHead>
                                        <TableHead>{t('common.rep')}</TableHead>
                                        <TableHead>{t('common.collection_date')}</TableHead>
                                        <TableHead className="text-right">{t('common.amount')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {collectionsApi.length > 0 ? collectionsApi.map(coll => (
                                        <TableRow key={coll.id}>
                                            <TableCell className="font-medium">{coll.invoice_id ? `#${String(coll.invoice_id).slice(-6)}` : '-'}</TableCell>
                                            <TableCell>{coll.clinicName || coll?.clinics?.name || '-'}</TableCell>
                                            <TableCell>{coll.repName || coll?.users?.full_name || '-'}</TableCell>
                                            <TableCell>{new Date(coll.collection_date || coll.created_at || Date.now()).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">{(coll.amount ?? 0).toFixed(2)} {t('common.egp')}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24">
                                                {t('accounting.collections.no_collections')}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                 <TabsContent value="expenses" className="mt-6">
                    <Card>
                        <CardHeader>
                           <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>{t('accounting.expenses.title')}</CardTitle>
                                    <CardDescription>{t('accounting.expenses.description')}</CardDescription>
                                </div>
                                <Button onClick={() => setIsExpenseDialogOpen(true)}>
                                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                    {t('accounting.expenses.new_expense')}
                                </Button>
                            </div>
                        </CardHeader>
                         <CardContent>
                             <Table>
                                 <TableHeader>
                                     <TableRow>
                                         <TableHead>{t('common.date')}</TableHead>
                                         <TableHead>{t('common.user')}</TableHead>
                                         <TableHead>{t('common.category')}</TableHead>
                                         <TableHead>{t('accounting.expenses.description')}</TableHead>
                                         <TableHead className="text-right">{t('common.amount')}</TableHead>
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
{expensesApi.length > 0 ? expensesApi.map(exp => (
                                         <TableRow key={exp.id}>
<TableCell>{new Date((exp as any).expense_date || (exp as any).created_at || Date.now()).toLocaleDateString()}</TableCell>
<TableCell>{(exp as any).userName || (exp as any)?.created_user?.full_name || '-'}</TableCell>
                                             <TableCell><Badge variant="outline">{t(`accounting.expenses.categories.${(exp as any).category || 'other'}`)}</Badge></TableCell>
                                             <TableCell>{exp.description}</TableCell>
                                             <TableCell className="text-right font-medium">{(((exp as any).amount ?? 0) as number).toFixed(2)} {t('common.egp')}</TableCell>
                                         </TableRow>
                                     )) : (
                                         <TableRow>
                                             <TableCell colSpan={5} className="text-center h-24">
                                                 {t('accounting.expenses.no_expenses')}
                                             </TableCell>
                                         </TableRow>
                                     )}
                                 </TableBody>
                             </Table>
                         </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="mt-6">
                    {isLoadingData && (
                        <Card className="mb-4">
                            <CardContent className="pt-6">
                                <p className="text-muted-foreground">Loading accounting data...</p>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader><CardTitle>{t('accounting.reports_title')}</CardTitle></CardHeader>
                        <CardContent><p className="text-muted-foreground text-center py-8">{t('accounting.reports_placeholder')}</p></CardContent>
                    </Card>
                </TabsContent>

            </Tabs>

             <Dialog open={!!selectedOrder} onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}>
                <DialogContent className="max-w-4xl p-0">
                    {selectedOrder && (
                        <>
                         <DialogHeader className="p-6 flex flex-row items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl mb-1">{t('common.invoice_details')} #{String((selectedOrder as any).id).slice(-6)}{' '}
                                    <Badge variant={(selectedOrder as any).status === 'paid' ? 'secondary' : ((selectedOrder as any).status === 'pending' ? 'default' : 'destructive')}>
                                        {t(`order_status.${(selectedOrder as any).status || 'pending'}`)}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription>
                                    {t('common.creation_date')}: {new Date((selectedOrder as any).invoice_date || (selectedOrder as any).orderDate || (selectedOrder as any).created_at || Date.now()).toLocaleString()}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
{((selectedOrder as any).status === 'confirmed') && !(selectedOrder as any).invoice_number && (
                                    <Button onClick={() => handleApproveOrder((selectedOrder as any).id, true)} disabled={approvingId === (selectedOrder as any).id}>
                                        {approvingId === (selectedOrder as any).id ? 'جارٍ الاعتماد...' : 'اعتماد كفاتورة'}
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => handleShowPrintPreview(selectedOrder)}><Printer className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('common.print')}</Button>
                                <Button variant="outline"><FileDown className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>{t('common.save_pdf')}</Button>
                                {(((selectedOrder as any).invoice_number || (selectedOrder as any).client_name || typeof (selectedOrder as any).amount !== 'undefined') && (selectedOrder as any).status === 'pending') && (
                                    <>
                                        <Button variant="secondary" onClick={() => setIsEditInvoiceOpen(true)}>تعديل الفاتورة</Button>
                                        <Button variant="outline" onClick={openEditItems}>تعديل البنود</Button>
                                    </>
                                )}
                                <DialogClose asChild>
                                    <Button variant="ghost" size="icon"><X className="h-5 w-5"/></Button>
                                </DialogClose>
                            </div>
                         </DialogHeader>
                         <div ref={printAreaRef} className="px-6 pb-6 space-y-6" style={{ position: 'relative' }}>
                             {(() => {
                                 const obj: any = selectedOrder as any;
                                 const isInvoice = !!(obj?.invoice_number || obj?.client_name || typeof obj?.amount !== 'undefined');
                                 const isDemo = !!(obj?.is_demo || (typeof obj?.amount === 'number' && obj.amount === 0) || (typeof obj?.description === 'string' && obj.description.includes('[DEMO]')));
                                 const status = obj?.status || 'pending';
                                 let text = '';
                                 if (isDemo && isInvoice) {
                                     text = 'فاتورة ديمو - مجاناً';
                                 } else if (obj?._approvedFromOrder) {
                                     text = 'معتمدة كفاتورة';
                                 } else if (isInvoice) {
                                     if (status === 'paid') text = 'مدفوعة';
                                     else if (status === 'overdue') text = 'متأخرة';
                                     else text = 'في انتظار الموافقة';
                                 } else {
                                     if (status === 'confirmed') text = 'تم الاعتماد';
                                     else text = 'طلب بانتظار الاعتماد';
                                 }
                                 return (
                                     <div style={{ position: 'absolute', top: '12px', left: '12px', padding: '6px 10px', border: '2px solid #666', color: '#666', fontWeight: 700, fontSize: '14px', transform: 'rotate(-6deg)', opacity: 0.75, zIndex: 10 }}>
                                         {text}
                                     </div>
                                 );
                             })()}
                             <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="flex-row items-center gap-2 pb-2">
                                        <Building className="h-5 w-5 text-primary"/>
                                        <CardTitle className="text-base">{t('common.clinic_info')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1 text-muted-foreground">
                                        <p><span className="font-semibold text-foreground">{t('common.clinic')}:</span> {((selectedOrder as any).clinicName || (selectedOrder as any).client_name || (selectedOrder as any)?.clinics?.name || '-')}</p>
                                        <p><span className="font-semibold text-foreground">{t('common.address')}:</span> {initialClinics.find(c => c.id === (selectedOrder as any).clinicId)?.address || (selectedOrder as any)?.clinics?.address || t('common.not_available')}</p>
                                    </CardContent>
                                </Card>
                               <Card>
                                    <CardHeader className="flex-row items-center gap-2 pb-2">
                                        <UserIcon className="h-5 w-5 text-primary"/>
                                        <CardTitle className="text-base">{t('common.responsible_info')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-1 text-muted-foreground">
                                       <p><span className="font-semibold text-foreground">{t('common.rep')}:</span> {t('common.not_specified')}</p>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className="flex-row items-center gap-2 pb-2">
                                        <Wallet className="h-5 w-5 text-primary"/>
                                        <CardTitle className="text-base">{t('common.financial_summary')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-2">
                                        <div className="flex justify-between"><span>{t('common.subtotal')}</span><span>{(((selectedOrder as any).total ?? (selectedOrder as any).amount ?? (selectedOrder as any).total_amount ?? 0) as number).toFixed(2)} {t('common.egp')}</span></div>
                                        <div className="flex justify-between"><span>{t('common.discount')} (0%)</span><span>0.00 {t('common.egp')}</span></div>
                                        <Separator/>
                                        <div className="flex justify-between font-bold text-base"><span>{t('common.total')}</span><span>{(((selectedOrder as any).total ?? (selectedOrder as any).amount ?? (selectedOrder as any).total_amount ?? 0) as number).toFixed(2)} {t('common.egp')}</span></div>
                                    </CardContent>
                                </Card>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">{t('common.items')}</h3>
                                <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>{t('common.product')}</TableHead>
                                            <TableHead>{t('common.quantity')}</TableHead>
                                            <TableHead>{t('common.unit_price')}</TableHead>
                                            <TableHead className="text-right">{t('common.total')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(((selectedOrder as any).items) || []).map((item: any) => (
                                        <TableRow key={item.productId}>
                                            <TableCell>{item.productName}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{item.price.toFixed(2)} {t('common.egp')}</TableCell>
                                            <TableCell className="text-right">{(item.quantity * item.price).toFixed(2)} {t('common.egp')}</TableCell>
                                        </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </div>
                         </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Approve-with-edit dialog */}
            <Dialog open={isApproveEditOpen} onOpenChange={setIsApproveEditOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>تحرير الطلب قبل الاعتماد</DialogTitle>
                        <DialogDescription>يمكنك تعديل الكميات والخصومات، أو تعيين الفاتورة كـ ديمو (مجانية)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('common.product')}</TableHead>
                                    <TableHead>{t('common.quantity')}</TableHead>
                                    <TableHead>{t('common.price')}</TableHead>
                                    <TableHead>خصم البند</TableHead>
                                    <TableHead className="text-right">{t('common.total')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {approveItems.map((it, idx) => {
                                    const lineTotal = (() => {
                                        const d = (it as any).discount as any;
                                        let lt = it.price * it.quantity;
                                        if (d && d.type && d.type !== 'none' && d.value) {
                                            const v = parseFloat(d.value)||0;
                                            if (d.type==='percent') lt = Math.max(0, lt - lt*(v/100));
                                            if (d.type==='fixed') lt = Math.max(0, lt - v);
                                        }
                                        return lt;
                                    })();
                                    return (
                                        <TableRow key={it.productId}>
                                            <TableCell>{it.productName}</TableCell>
                                            <TableCell>
                                                <Input type="number" value={it.quantity} onChange={e => {
                                                    const v = Math.max(0, parseInt(e.target.value||'0', 10));
                                                    setApproveItems(prev => prev.map((x,i)=> i===idx ? { ...x, quantity: v } : x));
                                                }} />
                                            </TableCell>
                                            <TableCell>{it.price.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Select value={(it as any).discount?.type || 'none'} onValueChange={(val)=>{
                                                        setApproveItems(prev => prev.map((x,i)=> i===idx ? { ...x, discount: { type: val as any, value: (x as any).discount?.value || '' } } : x));
                                                    }}>
                                                        <SelectTrigger className="w-28"><SelectValue placeholder="لا يوجد"/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">لا يوجد</SelectItem>
                                                            <SelectItem value="percent">نسبة %</SelectItem>
                                                            <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input type="number" placeholder="0" value={(it as any).discount?.value || ''} onChange={e=>{
                                                        const v = e.target.value;
                                                        setApproveItems(prev => prev.map((x,i)=> i===idx ? { ...x, discount: { type: ((x as any).discount?.type||'none'), value: v } } : x));
                                                    }} className="w-24" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{lineTotal.toFixed(2)} {t('common.egp')}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <div className="grid md:grid-cols-3 gap-3 items-end">
                            <div className="col-span-2 flex items-center gap-2">
                                <Select value={approveInvoiceDiscount.type} onValueChange={v => setApproveInvoiceDiscount(prev => ({ ...prev, type: v as any }))}>
                                    <SelectTrigger className="w-48"><SelectValue placeholder="خصم الفاتورة"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">بدون خصم</SelectItem>
                                        <SelectItem value="percent">نسبة %</SelectItem>
                                        <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                        <SelectItem value="demo">ديمو (مجاناً)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input type="number" placeholder="0" disabled={approveInvoiceDiscount.type==='none' || approveInvoiceDiscount.type==='demo'} value={approveInvoiceDiscount.value} onChange={e=> setApproveInvoiceDiscount(prev => ({ ...prev, value: e.target.value }))} className="w-32"/>
                            </div>
                            <div className="text-right">
                                {(() => { const { subtotal, total } = computeApproveTotals(); return (
                                    <div className="space-y-1">
                                        <div className="text-sm text-muted-foreground">الإجمالي قبل الخصم: {subtotal.toFixed(2)} {t('common.egp')}</div>
                                        <div className="text-base font-bold">الإجمالي النهائي: {total.toFixed(2)} {t('common.egp')}</div>
                                    </div>
                                ); })()}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApproveEditOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleApproveWithEdits}>اعتماد وإنشاء فاتورة</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit-invoice dialog */}
            <Dialog open={isEditInvoiceOpen} onOpenChange={setIsEditInvoiceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل الفاتورة</DialogTitle>
                        <DialogDescription>يمكن تعديل خصم الفاتورة أو جعلها ديمو (مجانية)</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-end gap-2">
                        <Select value={editInvoiceDiscount.type} onValueChange={v => setEditInvoiceDiscount(prev => ({ ...prev, type: v as any }))}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="نوع الخصم"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">بدون خصم</SelectItem>
                                <SelectItem value="percent">نسبة %</SelectItem>
                                <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                <SelectItem value="demo">ديمو (مجاناً)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input type="number" placeholder="0" disabled={editInvoiceDiscount.type==='none' || editInvoiceDiscount.type==='demo'} value={editInvoiceDiscount.value} onChange={e=> setEditInvoiceDiscount(prev => ({ ...prev, value: e.target.value }))} className="w-32"/>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditInvoiceOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={async () => {
                            try {
                                if (!selectedOrder) return;
                                const base = Number(((selectedOrder as any).amount ?? (selectedOrder as any).total_amount ?? 0) as number);
                                let newAmount = base;
                                if (editInvoiceDiscount.type === 'percent') newAmount = Math.max(0, base - base * ((parseFloat(editInvoiceDiscount.value)||0)/100));
                                else if (editInvoiceDiscount.type === 'fixed') newAmount = Math.max(0, base - (parseFloat(editInvoiceDiscount.value)||0));
                                else if (editInvoiceDiscount.type === 'demo') newAmount = 0;
                                const desc = String((selectedOrder as any).description || '') + (editInvoiceDiscount.type==='demo' ? ' [DEMO]' : '');
                                const res = await fetch(`/api/accounting/invoices/${(selectedOrder as any).id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: newAmount, description: desc }) });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error || 'Failed');
                                setInvoices(prev => prev.map(inv => inv.id === (selectedOrder as any).id ? data : inv));
                                setSelectedOrder(data as any);
                                setIsEditInvoiceOpen(false);
                                toast({ title: t('common.success'), description: 'تم تحديث الفاتورة' });
                            } catch (e) {
                                console.error(e);
                                toast({ variant: 'destructive', title: t('common.error'), description: 'فشل تحديث الفاتورة' });
                            }
                        }}>حفظ التعديلات</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit-invoice-items dialog */}
            <Dialog open={isEditItemsOpen} onOpenChange={setIsEditItemsOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>تعديل بنود الفاتورة</DialogTitle>
                        <DialogDescription>يمكن تعديل أسماء البنود والكميات والأسعار والخصوم</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>البند</TableHead>
                                    <TableHead>{t('common.quantity')}</TableHead>
                                    <TableHead>{t('common.unit_price')}</TableHead>
                                    <TableHead>خصم</TableHead>
                                    <TableHead className="text-right">{t('common.total')}</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {editItems.map((it:any, idx:number) => {
                                    const q = Math.max(0, Number(it.quantity)||0);
                                    const p = Math.max(0, Number(it.unit_price)||0);
                                    const d = it.discount || { type: 'none', value: '' };
                                    let lt = p*q;
                                    if (d.type==='percent' && d.value) lt = Math.max(0, lt - lt*((parseFloat(d.value)||0)/100));
                                    if (d.type==='fixed' && d.value) lt = Math.max(0, lt - (parseFloat(d.value)||0));
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <Input value={it.item_name} onChange={e=> setEditItems(prev => prev.map((x,i)=> i===idx ? { ...x, item_name: e.target.value } : x))} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" value={it.quantity} onChange={e=> setEditItems(prev => prev.map((x,i)=> i===idx ? { ...x, quantity: e.target.value } : x))} />
                                            </TableCell>
                                            <TableCell>
                                                <Input type="number" value={it.unit_price} onChange={e=> setEditItems(prev => prev.map((x,i)=> i===idx ? { ...x, unit_price: e.target.value } : x))} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Select value={d.type} onValueChange={(val)=> setEditItems(prev => prev.map((x,i)=> i===idx ? { ...x, discount: { type: val as any, value: d.value } } : x))}>
                                                        <SelectTrigger className="w-28"><SelectValue placeholder="لا يوجد"/></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">لا يوجد</SelectItem>
                                                            <SelectItem value="percent">نسبة %</SelectItem>
                                                            <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input type="number" placeholder="0" value={d.value} onChange={e => setEditItems(prev => prev.map((x,i)=> i===idx ? { ...x, discount: { type: d.type, value: e.target.value } } : x))} className="w-24" disabled={d.type==='none'} />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">{lt.toFixed(2)} {t('common.egp')}</TableCell>
                                            <TableCell className="text-right"><Button variant="destructive" size="sm" onClick={()=>removeEditItemRow(idx)}>حذف</Button></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <div className="flex justify-between items-center">
                            <Button variant="outline" onClick={addEditItemRow}><PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4"/>إضافة بند</Button>
                            <div className="text-right text-sm text-muted-foreground">الإجمالي قبل الخصم الإجمالي: {computeEditItemsTotals().subtotal.toFixed(2)} {t('common.egp')}</div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditItemsOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={saveEditItems}>حفظ البنود</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('accounting.collections.new_collection_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('accounting.collections.new_collection_dialog_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="collection-clinic">{t('common.clinic')}</Label>
                            <Select value={collectionClinic} onValueChange={setCollectionClinic}>
                                <SelectTrigger id="collection-clinic"><SelectValue placeholder={t('common.select_clinic')} /></SelectTrigger>
                                <SelectContent>{initialClinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="collection-rep">{t('common.rep')}</Label>
                            <Select value={collectionRep} onValueChange={setCollectionRep}>
                                <SelectTrigger id="collection-rep"><SelectValue placeholder={t('common.select_rep')} /></SelectTrigger>
                                <SelectContent>{initialUsers.filter(u => u.role === 'medical_rep').map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="collection-order">{t('common.related_invoice')}</Label>
                            <Select value={collectionOrder} onValueChange={setCollectionOrder} disabled={!collectionClinic}>
                                <SelectTrigger id="collection-order"><SelectValue placeholder={t('common.select_invoice')} /></SelectTrigger>
                                <SelectContent>
                                    {unpaidOrders.filter(o => o.clinicId === collectionClinic).map(o => <SelectItem key={o.id} value={o.id}>
                                        #{o.id.slice(-6)} - {o.total.toFixed(2)} {t('common.egp')}
                                    </SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="collection-amount">{t('common.collected_amount')}</Label>
                            <Input id="collection-amount" type="number" placeholder="0.00" value={collectionAmount} onChange={e => setCollectionAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <Label>{t('common.collection_date')}</Label>
                           <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                        {collectionDate ? format(collectionDate, "PPP") : <span>{t('common.pick_a_date')}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={collectionDate} onSelect={setCollectionDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCollectionDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveCollection}>{t('common.save_collection')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isNewDebtDialogOpen} onOpenChange={setIsNewDebtDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{t('accounting.debts.add_new_debt_dialog_title')}</DialogTitle>
                        <DialogDescription>
                            {t('accounting.debts.add_new_debt_dialog_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="debt-clinic">{t('common.clinic')}</Label>
                                <Select value={debtClinic} onValueChange={setDebtClinic}>
                                    <SelectTrigger id="debt-clinic"><SelectValue placeholder={t('common.select_clinic')} /></SelectTrigger>
                                    <SelectContent>{initialClinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="debt-rep">{t('common.user')}</Label>
                                <Popover open={isDebtRepComboboxOpen} onOpenChange={setIsDebtRepComboboxOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" role="combobox" className="w-full justify-between">
                                            {debtRep ? initialUsers.find((user) => user.id === debtRep)?.fullName : t('common.select_user')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('common.search_user')} />
                                            <CommandEmpty>{t('common.no_user_found')}</CommandEmpty>
                                            <CommandList><CommandGroup>
                                                {initialUsers.map((user) => (
                                                    <CommandItem key={user.id} value={user.fullName} onSelect={() => { setDebtRep(user.id); setIsDebtRepComboboxOpen(false); }}>
                                                        {user.fullName}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup></CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                               <Label>{t('accounting.debts.debt_date')}</Label>
                               <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                            {debtDate ? format(debtDate, "PPP") : <span>{t('common.pick_a_date')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={debtDate} onSelect={setDebtDate} initialFocus /></PopoverContent>
                                </Popover>
                           </div>
                           <div className="space-y-2">
                               <Label>{t('accounting.debts.due_date')}</Label>
                               <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                            {debtDueDate ? format(debtDueDate, "PPP") : <span>{t('common.pick_a_date')}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={debtDueDate} onSelect={setDebtDueDate} initialFocus /></PopoverContent>
                                </Popover>
                           </div>
                        </div>
                        <Card className="bg-muted/50">
                            <CardHeader><CardTitle className="text-base">{t('accounting.invoices.invoice_items')}</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>{t('common.product')}</TableHead><TableHead>{t('common.quantity')}</TableHead><TableHead>{t('common.price')}</TableHead><TableHead className="text-right">{t('common.total')}</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {debtItems.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">{t('accounting.invoices.add_products_to_invoice')}</TableCell></TableRow>
                                        ) : (
                                           debtItems.map((item, index) => <TableRow key={index}><TableCell>{item.productName}</TableCell><TableCell>{item.quantity}</TableCell><TableCell>{item.price.toFixed(2)}</TableCell><TableCell className="text-right">{(item.price * item.quantity).toFixed(2)}</TableCell></TableRow>)
                                        )}
                                    </TableBody>
                                </Table>
                                <Button variant="outline" className="mt-4" type="button" onClick={() => {
                                    // This is a placeholder for a proper product selection dialog
                                    const product = initialProducts[Math.floor(Math.random() * initialProducts.length)];
                                    if(product) {
                                        setDebtItems([...debtItems, { productId: product.id, productName: product.name, price: product.price, quantity: 1}]);
                                    }
                                }}><PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4"/> {t('accounting.invoices.add_product')}</Button>
                            </CardContent>
                        </Card>
                        <div className="grid md:grid-cols-3 gap-4">
                            <Select value={debtDiscountType} onValueChange={setDebtDiscountType}>
                                <SelectTrigger><SelectValue placeholder={t('common.discount_type')} /></SelectTrigger>
                                <SelectContent><SelectItem value="none">{t('common.no_discount')}</SelectItem><SelectItem value="percent">{t('common.percentage')}</SelectItem><SelectItem value="fixed">{t('common.fixed_amount')}</SelectItem></SelectContent>
                            </Select>
                            <Input placeholder={t('common.discount_value')} type="number" value={debtDiscountValue} onChange={e => setDebtDiscountValue(e.target.value)} disabled={debtDiscountType === 'none'} />
                            <div className="p-2 bg-muted rounded-md text-right">
                                <p className="text-xs text-muted-foreground">{t('common.total')}</p>
                                <p className="font-bold">
                                    {(debtItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)).toFixed(2)} {t('common.egp')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewDebtDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveDebt}>{t('common.save_debt')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('accounting.expenses.new_expense')}</DialogTitle>
                        <DialogDescription>{t('accounting.expenses.dialog_description')}</DialogDescription>
                    </DialogHeader>
                     <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="expense-user">{t('common.user')}</Label>
                            <Select value={expenseUser} onValueChange={setExpenseUser}>
                                <SelectTrigger id="expense-user"><SelectValue placeholder={t('common.select_user')} /></SelectTrigger>
                                <SelectContent>{initialUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('common.date')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                        {expenseDate ? format(expenseDate, "PPP") : <span>{t('common.pick_a_date')}</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="expense-category">{t('common.category')}</Label>
                                <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                                    <SelectTrigger id="expense-category"><SelectValue placeholder={t('accounting.expenses.select_category')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transportation">{t('accounting.expenses.categories.transportation')}</SelectItem>
                                        <SelectItem value="allowance">{t('accounting.expenses.categories.allowance')}</SelectItem>
                                        <SelectItem value="client_expense">{t('accounting.expenses.categories.client_expense')}</SelectItem>
                                        <SelectItem value="other">{t('accounting.expenses.categories.other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="expense-amount">{t('common.amount')}</Label>
                                <Input id="expense-amount" type="number" placeholder="0.00" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expense-description">{t('accounting.expenses.description')}</Label>
                            <Textarea id="expense-description" placeholder={t('accounting.expenses.description_placeholder')} value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveExpense}>{t('accounting.expenses.save_expense')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Enhanced Print Preview Dialog */}
            <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
                <DialogContent className="max-w-5xl max-h-[95vh] p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-xl">معاينة الطباعة</DialogTitle>
                                <DialogDescription>
                                    معاينة الفاتورة قبل الطباعة أو التصدير
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => {
                                        if (selectedOrder) {
                                            const printContent = document.getElementById('print-preview-content');
                                            if (printContent) {
                                                const printWindow = window.open('', '_blank');
                                                if (printWindow) {
                                                    printWindow.document.write(`
                                                        <!DOCTYPE html>
                                                        <html dir="rtl" lang="ar">
                                                        <head>
                                                            <meta charset="UTF-8">
                                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                                            <title>فاتورة ${selectedOrder.id}</title>
                                                            <style>
                                                                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                                                                @media print {
                                                                    body { margin: 0; padding: 0; }
                                                                }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            ${printContent.innerHTML}
                                                            <script>
                                                                window.onload = function() {
                                                                    window.print();
                                                                    window.onafterprint = function() {
                                                                        window.close();
                                                                    }
                                                                }
                                                            </script>
                                                        </body>
                                                        </html>
                                                    `);
                                                    printWindow.document.close();
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <Printer className="h-4 w-4 mr-2" />
                                    طباعة
                                </Button>
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        toast({ title: 'قريباً', description: 'سيتم إضافة تصدير PDF قريباً' });
                                    }}
                                >
                                    <FileDown className="h-4 w-4 mr-2" />
                                    تصدير PDF
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setShowPrintPreview(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="max-h-[80vh] overflow-y-auto p-6">
                        <div id="print-preview-content">
                            {selectedOrder && (
                                <InvoicePrintTemplate 
                                    invoice={{
                                        id: selectedOrder.id,
                                        invoice_number: (selectedOrder as any).invoice_number || `INV-${selectedOrder.id.slice(-6)}`,
                                        client_name: (selectedOrder as any).client_name || selectedOrder.clinicName,
                                        clinicName: selectedOrder.clinicName,
                                        amount: (selectedOrder as any).amount || selectedOrder.total,
                                        total_amount: (selectedOrder as any).total_amount || selectedOrder.total,
                                        total: selectedOrder.total,
                                        invoice_date: (selectedOrder as any).invoice_date || selectedOrder.orderDate,
                                        orderDate: selectedOrder.orderDate,
                                        due_date: (selectedOrder as any).due_date || selectedOrder.dueDate,
                                        status: (selectedOrder as any).status,
                                        description: (selectedOrder as any).description,
                                        notes: (selectedOrder as any).notes,
                                        payment_method: (selectedOrder as any).payment_method,
                                        is_demo: (selectedOrder as any).is_demo || selectedOrder.total === 0,
                                        items: selectedOrder.items?.map(item => ({
                                            productId: item.productId,
                                            productName: item.productName,
                                            quantity: item.quantity,
                                            price: item.price,
                                            unit_price: item.price
                                        })) || [],
                                        clinics: {
                                            name: selectedOrder.clinicName,
                                            address: initialClinics.find(c => c.id === selectedOrder.clinicId)?.address,
                                            phone: initialClinics.find(c => c.id === selectedOrder.clinicId)?.phone,
                                            email: initialClinics.find(c => c.id === selectedOrder.clinicId)?.email
                                        }
                                    }}
                                    companyInfo={{
                                        name: "EP Group Systems",
                                        name_ar: "مجموعة إي بي للأنظمة",
                                        address: "123 Business District, Cairo, Egypt",
                                        address_ar: "١٢٣ الحي التجاري، القاهرة، مصر",
                                        phone: "+20 123 456 7890",
                                        email: "info@epgroup-systems.com",
                                        website: "www.epgroup-systems.com",
                                        tax_number: "123-456-789",
                                        commercial_register: "CR-2024-001"
                                    }}
                                    language="ar"
                                />
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
