# 🌐 دليل دمج نظام المخازن مع الأقسام الأخرى

## 📋 نظرة عامة

يوفر نظام إدارة المخازن مجموعة شاملة من نقاط النهاية (APIs) والخدمات للدمج مع الأقسام الأخرى في منظومة EP Group، بما في ذلك نظم الطلبات، المحاسبة، الموافقات، والتقارير.

## 🔧 المكونات الرئيسية

### 1. خدمة الدمج (`StockIntegrationService`)
تدير الدمج مع الأنظمة الخارجية والأقسام الأخرى.

### 2. نقاط نهاية الخدمات (`StockAPIEndpoints`)
توفر واجهات برمجية منظمة للتفاعل مع النظام من الخارج.

---

## 🔌 APIs المخزون الأساسية

### 1. الحصول على مستويات المخزون

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  warehouse_id: "WH001", // اختياري
  product_id: "PROD001", // اختياري
  page: 1,
  limit: 50
};

const response = await stockAPIEndpoints.getStockLevels(request);
```

**استجابة مثال:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "product_id": "PROD001",
        "warehouse_id": "WH001",
        "available_quantity": 150,
        "reserved_quantity": 25,
        "product": {
          "name_ar": "منتج تجريبي",
          "code": "PROD001"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "total_pages": 4
    }
  },
  "message": "تم جلب مستويات المخزون بنجاح",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. فحص توفر المنتجات

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  items: [
    {
      product_id: "PROD001",
      quantity: 10,
      warehouse_id: "WH001"
    },
    {
      product_id: "PROD002", 
      quantity: 5,
      warehouse_id: "WH001"
    }
  ]
};

const response = await stockAPIEndpoints.checkProductAvailability(request);
```

### 3. حجز المخزون

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  product_id: "PROD001",
  warehouse_id: "WH001",
  quantity: 10,
  reservation_reason: "للأوردر رقم ORD001",
  expires_at: "2024-01-16T10:30:00.000Z"
};

const response = await stockAPIEndpoints.reserveStock(request);
```

---

## 🛍️ الدمج مع نظام الطلبات

### 1. إنشاء طلب صرف من أوردر

```typescript
const orderData = {
  order_id: "ORD001",
  order_number: "2024-001",
  customer_id: "CUST001",
  customer_name: "شركة العميل المحدودة",
  items: [
    {
      product_id: "PROD001",
      product_name: "منتج رقم 1",
      quantity: 5,
      unit_price: 100.00
    },
    {
      product_id: "PROD002", 
      product_name: "منتج رقم 2",
      quantity: 3,
      unit_price: 150.00
    }
  ],
  total_amount: 950.00,
  warehouse_id: "WH001"
};

const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  order_data: orderData
};

const response = await stockAPIEndpoints.createStockRequestFromOrder(request);
```

### 2. تحديث حالة الطلب

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  request_id: "REQ001",
  new_status: "approved",
  notes: "تمت الموافقة على الطلب"
};

const response = await stockAPIEndpoints.updateRequestStatus(request);
```

### 3. معالجة Webhooks للأوردرات

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  event_type: "order_created",
  order_data: {
    // بيانات الأوردر
  }
};

const response = await stockAPIEndpoints.handleOrderWebhook(request);
```

---

## 💼 الدمج مع النظام المحاسبي

### 1. تزامن البيانات مع النظام المحاسبي

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "admin_user",
  sync_type: "incremental",
  date_from: "2024-01-01",
  date_to: "2024-01-15"
};

const response = await stockAPIEndpoints.syncWithAccountingSystem(request);
```

### 2. إنشاء القيود المحاسبية تلقائياً

يتم إنشاء القيود تلقائياً عند حدوث حركات المخزون:

- **الإدخال**: دائن المخزون، مدين الموردين
- **الصرف**: مدين تكلفة البضاعة، دائن المخزون  
- **التسوية**: حسب طبيعة التسوية

---

## 📊 APIs التقارير

### 1. تقرير تقييم المخزون

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  warehouse_id: "WH001", // اختياري
  format: "json" // أو "pdf" أو "excel"
};

const response = await stockAPIEndpoints.getStockValuationReport(request);
```

### 2. تقرير حركات المخزون

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  warehouse_id: "WH001",
  date_from: "2024-01-01",
  date_to: "2024-01-15",
  format: "pdf",
  page: 1,
  limit: 100
};

const response = await stockAPIEndpoints.getStockMovementsReport(request);
```

### 3. الإحصائيات العامة

```typescript
const request = {
  api_key: "epg_your_api_key_here",
  user_id: "user123",
  warehouse_id: "WH001",
  period: "monthly"
};

const response = await stockAPIEndpoints.getStockStatistics(request);
```

---

## 🔐 نظام الموافقات الهرمي

### 1. بدء سير الموافقة

```typescript
const workflowId = await stockIntegrationService.initiateApprovalWorkflow(
  "stock_request",
  "REQ001", 
  "user123",
  15000.00 // القيمة الإجمالية
);
```

### 2. معالجة خطوة الموافقة

```typescript
const result = await stockIntegrationService.processApprovalStep(
  workflowId,
  "manager001",
  "approved",
  "الطلب مبرر ومطابق للاحتياجات"
);

if (result.workflow_completed && result.final_status === 'approved') {
  // تنفيذ الطلب
  console.log('تم اعتماد الطلب نهائياً');
}
```

### 3. مستويات الموافقة

يتم تحديد مستويات الموافقة حسب:

- **أقل من 10,000 جنيه**: المدير المباشر فقط
- **10,000 - 50,000 جنيه**: المدير + المحاسبة  
- **أكثر من 50,000 جنيه**: المدير + المحاسبة + الإدارة العليا

---

## 🔒 الأمان والصلاحيات

### 1. مفاتيح API

جميع الطلبات تتطلب مفتاح API صحيح:
```
epg_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```

### 2. فحص الصلاحيات

```typescript
const hasPermission = await stockSecurityService.hasPermission(
  "user123",
  "WH001", 
  "manage_stock"
);
```

### 3. تسجيل الأحداث الأمنية

```typescript
await stockSecurityService.logSecurityEvent({
  user_id: "user123",
  action: "create_stock_request",
  entity_type: "stock_request",
  entity_id: "REQ001",
  description: "إنشاء طلب صرف جديد",
  ip_address: "192.168.1.100",
  user_agent: "API Client v1.0"
});
```

---

## 🚨 معالجة الأخطاء

### رموز الأخطاء الشائعة

| رمز الخطأ | الوصف | الحل المقترح |
|-----------|-------|--------------|
| `PERMISSION_DENIED` | ليس لديك صلاحية | تحقق من صلاحيات المستخدم |
| `FETCH_ERROR` | خطأ في جلب البيانات | تحقق من معاملات الطلب |
| `RESERVATION_FAILED` | فشل حجز المخزون | تحقق من توفر الكمية |
| `INTERNAL_ERROR` | خطأ داخلي | اتصل بالدعم الفني |

### مثال على معالجة الأخطاء

```typescript
try {
  const response = await stockAPIEndpoints.getStockLevels(request);
  
  if (!response.success) {
    console.error('خطأ في الطلب:', response.message);
    console.error('رمز الخطأ:', response.error_code);
    
    switch (response.error_code) {
      case 'PERMISSION_DENIED':
        // إعادة توجيه لصفحة تسجيل الدخول
        break;
      case 'FETCH_ERROR':
        // إعادة المحاولة
        break;
      default:
        // عرض رسالة خطأ عامة
    }
  } else {
    // معالجة البيانات بنجاح
    console.log('البيانات:', response.data);
  }
} catch (error) {
  console.error('خطأ في الشبكة:', error);
}
```

---

## 📝 أمثلة التطبيق

### تطبيق ويب بسيط

```typescript
class StockWebApp {
  private apiKey = "epg_your_api_key_here";
  private userId = "current_user_id";

  async displayStockLevels() {
    const request = {
      api_key: this.apiKey,
      user_id: this.userId,
      page: 1,
      limit: 20
    };

    const response = await stockAPIEndpoints.getStockLevels(request);
    
    if (response.success) {
      this.renderStockTable(response.data.items);
    } else {
      this.showError(response.message);
    }
  }

  async processOrder(orderData: any) {
    // فحص توفر المنتجات أولاً
    const availability = await stockAPIEndpoints.checkProductAvailability({
      api_key: this.apiKey,
      user_id: this.userId,
      items: orderData.items
    });

    if (!availability.data.all_available) {
      this.showAvailabilityWarning(availability.data.items);
      return false;
    }

    // إنشاء طلب الصرف
    const stockRequest = await stockAPIEndpoints.createStockRequestFromOrder({
      api_key: this.apiKey,
      user_id: this.userId,
      order_data: orderData
    });

    return stockRequest.success;
  }
}
```

### نظام إشعارات

```typescript
class StockNotificationSystem {
  async checkLowStock() {
    const stats = await stockAPIEndpoints.getStockStatistics({
      api_key: this.apiKey,
      user_id: this.userId
    });

    if (stats.success && stats.data.alerts.low_stock_products > 0) {
      this.sendLowStockAlert(stats.data.alerts);
    }
  }

  private sendLowStockAlert(alerts: any) {
    // إرسال إشعار للمسؤولين
    console.log(`تنبيه: ${alerts.low_stock_products} منتج بكمية منخفضة`);
  }
}
```

---

## 🔄 أتمتة العمليات

### مزامنة دورية مع المحاسبة

```typescript
class AutoSyncService {
  async scheduleDailySync() {
    setInterval(async () => {
      const today = new Date().toISOString().split('T')[0];
      
      await stockAPIEndpoints.syncWithAccountingSystem({
        api_key: this.apiKey,
        user_id: "system",
        sync_type: "incremental",
        date_from: today,
        date_to: today
      });
    }, 24 * 60 * 60 * 1000); // كل 24 ساعة
  }
}
```

### معالجة Webhooks

```typescript
// في تطبيق Express.js
app.post('/api/webhooks/orders', async (req, res) => {
  try {
    const response = await stockAPIEndpoints.handleOrderWebhook({
      api_key: req.headers['x-api-key'],
      event_type: req.body.event_type,
      order_data: req.body.data
    });

    res.status(response.success ? 200 : 400).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في معالجة الـ webhook'
    });
  }
});
```

---

## 📚 الموارد الإضافية

- [دليل نظام الصلاحيات](./SECURITY_GUIDE.md)
- [دليل التقارير والنماذج](./REPORTS_GUIDE.md)
- [دليل إدارة المخازن](./WAREHOUSE_GUIDE.md)

---

## 🆘 الدعم الفني

لأي استفسارات أو مساعدة:
- 📧 البريد الإلكتروني: support@epgroup.com
- 📱 الهاتف: +20-xxx-xxx-xxxx  
- 💬 نظام التذاكر الداخلي

---

*آخر تحديث: يناير 2024*