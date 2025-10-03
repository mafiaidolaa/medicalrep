
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, PackagePlus, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';
import { useTranslation } from 'react-i18next';
import { useDataProvider } from '@/lib/data-provider';
import { generateUUID } from '@/lib/supabase-services';

export function StockClientPage() {
    const { t } = useTranslation();
    const { products, setProducts, lines, deleteProduct } = useDataProvider();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const { toast } = useToast();

    // Defensive normalization for lines
    const safeLines = Array.isArray(lines)
        ? (lines.filter(Boolean).map(String) as string[])
        : (lines && typeof lines === 'object')
            ? (Object.values(lines as any).filter(Boolean).map(String) as string[])
            : ([] as string[]);

    // State for the product form (add/edit)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [line, setLine] = useState<'Line 1' | 'Line 2' | ''>('');
    const [category, setCategory] = useState('');
    const [averageDailyUsage, setAverageDailyUsage] = useState('');

    const resetForm = () => {
        setEditingProduct(null);
        setName('');
        setPrice('');
        setStock('');
        setLine('');
        setCategory('');
        setAverageDailyUsage('');
    };

    const handleOpenDialog = (product: Product | null) => {
        if (product) {
            setEditingProduct(product);
            setName(product.name);
            setPrice(String(product.price));
            setStock(String(product.stock));
            setLine(product.line as 'Line 1' | 'Line 2' | '');
            setCategory(product.category || '');
            setAverageDailyUsage(String(product.averageDailyUsage));
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleFormSubmit = async () => {
        if (!name || !price || !stock || !line || !category || !averageDailyUsage) {
            toast({
                variant: 'destructive',
                title: t('stock.errors.missing_fields_title'),
                description: t('stock.errors.missing_fields_desc'),
            });
            return;
        }

        if (editingProduct) {
            // Update existing product
            const updatedProduct: Product = {
                ...editingProduct,
                name,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                line,
                category,
                averageDailyUsage: parseInt(averageDailyUsage, 10),
            };
            await setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            toast({
                title: t('common.success'),
                description: t('stock.product_updated_successfully', { name }),
            });
        } else {
            // Add new product
            const newProduct: Product = {
                id: generateUUID(),
                name,
                price: parseFloat(price),
                stock: parseInt(stock, 10),
                line,
                category,
                averageDailyUsage: parseInt(averageDailyUsage, 10),
                imageUrl: `https://picsum.photos/200/200?random=${Math.random()}`,
            };
            await setProducts(prev => [...prev, newProduct]);
            toast({
                title: t('common.success'),
                description: t('stock.product_added_successfully', { name }),
            });
        }

        resetForm();
        setIsDialogOpen(false);
    };
    
    const handleDeleteProduct = async () => {
        if (productToDelete) {
            await deleteProduct(productToDelete.id);
            toast({
                title: t('common.success'),
                description: t('stock.product_deleted_successfully', { name: productToDelete.name }),
            });
            setProductToDelete(null);
        }
    };

    const renderProductTable = (productsToRender: Product[]) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('common.product')}</TableHead>
                    <TableHead>{t('common.category')}</TableHead>
                    <TableHead>{t('common.price')}</TableHead>
                    <TableHead>{t('stock.stock_level')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {productsToRender.map(product => (
                    <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.price.toFixed(2)} {t('common.egp')}</TableCell>
                        <TableCell>
                            <Badge variant={product.stock < 30 ? 'destructive' : 'secondary'}>
                                {t('stock.units', { count: product.stock })}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleOpenDialog(product)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" onClick={() => setProductToDelete(product)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <>
            <div className="flex justify-end">
                <Button onClick={() => handleOpenDialog(null)}>
                    <PlusCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                    {t('stock.add_new_product')}
                </Button>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) resetForm();
                setIsDialogOpen(isOpen);
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? t('stock.edit_product') : t('stock.add_new_product_to_stock')}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('common.product_name')}</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">{t('common.price')} ({t('common.egp')})</Label>
                                <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stock">{t('common.quantity')}</Label>
                                <Input id="stock" type="number" value={stock} onChange={e => setStock(e.target.value)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="line">{t('common.line')}</Label>
                            <Select value={line} onValueChange={(value) => setLine(value as 'Line 1' | 'Line 2')}>
                                <SelectTrigger id="line"><SelectValue placeholder={t('common.select_line')} /></SelectTrigger>
                                <SelectContent>
                                    {safeLines.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">{t('common.category')}</Label>
                            <Input id="category" value={category} onChange={e => setCategory(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="avg-usage">{t('stock.avg_daily_usage')}</Label>
                            <Input id="avg-usage" type="number" value={averageDailyUsage} onChange={e => setAverageDailyUsage(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleFormSubmit}><PackagePlus className="ltr:mr-2 rtl:ml-2" />{editingProduct ? t('common.save_changes') : t('stock.add_product')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
             <AlertDialog onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('stock.delete_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('stock.delete_confirm_desc')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteProduct}>{t('common.continue')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('stock.current_stock')}</CardTitle>
                        <CardDescription>{t('stock.current_stock_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue={safeLines[0] || 'line1'}>
                            <TabsList className={`grid w-full grid-cols-${safeLines.length}`}>
                                {safeLines.map(line => <TabsTrigger key={line} value={line}>{line}</TabsTrigger>)}
                            </TabsList>
                            {safeLines.map(line => {
                                const productsInLine = products.filter(p => p.line === line);
                                return (
                                    <TabsContent key={line} value={line} className="mt-4">
                                        {productsInLine.length > 0 ? renderProductTable(productsInLine) : <p className="text-center text-muted-foreground py-8">{t('stock.no_products_in_line')}</p>}
                                    </TabsContent>
                                )
                            })}
                        </Tabs>
                    </CardContent>
                </Card>
            </AlertDialog>
        </>
    );
}
