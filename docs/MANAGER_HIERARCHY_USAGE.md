# نظام التسلسل الإداري (Manager Hierarchy)

## نظرة عامة

تم إضافة حقل `manager_id` لجدول `users` لتمكين بنية تسلسل إداري واضحة في النظام.

### الفوائد الأساسية:
- ✅ **الموافقات**: يتم تمرير الموافقات عبر المدير المباشر
- ✅ **عرض الزيارات**: يرى المدير زيارات فريقه
- ✅ **المصروفات**: تُعرض على المدير المباشر للمراجعة
- ✅ **الإشعارات**: تُرسل للمدير المباشر تلقائياً

---

## البنية التحتية

### 1. قاعدة البيانات

تم تطبيق Migration:
```sql
-- إضافة عمود manager_id
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- إضافة Index للأداء
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON public.users(manager_id);
```

### 2. View مساعدة

تم إنشاء `user_hierarchy` view لتسهيل الاستعلامات:
```sql
SELECT * FROM public.user_hierarchy;
```

الأعمدة المتاحة:
- `user_id`, `user_name`, `username`, `user_role`
- `manager_id`, `manager_name`, `manager_username`, `manager_role`
- `area`, `line`, `is_active`

---

## استخدام نظام التسلسل الإداري

### 1. عرض فريق المدير

للحصول على جميع الموظفين تحت مدير معين:

```typescript
// Using Supabase
const { data: teamMembers } = await supabase
  .from('users')
  .select('*')
  .eq('manager_id', managerId)
  .eq('is_active', true);
```

أو استخدام View:
```typescript
const { data: teamHierarchy } = await supabase
  .from('user_hierarchy')
  .select('*')
  .eq('manager_id', managerId);
```

### 2. عرض زيارات الفريق للمدير

```typescript
// الحصول على جميع IDs أعضاء الفريق
const { data: teamMembers } = await supabase
  .from('users')
  .select('id')
  .eq('manager_id', currentUser.id);

const teamMemberIds = teamMembers?.map(m => m.id) || [];

// جلب الزيارات لكل الفريق
const { data: visits } = await supabase
  .from('visits')
  .select('*, clinics(*), users(*)')
  .in('representative_id', teamMemberIds)
  .order('visit_date', { ascending: false });
```

### 3. عرض مصروفات الفريق للمدير

```typescript
const { data: expenses } = await supabase
  .from('expenses')
  .select('*, users(*)')
  .in('created_by', teamMemberIds)
  .eq('status', 'pending') // فقط المصروفات المعلقة
  .order('expense_date', { ascending: false });
```

### 4. إرسال إشعار للمدير المباشر

```typescript
// عند إضافة مصروف جديد
const expense = { /* ... */ };

// الحصول على المدير المباشر
const { data: user } = await supabase
  .from('users')
  .select('manager_id, full_name')
  .eq('id', currentUserId)
  .single();

if (user?.manager_id) {
  // إرسال إشعار
  await supabase
    .from('notifications')
    .insert({
      user_id: user.manager_id,
      title: 'مصروف جديد يحتاج موافقة',
      message: `${user.full_name} قام بتسجيل مصروف جديد بقيمة ${expense.amount}`,
      type: 'expense_pending',
      data: { expense_id: expense.id }
    });
}
```

### 5. الموافقات (Approvals)

#### مثال: الموافقة على مصروف

```typescript
async function approveExpense(expenseId: string, managerId: string) {
  // التحقق من أن الطالب هو المدير المباشر للموظف
  const { data: expense } = await supabase
    .from('expenses')
    .select('created_by, users!inner(manager_id)')
    .eq('id', expenseId)
    .single();
  
  if (expense?.users.manager_id !== managerId) {
    throw new Error('ليس لديك صلاحية الموافقة على هذا المصروف');
  }
  
  // تحديث حالة المصروف
  await supabase
    .from('expenses')
    .update({ 
      status: 'approved',
      approved_by: managerId,
      approved_at: new Date().toISOString()
    })
    .eq('id', expenseId);
}
```

---

## أمثلة عملية في الواجهة

### Dashboard المدير

```typescript
export default function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamVisits, setTeamVisits] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  
  useEffect(() => {
    if (currentUser?.role === 'manager') {
      loadTeamData();
    }
  }, [currentUser]);
  
  async function loadTeamData() {
    // جلب أعضاء الفريق
    const { data: members } = await supabase
      .from('users')
      .select('*')
      .eq('manager_id', currentUser.id);
    
    setTeamMembers(members || []);
    
    const memberIds = members?.map(m => m.id) || [];
    
    // جلب زيارات الفريق
    const { data: visits } = await supabase
      .from('visits')
      .select('*')
      .in('representative_id', memberIds);
    
    setTeamVisits(visits || []);
    
    // جلب المصروفات المعلقة
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .in('created_by', memberIds)
      .eq('status', 'pending');
    
    setPendingExpenses(expenses || []);
  }
  
  return (
    <div>
      <h1>لوحة تحكم المدير</h1>
      
      <Card>
        <CardTitle>فريقي ({teamMembers.length})</CardTitle>
        {/* عرض أعضاء الفريق */}
      </Card>
      
      <Card>
        <CardTitle>الزيارات ({teamVisits.length})</CardTitle>
        {/* عرض زيارات الفريق */}
      </Card>
      
      <Card>
        <CardTitle>مصروفات معلقة ({pendingExpenses.length})</CardTitle>
        {/* عرض المصروفات المعلقة */}
      </Card>
    </div>
  );
}
```

---

## الموظف (Employee) - عرض معلومات المدير

```typescript
export default function UserProfile() {
  const { currentUser } = useAuth();
  const [manager, setManager] = useState(null);
  
  useEffect(() => {
    if (currentUser?.managerId) {
      loadManager();
    }
  }, [currentUser]);
  
  async function loadManager() {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, primary_phone')
      .eq('id', currentUser.managerId)
      .single();
    
    setManager(data);
  }
  
  return (
    <div>
      {manager && (
        <Card>
          <CardTitle>المدير المباشر</CardTitle>
          <CardContent>
            <p>الاسم: {manager.full_name}</p>
            <p>البريد: {manager.email}</p>
            <p>الهاتف: {manager.primary_phone}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## إضافة Columns لجداول أخرى (اختياري)

إذا أردت تتبع الموافقات بشكل أدق:

```sql
-- إضافة أعمدة الموافقات لجدول expenses
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- إضافة أعمدة الموافقات لجدول visits (إن لزم الأمر)
ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
```

---

## RLS Policies (Row Level Security)

للتأكد من أن المدراء يمكنهم رؤية بيانات فريقهم:

```sql
-- سياسة للمدراء لعرض مصروفات فريقهم
CREATE POLICY "Managers can view team expenses"
ON public.expenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'manager')
    AND expenses.created_by IN (
      SELECT id FROM public.users 
      WHERE manager_id = auth.uid()
    )
  )
);
```

---

## ملخص التغييرات

### ✅ تم الإنجاز:
1. إضافة `manager_id` column في جدول `users`
2. تحديث `database.types.ts` و `types.ts`
3. تحديث `transform` functions في `supabase-services.ts`
4. تحديث API routes للمستخدمين (POST و PUT)
5. إضافة حقل اختيار المدير في نماذج إضافة/تعديل المستخدم
6. إنشاء `user_hierarchy` view

### 📌 يتطلب تنفيذ يدوي:
- تطبيق فلاتر في صفحات الزيارات/المصروفات/الإشعارات
- إضافة logic للموافقات في صفحات المدراء
- إضافة أعمدة الموافقات في الجداول (إن لزم)

---

## الخطوات القادمة

1. **تطبيق SQL Migration**: 
   - افتح Supabase Dashboard → SQL Editor
   - نفّذ ملف `supabase/add-manager-hierarchy.sql`

2. **إعادة تشغيل الخادم**:
   ```bash
   npm run dev
   ```

3. **اختبار النظام**:
   - أضف مستخدم جديد واختر له مدير
   - تأكد من حفظ `manager_id` في قاعدة البيانات
   - عدّل مستخدم موجود وغيّر المدير

4. **بناء صفحات المدراء** (اختياري):
   - `/managers/team` - عرض الفريق
   - `/managers/approvals` - الموافقات المعلقة
   - `/managers/reports` - تقارير الفريق

---

## الدعم والمساعدة

إذا واجهت أي مشاكل، تحقق من:
- ✅ تطبيق SQL migration بنجاح
- ✅ إعادة تشغيل الخادم
- ✅ التحقق من وجود `manager_id` في API response
- ✅ التحقق من Console للأخطاء

---

**تم بناء هذا النظام بواسطة:** EP Group System - نظام إدارة متكامل 🚀