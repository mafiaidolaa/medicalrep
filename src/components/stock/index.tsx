/**
 * 🏭 EP Group System - Stock Management Components Index
 * فهرس واجهات إدارة المخازن الرئيسية
 */

import React, { useState } from 'react';
import { 
  Package, BarChart3, ArrowUpDown, FileText, 
  Settings, Users, Shield, Trash2,
  ChevronLeft, Home, AlertTriangle,
  TrendingUp, Warehouse, Activity
} from 'lucide-react';

// استيراد المكونات
import StockDashboard from './StockDashboard';
import ProductManagement from './ProductManagement';
import InventoryManagement from './InventoryManagement';
import RequestsManagement from './RequestsManagement';
import WarehouseManagement from './WarehouseManagement';
import StockAnalyticsDashboard from './StockAnalyticsDashboard';
import StockAlertsCenter from './StockAlertsCenter';
import StockMovementTracking from './StockMovementTracking';
import StockAdjustmentSystem from './StockAdjustmentSystem';

// ==================================================================
// واجهة إدارة المخازن الرئيسية
// ==================================================================

const StockManagementSystem: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>('dashboard');

  // قائمة الوحدات المتاحة
  const modules = [
    {
      id: 'dashboard',
      name: 'لوحة التحكم',
      icon: BarChart3,
      description: 'نظرة شاملة على حالة المخازن والإحصائيات',
      color: 'blue',
      component: StockDashboard,
      category: 'main'
    },
    {
      id: 'products',
      name: 'إدارة المنتجات',
      icon: Package,
      description: 'المرجع الوحيد لأسماء وأسعار المنتجات',
      color: 'green',
      component: ProductManagement,
      category: 'main'
    },
    {
      id: 'inventory',
      name: 'إدارة المخزون',
      icon: ArrowUpDown,
      description: 'تتبع مستويات المخزون والحركات بين المخازن',
      color: 'purple',
      component: InventoryManagement,
      category: 'main'
    },
    {
      id: 'requests',
      name: 'طلبات المخازن',
      icon: FileText,
      description: 'إدارة طلبات الصرف والتوريد والموافقات',
      color: 'orange',
      component: RequestsManagement,
      category: 'main'
    },
    {
      id: 'warehouses',
      name: 'إدارة المخازن',
      icon: Warehouse,
      description: 'إدارة المخازن والمواقع والسعات',
      color: 'indigo',
      component: WarehouseManagement,
      category: 'management'
    },
    {
      id: 'analytics',
      name: 'التحليلات المتقدمة',
      icon: TrendingUp,
      description: 'تحليلات وإحصائيات متقدمة للمخازن',
      color: 'cyan',
      component: StockAnalyticsDashboard,
      category: 'analytics'
    },
    {
      id: 'alerts',
      name: 'مركز التنبيهات',
      icon: AlertTriangle,
      description: 'تنبيهات المخزون المنخفض والتحديثات الهامة',
      color: 'red',
      component: StockAlertsCenter,
      category: 'monitoring'
    },
    {
      id: 'movements',
      name: 'تتبع الحركات',
      icon: Activity,
      description: 'تتبع مفصل لجميع حركات المخازن',
      color: 'emerald',
      component: StockMovementTracking,
      category: 'monitoring'
    },
    {
      id: 'adjustments',
      name: 'تسويات المخزون',
      icon: Settings,
      description: 'إدارة تسويات وتصحيحات المخزون',
      color: 'gray',
      component: StockAdjustmentSystem,
      category: 'management'
    }
  ];

  const currentModule = modules.find(m => m.id === activeModule);

  const getColorClasses = (color: string, isActive: boolean = false) => {
    const colors = {
      blue: isActive ? 'bg-blue-100 text-blue-900 border-blue-200' : 'text-blue-600 hover:bg-blue-50',
      green: isActive ? 'bg-green-100 text-green-900 border-green-200' : 'text-green-600 hover:bg-green-50',
      purple: isActive ? 'bg-purple-100 text-purple-900 border-purple-200' : 'text-purple-600 hover:bg-purple-50',
      orange: isActive ? 'bg-orange-100 text-orange-900 border-orange-200' : 'text-orange-600 hover:bg-orange-50',
      indigo: isActive ? 'bg-indigo-100 text-indigo-900 border-indigo-200' : 'text-indigo-600 hover:bg-indigo-50',
      cyan: isActive ? 'bg-cyan-100 text-cyan-900 border-cyan-200' : 'text-cyan-600 hover:bg-cyan-50',
      red: isActive ? 'bg-red-100 text-red-900 border-red-200' : 'text-red-600 hover:bg-red-50',
      emerald: isActive ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'text-emerald-600 hover:bg-emerald-50',
      gray: isActive ? 'bg-gray-100 text-gray-900 border-gray-200' : 'text-gray-600 hover:bg-gray-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (activeModule !== 'dashboard' && currentModule) {
    // عرض الوحدة المختارة
    const ModuleComponent = currentModule.component;
    return (
      <div className="min-h-screen bg-gray-50">
        {/* شريط التنقل العلوي */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveModule('dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Home className="h-4 w-4" />
                <span>لوحة التحكم</span>
              </button>
              
              <ChevronLeft className="h-4 w-4 text-gray-400" />
              
              <div className="flex items-center gap-2">
                <currentModule.icon className={`h-5 w-5 ${getColorClasses(currentModule.color)}`} />
                <h1 className="text-lg font-semibold text-gray-900">
                  {currentModule.name}
                </h1>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              {currentModule.description}
            </div>
          </div>
        </div>

        {/* محتوى الوحدة */}
        <ModuleComponent />
      </div>
    );
  }

  // عرض لوحة التحكم الرئيسية
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-4">
                🏧 نظام إدارة المخازن
                <span className="text-xl font-normal bg-blue-500 px-3 py-1 rounded-full">
                  EP Group
                </span>
              </h1>
              <p className="text-blue-100 mt-3 text-lg">
                نظام متكامل لإدارة المخازن والمنتجات والحركات مع دعم الموافقات الهرمية
              </p>
            </div>
            
            <div className="text-left text-sm text-blue-100">
              <p>آخر تحديث: {new Date().toLocaleDateString('ar-EG')}</p>
              <p>الإصدار: 2.0.0</p>
              <p className="mt-2 text-xs">🔒 نظام آمن ومتقدم</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* نظرة عامة سريعة */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            📊 نظرة عامة سريعة
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <StockDashboard />
          </div>
        </div>

        {/* الوحدات الرئيسية */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            🎯 الوحدات الرئيسية
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {modules.filter(m => m.category === 'main' && m.id !== 'dashboard').map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onSelect={setActiveModule}
                getColorClasses={getColorClasses}
              />
            ))}
          </div>
        </div>

        {/* وحدات الإدارة */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            ⚙️ وحدات الإدارة
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.filter(m => m.category === 'management').map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onSelect={setActiveModule}
                getColorClasses={getColorClasses}
              />
            ))}
          </div>
        </div>

        {/* وحدات المراقبة والتحليلات */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            📈 المراقبة والتحليلات
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.filter(m => m.category === 'monitoring' || m.category === 'analytics').map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onSelect={setActiveModule}
                getColorClasses={getColorClasses}
              />
            ))}
          </div>
        </div>

        {/* الميزات الرئيسية */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">⭐ الميزات الرئيسية</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Package}
              title="إدارة المنتجات المرجعية"
              description="المرجع الوحيد للأسماء والأسعار في النظام"
              features={[
                'كتالوج شامل للمنتجات',
                'إدارة الأسعار والتكاليف',
                'معلومات تفصيلية ومواصفات',
                'تتبع الفئات والعلامات التجارية'
              ]}
              color="green"
            />
            
            <FeatureCard
              icon={ArrowUpDown}
              title="إدارة المخزون المتقدمة"
              description="تتبع دقيق للمخزون والحركات"
              features={[
                'مستويات المخزون في الوقت الفعلي',
                'حركات الإدخال والصرف والنقل',
                'تنبيهات المخزون المنخفض',
                'تقارير مفصلة للحركات'
              ]}
              color="purple"
            />
            
            <FeatureCard
              icon={FileText}
              title="نظام الطلبات والموافقات"
              description="سير عمل منظم للطلبات والموافقات"
              features={[
                'طلبات الصرف والتوريد',
                'موافقات هرمية متعددة المستويات',
                'تتبع حالة الطلبات',
                'إشعارات تلقائية'
              ]}
              color="orange"
            />
          </div>
        </div>

        {/* الدمج مع الأقسام الأخرى */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">🔄 الدمج مع الأقسام الأخرى</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IntegrationCard
              title="نظام الطلبات"
              description="دمج تلقائي مع طلبات العملاء"
              features={['إنشاء طلبات صرف تلقائياً', 'فحص توفر المنتجات', 'حجز المخزون']}
              icon="🛍️"
            />
            
            <IntegrationCard
              title="النظام المحاسبي"
              description="ربط مع الحسابات والتكاليف"
              features={['قيود محاسبية تلقائية', 'تقارير التقييم', 'مزامنة البيانات']}
              icon="💼"
            />
            
            <IntegrationCard
              title="إدارة الموافقات"
              description="سير موافقات هرمي متقدم"
              features={['مستويات موافقة متعددة', 'تتبع المسؤوليات', 'إشعارات ذكية']}
              icon="✅"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-12 pt-8 border-t border-gray-200">
          <p>© 2024 EP Group - نظام إدارة المخازن المتكامل</p>
          <p className="mt-1">تم التطوير بمعايير الجودة العالية والأمان المتقدم</p>
        </div>
      </div>
    </div>
  );
};

// ==================================================================
// مكونات مساعدة
// ==================================================================

interface ModuleCardProps {
  module: any;
  onSelect: (moduleId: string) => void;
  getColorClasses: (color: string, isActive?: boolean) => string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onSelect, getColorClasses }) => {
  return (
    <div
      onClick={() => onSelect(module.id)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg ${getColorClasses(module.color)}`}>
          <module.icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{module.name}</h3>
        </div>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{module.description}</p>
      
      <div className={`inline-flex items-center gap-2 text-sm font-medium ${getColorClasses(module.color)}`}>
        <span>فتح الوحدة</span>
        <ChevronLeft className="h-4 w-4" />
      </div>
    </div>
  );
};

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  features: string[];
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, features, color }) => {
  const getColorClasses = () => {
    const colors = {
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      orange: 'text-orange-600 bg-orange-50'
    };
    return colors[color as keyof typeof colors] || colors.green;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${getColorClasses()}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface IntegrationCardProps {
  title: string;
  description: string;
  features: string[];
  icon: string;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ title, description, features, icon }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl">{icon}</div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
            <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StockManagementSystem;