// خدمات إدارة الطلبات

// أنواع البيانات
export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  clinic_id: string;
  clinic_name: string;
  customer_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'cancelled';
  total_amount: number;
  discount: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit';
  notes?: string;
  items: OrderItem[];
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderData {
  clinic_id: string;
  customer_name: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'credit';
  discount: number;
  notes?: string;
  items: Omit<OrderItem, 'id' | 'total_price'>[];
}

export interface OrderFilters {
  status?: Order['status'];
  clinic_id?: string;
  customer_name?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: Order['payment_method'];
  created_by?: string;
}

export interface OrderStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  pending_amount: number;
  approved_orders: number;
  approved_amount: number;
  delivered_orders: number;
  delivered_amount: number;
  rejected_orders: number;
  rejected_amount: number;
  cancelled_orders: number;
  cancelled_amount: number;
  by_clinic: { [clinic_name: string]: { count: number; amount: number } };
  by_payment_method: { [method: string]: { count: number; amount: number } };
  recent_orders: Order[];
}

// خدمة الطلبات الرئيسية
export class OrdersService {
  // إنشاء طلب جديد
  static async createOrder(orderData: CreateOrderData, userId: string): Promise<Order> {
    // حساب الإجماليات
    const items: OrderItem[] = orderData.items.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      ...item,
      total_price: item.quantity * item.unit_price
    }));

    const total_amount = items.reduce((sum, item) => sum + item.total_price, 0);
    const final_amount = total_amount - orderData.discount;

    // الحصول على معلومات العيادة
    const clinic = await this.getClinicById(orderData.clinic_id);

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      order_number: `ORD-${Date.now().toString().slice(-6)}`,
      clinic_id: orderData.clinic_id,
      clinic_name: clinic?.name || 'عيادة غير محددة',
      customer_name: orderData.customer_name,
      status: 'pending',
      total_amount,
      discount: orderData.discount,
      final_amount,
      payment_method: orderData.payment_method,
      notes: orderData.notes,
      items,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // هنا سيتم حفظ الطلب في قاعدة البيانات
    console.log('إنشاء طلب جديد:', newOrder);
    
    return newOrder;
  }

  // جلب الطلبات مع الفلترة والترقيم
  static async getOrders(
    filters: OrderFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ orders: Order[]; total: number; pages: number }> {
    // بيانات تجريبية - في الواقع ستأتي من قاعدة البيانات
    const mockOrders: Order[] = [
      {
        id: '1',
        order_number: 'ORD-001',
        clinic_id: '1',
        clinic_name: 'عيادة الأسنان الرئيسية',
        customer_name: 'أحمد محمد علي',
        status: 'pending',
        total_amount: 500,
        discount: 50,
        final_amount: 450,
        payment_method: 'cash',
        items: [
          { 
            id: '1', 
            product_name: 'أدوية عامة', 
            quantity: 2, 
            unit_price: 50, 
            total_price: 100 
          },
          { 
            id: '2', 
            product_name: 'مستلزمات طبية', 
            quantity: 4, 
            unit_price: 100, 
            total_price: 400 
          }
        ],
        created_by: 'user-1',
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-01-15T10:30:00Z'
      },
      {
        id: '2',
        order_number: 'ORD-002',
        clinic_id: '2',
        clinic_name: 'عيادة الجلدية',
        customer_name: 'فاطمة أحمد',
        status: 'approved',
        total_amount: 750,
        discount: 0,
        final_amount: 750,
        payment_method: 'card',
        items: [
          { 
            id: '3', 
            product_name: 'كريمات طبية', 
            quantity: 3, 
            unit_price: 75, 
            total_price: 225 
          },
          { 
            id: '4', 
            product_name: 'أجهزة قياس', 
            quantity: 1, 
            unit_price: 525, 
            total_price: 525 
          }
        ],
        created_by: 'user-2',
        approved_by: 'manager-1',
        approved_at: '2025-01-14T15:45:00Z',
        created_at: '2025-01-14T14:20:00Z',
        updated_at: '2025-01-14T15:45:00Z'
      },
      {
        id: '3',
        order_number: 'ORD-003',
        clinic_id: '1',
        clinic_name: 'عيادة الأسنان الرئيسية',
        customer_name: 'محمد سعد',
        status: 'delivered',
        total_amount: 1200,
        discount: 120,
        final_amount: 1080,
        payment_method: 'bank_transfer',
        items: [
          { 
            id: '5', 
            product_name: 'معدات أسنان', 
            quantity: 2, 
            unit_price: 600, 
            total_price: 1200 
          }
        ],
        created_by: 'user-3',
        approved_by: 'manager-1',
        approved_at: '2025-01-13T11:30:00Z',
        created_at: '2025-01-13T09:15:00Z',
        updated_at: '2025-01-13T16:20:00Z'
      }
    ];

    // تطبيق الفلاتر
    let filteredOrders = mockOrders;
    
    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }
    
    if (filters.clinic_id) {
      filteredOrders = filteredOrders.filter(order => order.clinic_id === filters.clinic_id);
    }
    
    if (filters.customer_name) {
      filteredOrders = filteredOrders.filter(order => 
        order.customer_name.toLowerCase().includes(filters.customer_name!.toLowerCase())
      );
    }

    if (filters.payment_method) {
      filteredOrders = filteredOrders.filter(order => order.payment_method === filters.payment_method);
    }

    if (filters.created_by) {
      filteredOrders = filteredOrders.filter(order => order.created_by === filters.created_by);
    }

    // تطبيق فلتر التاريخ
    if (filters.date_from) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.created_at) >= new Date(filters.date_from!)
      );
    }
    
    if (filters.date_to) {
      filteredOrders = filteredOrders.filter(order => 
        new Date(order.created_at) <= new Date(filters.date_to!)
      );
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    filteredOrders.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // تطبيق الترقيم
    const total = filteredOrders.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      orders: paginatedOrders,
      total,
      pages
    };
  }

  // جلب طلب محدد
  static async getOrderById(id: string): Promise<Order | null> {
    const { orders } = await this.getOrders({}, 1, 1000);
    return orders.find(order => order.id === id) || null;
  }

  // تحديث حالة الطلب
  static async updateOrderStatus(
    id: string, 
    status: Order['status'], 
    userId: string,
    notes?: string
  ): Promise<Order> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    const updates: Partial<Order> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'approved') {
      updates.approved_by = userId;
      updates.approved_at = new Date().toISOString();
    }

    if (notes) {
      updates.notes = order.notes ? `${order.notes}\n---\n${notes}` : notes;
    }

    const updatedOrder = { ...order, ...updates };
    console.log('تحديث حالة الطلب:', updatedOrder);
    
    return updatedOrder;
  }

  // حذف طلب
  static async deleteOrder(id: string, userId: string): Promise<void> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    if (order.status !== 'pending' && order.created_by !== userId) {
      throw new Error('لا يمكن حذف هذا الطلب');
    }

    console.log(`تم حذف الطلب: ${id} بواسطة: ${userId}`);
  }

  // إحصائيات الطلبات
  static async getOrderStats(filters?: OrderFilters): Promise<OrderStats> {
    const { orders } = await this.getOrders(filters, 1, 10000);

    const stats: OrderStats = {
      total_orders: orders.length,
      total_amount: orders.reduce((sum, order) => sum + order.final_amount, 0),
      pending_orders: orders.filter(o => o.status === 'pending').length,
      pending_amount: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.final_amount, 0),
      approved_orders: orders.filter(o => o.status === 'approved').length,
      approved_amount: orders.filter(o => o.status === 'approved').reduce((sum, o) => sum + o.final_amount, 0),
      delivered_orders: orders.filter(o => o.status === 'delivered').length,
      delivered_amount: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.final_amount, 0),
      rejected_orders: orders.filter(o => o.status === 'rejected').length,
      rejected_amount: orders.filter(o => o.status === 'rejected').reduce((sum, o) => sum + o.final_amount, 0),
      cancelled_orders: orders.filter(o => o.status === 'cancelled').length,
      cancelled_amount: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.final_amount, 0),
      by_clinic: {},
      by_payment_method: {},
      recent_orders: orders.slice(0, 5)
    };

    // تجميع حسب العيادات
    orders.forEach(order => {
      if (!stats.by_clinic[order.clinic_name]) {
        stats.by_clinic[order.clinic_name] = { count: 0, amount: 0 };
      }
      stats.by_clinic[order.clinic_name].count++;
      stats.by_clinic[order.clinic_name].amount += order.final_amount;
    });

    // تجميع حسب طريقة الدفع
    orders.forEach(order => {
      if (!stats.by_payment_method[order.payment_method]) {
        stats.by_payment_method[order.payment_method] = { count: 0, amount: 0 };
      }
      stats.by_payment_method[order.payment_method].count++;
      stats.by_payment_method[order.payment_method].amount += order.final_amount;
    });

    return stats;
  }

  // جلب العيادات المتاحة
  static async getAvailableClinics(userId?: string): Promise<{ id: string; name: string }[]> {
    // بيانات تجريبية - في الواقع ستأتي من قاعدة البيانات
    return [
      { id: '1', name: 'عيادة الأسنان الرئيسية' },
      { id: '2', name: 'عيادة الجلدية' },
      { id: '3', name: 'عيادة الباطنة' },
      { id: '4', name: 'عيادة العيون' },
      { id: '5', name: 'عيادة الأطفال' }
    ];
  }

  // جلب المنتجات المتاحة
  static async getAvailableProducts(): Promise<{ id: string; name: string; price: number; category?: string }[]> {
    return [
      { id: '1', name: 'أدوية عامة', price: 50, category: 'أدوية' },
      { id: '2', name: 'مستلزمات طبية', price: 25, category: 'مستلزمات' },
      { id: '3', name: 'أجهزة طبية', price: 200, category: 'أجهزة' },
      { id: '4', name: 'كريمات طبية', price: 75, category: 'أدوية' },
      { id: '5', name: 'معدات أسنان', price: 600, category: 'معدات' },
      { id: '6', name: 'أجهزة قياس', price: 525, category: 'أجهزة' }
    ];
  }

  // جلب معلومات عيادة محددة
  private static async getClinicById(id: string): Promise<{ id: string; name: string } | null> {
    const clinics = await this.getAvailableClinics();
    return clinics.find(clinic => clinic.id === id) || null;
  }
}

// خدمة الطلبات المتقدمة (للتقارير والإحصائيات)
export class OrdersReportsService {
  // تقرير مبيعات شهري
  static async getMonthlySalesReport(year: number, month: number): Promise<{
    total_orders: number;
    total_amount: number;
    daily_sales: { day: number; orders: number; amount: number }[];
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const filters: OrderFilters = {
      date_from: startDate.toISOString(),
      date_to: endDate.toISOString(),
      status: 'delivered' // فقط الطلبات المسلمة
    };

    const { orders } = await OrdersService.getOrders(filters, 1, 10000);

    const dailySales: { [day: number]: { orders: number; amount: number } } = {};
    const daysInMonth = endDate.getDate();

    // تهيئة الأيام
    for (let day = 1; day <= daysInMonth; day++) {
      dailySales[day] = { orders: 0, amount: 0 };
    }

    // تجميع البيانات حسب اليوم
    orders.forEach(order => {
      const orderDay = new Date(order.created_at).getDate();
      dailySales[orderDay].orders++;
      dailySales[orderDay].amount += order.final_amount;
    });

    return {
      total_orders: orders.length,
      total_amount: orders.reduce((sum, order) => sum + order.final_amount, 0),
      daily_sales: Object.entries(dailySales).map(([day, data]) => ({
        day: parseInt(day),
        ...data
      }))
    };
  }

  // تقرير أداء العيادات
  static async getClinicsPerformanceReport(): Promise<{
    clinic_name: string;
    total_orders: number;
    total_amount: number;
    avg_order_value: number;
    pending_orders: number;
  }[]> {
    const stats = await OrdersService.getOrderStats();
    const { orders } = await OrdersService.getOrders({}, 1, 10000);

    return Object.entries(stats.by_clinic).map(([clinic_name, data]) => {
      const clinicOrders = orders.filter(order => order.clinic_name === clinic_name);
      const pendingOrders = clinicOrders.filter(order => order.status === 'pending').length;

      return {
        clinic_name,
        total_orders: data.count,
        total_amount: data.amount,
        avg_order_value: data.count > 0 ? data.amount / data.count : 0,
        pending_orders: pendingOrders
      };
    });
  }
}

// الخدمة الرئيسية المدمجة
export const ordersService = {
  orders: OrdersService,
  reports: OrdersReportsService,

  // دوال مساعدة
  getStatusLabel: (status: Order['status']): string => {
    const labels = {
      'pending': 'في الانتظار',
      'approved': 'موافق عليه',
      'rejected': 'مرفوض',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return labels[status] || status;
  },

  getPaymentMethodLabel: (method: Order['payment_method']): string => {
    const labels = {
      'cash': 'نقداً',
      'card': 'بطاقة',
      'bank_transfer': 'تحويل بنكي',
      'credit': 'آجل'
    };
    return labels[method] || method;
  },

  // دوال للتحقق من الصلاحيات
  canEdit: (order: Order, userId: string): boolean => {
    return order.created_by === userId && order.status === 'pending';
  },

  canApprove: (order: Order, userRole: string): boolean => {
    return ['admin', 'manager'].includes(userRole) && order.status === 'pending';
  },

  canCancel: (order: Order, userId: string, userRole: string): boolean => {
    return (order.created_by === userId || ['admin', 'manager'].includes(userRole)) 
           && ['pending', 'approved'].includes(order.status);
  }
};

export default ordersService;