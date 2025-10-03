import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ExpensesClientPage } from './expenses-client-page';
import { getUsers } from '@/lib/user-services';
import { getSiteSettings } from '@/lib/site-settings';

// Sample expense categories - in production, this should come from database
const sampleCategories = [
  {
    id: '1',
    name: 'travel',
    name_ar: 'مصاريف سفر',
    name_en: 'Travel Expenses',
    description: 'مصاريف السفر والإقامة والانتقالات',
    icon: 'Plane',
    color: '#3b82f6',
    is_active: true
  },
  {
    id: '2', 
    name: 'office',
    name_ar: 'مصاريف مكتبية',
    name_en: 'Office Supplies',
    description: 'أدوات مكتبية وقرطاسية',
    icon: 'Coffee',
    color: '#10b981',
    is_active: true
  },
  {
    id: '3',
    name: 'transport',
    name_ar: 'مواصلات',
    name_en: 'Transportation',
    description: 'وقود وصيانة السيارات',
    icon: 'Car',
    color: '#f59e0b',
    is_active: true
  },
  {
    id: '4',
    name: 'entertainment',
    name_ar: 'ضيافة وترفيه',
    name_en: 'Entertainment',
    description: 'مصاريف الضيافة والترفيه للعملاء',
    icon: 'Gift',
    color: '#8b5cf6',
    is_active: true
  },
  {
    id: '5',
    name: 'maintenance',
    name_ar: 'صيانة',
    name_en: 'Maintenance',
    description: 'صيانة المعدات والأجهزة',
    icon: 'Settings',
    color: '#ef4444',
    is_active: true
  },
  {
    id: '6',
    name: 'marketing',
    name_ar: 'تسويق',
    name_en: 'Marketing',
    description: 'مصاريف التسويق والإعلان',
    icon: 'Users',
    color: '#06b6d4',
    is_active: true
  }
];

interface ExpensesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has access to expenses module
  const userRole = session.user.role;
  const hasAccess = ['admin', 'manager', 'accountant', 'representative'].includes(userRole);
  
  if (!hasAccess) {
    redirect('/?error=unauthorized&message=ليس لديك صلاحية للوصول إلى نظام إدارة النفقات');
  }

  try {
    // Fetch required data
    const [users, systemSettings] = await Promise.all([
      getUsers(),
      getSiteSettings()
    ]);

    const currentUser = users.find(u => u.id === session.user.id) || {
      id: session.user.id,
      full_name: session.user.name || 'مستخدم',
      username: session.user.username || 'user',
      role: session.user.role || 'representative'
    };

    // Convert system settings to record format
    const settingsRecord = systemSettings.reduce((acc, setting) => {
      acc[`${setting.category}_${setting.setting_key}`] = 
        typeof setting.setting_value === 'string' 
          ? setting.setting_value 
          : JSON.stringify(setting.setting_value);
      return acc;
    }, {} as Record<string, string>);

    // Add default expense system settings
    const expenseSettings = {
      max_expense_amount: '10000',
      require_manager_approval: 'true',
      require_receipt: 'true',
      auto_approve_threshold: '500',
      ...settingsRecord
    };

    return (
      <ExpensesClientPage
        currentUser={currentUser}
        initialCategories={sampleCategories}
        allUsers={users}
        systemSettings={expenseSettings}
      />
    );
  } catch (error) {
    console.error('Error loading expenses page:', error);
    
    // Fallback with minimal data
    const currentUser = {
      id: session.user.id,
      full_name: session.user.name || 'مستخدم',
      username: session.user.username || 'user',
      role: session.user.role || 'representative'
    };

    const fallbackSettings = {
      max_expense_amount: '10000',
      require_manager_approval: 'true',
      require_receipt: 'true',
      auto_approve_threshold: '500'
    };

    return (
      <ExpensesClientPage
        currentUser={currentUser}
        initialCategories={sampleCategories}
        allUsers={[]}
        systemSettings={fallbackSettings}
      />
    );
  }
}