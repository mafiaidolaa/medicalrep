// مكون مساعد للأيقونات المحسن - حل لمشاكل modularizeImports
"use client";

import { memo } from 'react';
import { LucideProps } from 'lucide-react';

// استيراد الأيقونات الأساسية بشكل عادي
export {
  // Navigation & UI
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  MoreVertical,
  
  // Actions
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  // Cancel is not available in lucide-react, using X instead
  Check,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  
  // Content
  FileText,
  File,
  Folder,
  Image,
  Video,
  Download,
  Upload,
  Share,
  Copy,
  Clipboard,
  Link,
  ExternalLink,
  
  // User & Auth
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  Key,
  Shield,
  Eye,
  EyeOff,
  
  // Business
  Building,
  Building2,
  Home,
  // Office is not available, using Building2 instead
  Store,
  Briefcase,
  ShoppingCart,
  Package,
  DollarSign,
  CreditCard,
  Receipt,
  
  // Communication
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  Send,
  Bell,
  BellRing,
  BellOff,
  
  // Time & Date
  Clock,
  Calendar,
  CalendarDays,
  Timer,
  History,
  
  // Location & Map
  MapPin,
  Map,
  Navigation,
  Locate,
  Globe,
  Compass,
  
  // Devices
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  
  // Status & Indicators
  Circle,
  CheckCircle2,
  AlertTriangle as Warning,
  Zap,
  Star,
  Heart,
  Bookmark,
  Flag,
  Target,
  TrendingUp,
  TrendingDown,
  
  // Media & Graphics
  Camera,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  
  // Tools & Settings
  Settings,
  // Tool is not available, using Wrench instead
  Wrench,
  Hammer,
  Scissors,
  Ruler,
  Palette,
  Brush,
  
  // Search & Filter
  Search,
  Filter,
  SortAsc,
  SortDesc,
  List,
  Grid,
  LayoutGrid,
  LayoutList,
  
  // Data & Analytics
  BarChart,
  BarChart2,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Database,
  Server,
  
  // Connectivity
  Wifi,
  WifiOff,
  Bluetooth,
  Usb,
  Cable,
  Radio,
  Signal,
  
  // Weather & Nature
  Sun,
  Moon,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Thermometer,
  
  // Transportation
  Car,
  Truck,
  Bus,
  Bike,
  Plane,
  Ship,
  Train,
  
  // Food & Dining
  Coffee,
  Pizza,
  Wine,
  Utensils,
  
  // Shopping & Commerce
  ShoppingBag,
  Tag,
  Ticket,
  Gift,
  
  // Social & Community
  Users2,
  // UserGroup is not available, using Users instead
  Crown,
  Award,
  Medal,
  
  // Development & Code
  Code,
  Code2,
  Terminal,
  Bug,
  GitBranch,
  Github,
  
  // Miscellaneous
  Layers,
  Box,
  Package2,
  Truck as Delivery,
  MousePointer,
  Printer,
} from 'lucide-react';

// أيقونة محسنة قابلة للتخصيص
interface OptimizedIconProps extends LucideProps {
  name?: string;
  fallback?: React.ComponentType<LucideProps>;
}

export const OptimizedIcon = memo<OptimizedIconProps>(({ 
  name, 
  fallback: Fallback,
  ...props 
}) => {
  // يمكن إضافة منطق تحميل ديناميكي هنا في المستقبل
  if (Fallback) {
    return <Fallback {...props} />;
  }
  
  // أيقونة افتراضية
  const { size, absoluteStrokeWidth, ...divProps } = props;
  // Return a simple fallback div without spreading incompatible props
  return <div className="w-4 h-4 bg-muted rounded" />;
});

OptimizedIcon.displayName = 'OptimizedIcon';

// Hook لتحميل الأيقونات بشكل ديناميكي
export function useOptimizedIcon(iconName: string) {
  // يمكن توسيع هذا في المستقبل لدعم التحميل الديناميكي
  return null;
}

// مساعدة لإنشاء أيقونات محسنة
export function createOptimizedIcon(
  Icon: React.ComponentType<LucideProps>,
  displayName?: string
) {
  const OptimizedIconComponent = memo<LucideProps>((props) => (
    <Icon {...props} />
  ));
  
  OptimizedIconComponent.displayName = displayName || Icon.displayName || 'OptimizedIcon';
  
  return OptimizedIconComponent;
}

// مجموعة أيقونات محسنة شائعة الاستخدام
export const CommonIcons = {
  // Navigation
  Menu: createOptimizedIcon(require('lucide-react').Menu, 'Menu'),
  Close: createOptimizedIcon(require('lucide-react').X, 'Close'),
  Back: createOptimizedIcon(require('lucide-react').ArrowLeft, 'Back'),
  Forward: createOptimizedIcon(require('lucide-react').ArrowRight, 'Forward'),
  
  // Actions
  Add: createOptimizedIcon(require('lucide-react').Plus, 'Add'),
  Remove: createOptimizedIcon(require('lucide-react').Minus, 'Remove'),
  Edit: createOptimizedIcon(require('lucide-react').Edit, 'Edit'),
  Delete: createOptimizedIcon(require('lucide-react').Trash2, 'Delete'),
  Save: createOptimizedIcon(require('lucide-react').Save, 'Save'),
  
  // Status
  Success: createOptimizedIcon(require('lucide-react').CheckCircle, 'Success'),
  Error: createOptimizedIcon(require('lucide-react').XCircle, 'Error'),
  Warning: createOptimizedIcon(require('lucide-react').AlertTriangle, 'Warning'),
  Info: createOptimizedIcon(require('lucide-react').Info, 'Info'),
  
  // Business
  Clinic: createOptimizedIcon(require('lucide-react').Building, 'Clinic'),
  Visit: createOptimizedIcon(require('lucide-react').Briefcase, 'Visit'),
  Order: createOptimizedIcon(require('lucide-react').ShoppingCart, 'Order'),
  Invoice: createOptimizedIcon(require('lucide-react').FileText, 'Invoice'),
  Payment: createOptimizedIcon(require('lucide-react').CreditCard, 'Payment'),
  
  // User
  User: createOptimizedIcon(require('lucide-react').User, 'User'),
  Users: createOptimizedIcon(require('lucide-react').Users, 'Users'),
  Profile: createOptimizedIcon(require('lucide-react').UserCheck, 'Profile'),
  
  // System
  Settings: createOptimizedIcon(require('lucide-react').Settings, 'Settings'),
  Search: createOptimizedIcon(require('lucide-react').Search, 'Search'),
  Filter: createOptimizedIcon(require('lucide-react').Filter, 'Filter'),
  Download: createOptimizedIcon(require('lucide-react').Download, 'Download'),
  Upload: createOptimizedIcon(require('lucide-react').Upload, 'Upload'),
};

// تصدير نوع الأيقونة للاستخدام في TypeScript
export type IconComponent = React.ComponentType<LucideProps>;
export type { LucideProps as IconProps };