"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, Clock, XCircle, AlertTriangle, 
  Package, Truck, Home, RotateCcw, FileText,
  TrendingUp, TrendingDown, DollarSign, Calendar,
  User, MapPin, Phone, CreditCard, Gift, Percent,
  AlertCircle, Info, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  OrderStatus, OrderPriority, PaymentMethod, DiscountType,
  ORDER_STATUS_LABELS, PRIORITY_LABELS, PAYMENT_METHOD_LABELS,
  DISCOUNT_TYPE_LABELS, STATUS_COLORS, PRIORITY_COLORS
} from '@/types/orders';

// Status Badge Component
interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusIcon = (status: OrderStatus) => {
    const iconClass = "h-3 w-3 ml-1";
    switch (status) {
      case 'draft': return <FileText className={iconClass} />;
      case 'pending': return <Clock className={iconClass} />;
      case 'approved': return <CheckCircle className={iconClass} />;
      case 'rejected': return <XCircle className={iconClass} />;
      case 'processing': return <Package className={iconClass} />;
      case 'shipped': return <Truck className={iconClass} />;
      case 'delivered': return <Home className={iconClass} />;
      case 'cancelled': return <XCircle className={iconClass} />;
      case 'returned': return <RotateCcw className={iconClass} />;
      default: return <Clock className={iconClass} />;
    }
  };

  const getVariant = (status: OrderStatus) => {
    switch (STATUS_COLORS[status]) {
      case 'green': return 'default';
      case 'yellow': return 'secondary';
      case 'red': return 'destructive';
      case 'blue': return 'secondary';
      case 'purple': return 'secondary';
      case 'orange': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Badge 
      variant={getVariant(status)}
      className={cn("flex items-center gap-1", className)}
    >
      {getStatusIcon(status)}
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

// Priority Badge Component
interface PriorityBadgeProps {
  priority: OrderPriority;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityIcon = (priority: OrderPriority) => {
    const iconClass = "h-3 w-3 ml-1";
    switch (priority) {
      case 'urgent': return <AlertTriangle className={iconClass} />;
      case 'high': return <TrendingUp className={iconClass} />;
      case 'medium': return <Info className={iconClass} />;
      case 'low': return <TrendingDown className={iconClass} />;
      default: return <Info className={iconClass} />;
    }
  };

  const getVariant = (priority: OrderPriority) => {
    switch (PRIORITY_COLORS[priority]) {
      case 'red': return 'destructive';
      case 'orange': return 'secondary';
      case 'blue': return 'default';
      case 'gray': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Badge 
      variant={getVariant(priority)}
      className={cn("flex items-center gap-1", className)}
    >
      {getPriorityIcon(priority)}
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

// Payment Method Badge
interface PaymentMethodBadgeProps {
  method: PaymentMethod;
  className?: string;
}

export function PaymentMethodBadge({ method, className }: PaymentMethodBadgeProps) {
  const getIcon = (method: PaymentMethod) => {
    const iconClass = "h-3 w-3 ml-1";
    switch (method) {
      case 'cash': return <DollarSign className={iconClass} />;
      case 'bank_transfer': return <CreditCard className={iconClass} />;
      case 'deferred': return <Calendar className={iconClass} />;
      default: return <DollarSign className={iconClass} />;
    }
  };

  return (
    <Badge variant="outline" className={cn("flex items-center gap-1", className)}>
      {getIcon(method)}
      {PAYMENT_METHOD_LABELS[method]}
    </Badge>
  );
}

// Discount Badge
interface DiscountBadgeProps {
  type: DiscountType;
  value: number;
  amount: number;
  className?: string;
}

export function DiscountBadge({ type, value, amount, className }: DiscountBadgeProps) {
  const getIcon = (type: DiscountType) => {
    const iconClass = "h-3 w-3 ml-1";
    switch (type) {
      case 'percentage': return <Percent className={iconClass} />;
      case 'fixed': return <DollarSign className={iconClass} />;
      case 'demo': return <Gift className={iconClass} />;
      default: return <Percent className={iconClass} />;
    }
  };

  const getDisplayValue = () => {
    if (type === 'demo') return 'مجاني';
    if (type === 'percentage') return `${value}%`;
    return `${value} ج.م`;
  };

  const variant = type === 'demo' ? 'default' : 'secondary';

  return (
    <Badge variant={variant} className={cn("flex items-center gap-1", className)}>
      {getIcon(type)}
      خصم {getDisplayValue()} (-{amount.toFixed(2)} ج.م)
    </Badge>
  );
}

// Order Progress Component
interface OrderProgressProps {
  status: OrderStatus;
  className?: string;
}

export function OrderProgress({ status, className }: OrderProgressProps) {
  const getProgress = (status: OrderStatus): number => {
    switch (status) {
      case 'draft': return 10;
      case 'pending': return 25;
      case 'approved': return 50;
      case 'processing': return 75;
      case 'shipped': return 90;
      case 'delivered': return 100;
      case 'rejected':
      case 'cancelled':
      case 'returned': return 0;
      default: return 0;
    }
  };

  const getColor = (status: OrderStatus): string => {
    if (['rejected', 'cancelled', 'returned'].includes(status)) {
      return 'bg-red-500';
    }
    if (status === 'delivered') {
      return 'bg-green-500';
    }
    return 'bg-blue-500';
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span>حالة الطلب</span>
        <span className="font-medium">{ORDER_STATUS_LABELS[status]}</span>
      </div>
      <Progress 
        value={getProgress(status)} 
        className="h-2"
        // Custom color would need additional styling
      />
    </div>
  );
}

// Order Stats Card
interface OrderStatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function OrderStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  className 
}: OrderStatsCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="h-8 w-8 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-1 text-xs">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-muted-foreground">مقارنة بالشهر الماضي</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Clinic Info Component
interface ClinicInfoProps {
  clinic: {
    name: string;
    doctorName?: string;
    phone?: string;
    area: string;
    line: string;
    creditLimit?: number;
    currentDebt?: number;
  };
  className?: string;
}

export function ClinicInfo({ clinic, className }: ClinicInfoProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{clinic.name}</span>
      </div>
      
      {clinic.doctorName && (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">د. {clinic.doctorName}</span>
        </div>
      )}
      
      {clinic.phone && (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{clinic.phone}</span>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{clinic.area} - {clinic.line}</span>
      </div>
      
      {clinic.creditLimit && (
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>الحد الائتماني:</span>
              <span>{clinic.creditLimit.toLocaleString()} ج.م</span>
            </div>
            {clinic.currentDebt && clinic.currentDebt > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>الديون الحالية:</span>
                <span>{clinic.currentDebt.toLocaleString()} ج.م</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>المتاح:</span>
              <span className="text-green-600">
                {((clinic.creditLimit || 0) - (clinic.currentDebt || 0)).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Order Summary Component
interface OrderSummaryProps {
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  currency?: string;
  isDemo?: boolean;
  className?: string;
}

export function OrderSummary({ 
  subtotal, 
  discountAmount, 
  finalTotal, 
  currency = 'ج.م',
  isDemo = false,
  className 
}: OrderSummaryProps) {
  return (
    <div className={cn("space-y-2 p-4 bg-muted/50 rounded-lg", className)}>
      <div className="flex justify-between text-sm">
        <span>المجموع الفرعي:</span>
        <span>{subtotal.toFixed(2)} {currency}</span>
      </div>
      
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>إجمالي الخصومات:</span>
          <span>-{discountAmount.toFixed(2)} {currency}</span>
        </div>
      )}
      
      <div className="border-t pt-2">
        <div className="flex justify-between font-bold text-lg">
          <span>الإجمالي النهائي:</span>
          <span>{finalTotal.toFixed(2)} {currency}</span>
        </div>
      </div>
      
      {isDemo && finalTotal === 0 && (
        <div className="text-center">
          <Badge className="bg-green-500 text-white">
            <Gift className="h-3 w-3 ml-1" />
            ديمو مجاني
          </Badge>
        </div>
      )}
    </div>
  );
}

// Approval Status Component
interface ApprovalStatusProps {
  approvals: Array<{
    approverType: 'manager' | 'accountant' | 'admin';
    status: 'pending' | 'approved' | 'rejected';
    approverName?: string;
  }>;
  className?: string;
}

export function ApprovalStatus({ approvals, className }: ApprovalStatusProps) {
  const getApproverLabel = (type: string) => {
    switch (type) {
      case 'manager': return 'المدير';
      case 'accountant': return 'المحاسب';
      case 'admin': return 'الإدارة';
      default: return type;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="font-medium text-sm">حالة الاعتماد:</h4>
      {approvals.map((approval, index) => (
        <div key={index} className="flex items-center justify-between text-sm">
          <span>{getApproverLabel(approval.approverType)}:</span>
          <StatusBadge status={approval.status as OrderStatus} />
        </div>
      ))}
    </div>
  );
}

// Rating Component for Order Quality
interface OrderRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function OrderRating({ 
  rating, 
  maxRating = 5, 
  size = 'md', 
  readonly = true,
  onRatingChange,
  className 
}: OrderRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;
        
        return (
          <button
            key={index}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onRatingChange?.(starValue)}
            className={cn(
              "transition-colors",
              sizeClasses[size],
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
              isFilled ? "text-yellow-400" : "text-gray-300"
            )}
          >
            <Star className={cn("fill-current", sizeClasses[size])} />
          </button>
        );
      })}
      <span className="text-xs text-muted-foreground mr-1">
        ({rating}/{maxRating})
      </span>
    </div>
  );
}