'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PrintDialog from '@/components/orders/print-dialog';

// أنواع البيانات للطلبات
interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  clinic_name: string;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled';
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit';
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

// مكون النموذج الجديد للطلب
const NewOrderForm = () => {
  const [selectedClinic, setSelectedClinic] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  const clinics = [
    { id: '1', name: 'عيادة الأسنان الرئيسية' },
    { id: '2', name: 'عيادة الجلدية' },
    { id: '3', name: 'عيادة الباطنة' }
  ];

  const products = [
    { id: '1', name: 'أدوية عامة', price: 50 },
    { id: '2', name: 'مستلزمات طبية', price: 25 },
    { id: '3', name: 'أجهزة طبية', price: 200 }
  ];

  const addItem = () => {
    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      product_name: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      updatedItems[index].total_price = updatedItems[index].quantity * updatedItems[index].unit_price;
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
  const finalAmount = totalAmount - discount;

  const submitOrder = async () => {
    const orderData = {
      clinic_id: selectedClinic,
      customer_name: customerName,
      payment_method: paymentMethod,
      discount,
      notes,
      items,
      total_amount: totalAmount,
      final_amount: finalAmount
    };

    console.log('إرسال الطلب:', orderData);
    // هنا سيتم إرسال البيانات للخادم
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">العيادة</label>
          <select
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">اختر العيادة</option>
            {clinics.map(clinic => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">اسم العميل</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-2 border rounded-md"
            placeholder="أدخل اسم العميل"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="cash">نقداً</option>
            <option value="card">بطاقة</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="credit">آجل</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">الخصم</label>
          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">بنود الطلب</h3>
          <Button onClick={addItem} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة منتج
          </Button>
        </div>

        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
            <div className="col-span-4">
              <select
                value={item.product_name}
                onChange={(e) => {
                  const product = products.find(p => p.name === e.target.value);
                  updateItem(index, 'product_name', e.target.value);
                  if (product) {
                    updateItem(index, 'unit_price', product.price);
                  }
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">اختر المنتج</option>
                {products.map(product => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                placeholder="الكمية"
              />
            </div>
            <div className="col-span-2">
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                placeholder="السعر"
              />
            </div>
            <div className="col-span-2">
              <span className="p-2 block text-center font-semibold">
                {item.total_price} ر.س
              </span>
            </div>
            <div className="col-span-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeItem(index)}
              >
                حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">ملاحظات</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full p-2 border rounded-md"
          rows={3}
          placeholder="ملاحظات إضافية"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <div className="flex justify-between text-lg">
          <span>المجموع:</span>
          <span>{totalAmount} ر.س</span>
        </div>
        <div className="flex justify-between text-lg">
          <span>الخصم:</span>
          <span>-{discount} ر.س</span>
        </div>
        <div className="flex justify-between text-xl font-bold border-t pt-2">
          <span>الإجمالي النهائي:</span>
          <span>{finalAmount} ر.س</span>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={submitOrder} className="flex-1">
          إرسال الطلب
        </Button>
        <Button variant="outline" className="flex-1">
          حفظ كمسودة
        </Button>
      </div>
    </div>
  );
};

// مكون عرض الطلبات السابقة
const PreviousOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'all' | Order['status']>('all');

  // بيانات تجريبية
  useEffect(() => {
    const mockOrders: Order[] = [
      {
        id: '1',
        order_number: 'ORD-001',
        clinic_name: 'عيادة الأسنان الرئيسية',
        customer_name: 'أحمد محمد',
        status: 'pending',
        total_amount: 500,
        discount: 50,
        final_amount: 450,
        payment_method: 'cash',
        items: [
          { id: '1', product_name: 'أدوية عامة', quantity: 2, unit_price: 50, total_price: 100 }
        ],
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-01-15T10:30:00Z'
      },
      {
        id: '2',
        order_number: 'ORD-002',
        clinic_name: 'عيادة الجلدية',
        customer_name: 'فاطمة أحمد',
        status: 'approved',
        total_amount: 750,
        discount: 0,
        final_amount: 750,
        payment_method: 'card',
        items: [
          { id: '2', product_name: 'مستلزمات طبية', quantity: 3, unit_price: 25, total_price: 75 }
        ],
        created_at: '2025-01-14T14:20:00Z',
        updated_at: '2025-01-14T15:45:00Z'
      }
    ];
    setOrders(mockOrders);
  }, []);

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'في الانتظار';
      case 'approved':
        return 'موافق عليه';
      case 'rejected':
        return 'مرفوض';
      case 'delivered':
        return 'تم التسليم';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          الكل
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          في الانتظار
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          موافق عليه
        </Button>
        <Button
          variant={filter === 'delivered' ? 'default' : 'outline'}
          onClick={() => setFilter('delivered')}
        >
          تم التسليم
        </Button>
      </div>

      {filteredOrders.map((order) => (
        <Card key={order.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  طلب رقم: {order.order_number}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {order.clinic_name} - {order.customer_name}
                </p>
              </div>
              <Badge className={cn("flex items-center gap-1", getStatusColor(order.status))}>
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">الإجمالي</p>
                  <p className="font-semibold">{order.final_amount} ر.س</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">تاريخ الطلب</p>
                  <p className="font-semibold">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">عدد الأصناف</p>
                  <p className="font-semibold">{order.items.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">طريقة الدفع</p>
                  <p className="font-semibold">
                    {order.payment_method === 'cash' && 'نقداً'}
                    {order.payment_method === 'card' && 'بطاقة'}
                    {order.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                    {order.payment_method === 'credit' && 'آجل'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                عرض التفاصيل
              </Button>
              <PrintDialog order={order}>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  طباعة
                </Button>
              </PrintDialog>
            </div>
          </CardContent>
        </Card>
      ))}

      {filteredOrders.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">لا توجد طلبات</p>
        </div>
      )}
    </div>
  );
};

// الصفحة الرئيسية
export default function OrdersPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">إدارة الطلبات</h1>
        <p className="text-gray-600 mt-2">إنشاء ومتابعة الطلبات</p>
      </div>

      <Tabs defaultValue="new-order" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="new-order" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            طلب جديد
          </TabsTrigger>
          <TabsTrigger value="previous-orders" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            الطلبات السابقة
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="new-order" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>إنشاء طلب جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <NewOrderForm />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="previous-orders" className="mt-6">
          <PreviousOrders />
        </TabsContent>
      </Tabs>
    </div>
  );
}