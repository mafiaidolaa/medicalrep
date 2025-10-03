"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'notification';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useAdvancedToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAdvancedToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // إزالة تلقائية بعد المدة المحددة
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts } = useAdvancedToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useAdvancedToast();

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'notification':
        return <Bell className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 shadow-green-100';
      case 'error':
        return 'bg-red-50 border-red-200 shadow-red-100';
      case 'warning':
        return 'bg-orange-50 border-orange-200 shadow-orange-100';
      case 'info':
        return 'bg-blue-50 border-blue-200 shadow-blue-100';
      case 'notification':
        return 'bg-purple-50 border-purple-200 shadow-purple-100';
      default:
        return 'bg-white border-gray-200 shadow-gray-100';
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border rounded-lg p-4 shadow-lg
        animate-in slide-in-from-right-full duration-300
        max-w-sm w-full
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">{getIcon()}</div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {toast.title}
          </h4>
          
          {toast.message && (
            <p className="text-sm text-gray-600 mb-3">
              {toast.message}
            </p>
          )}
          
          {toast.action && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                toast.action!.onClick();
                removeToast(toast.id);
              }}
              className="h-8 px-3 text-xs"
            >
              {toast.action.label}
            </Button>
          )}
        </div>
        
        {toast.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeToast(toast.id)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Helper hooks for quick toast types
export function useNotificationToast() {
  const { addToast } = useAdvancedToast();
  
  return useCallback((title: string, message?: string, action?: Toast['action']) => {
    addToast({
      type: 'notification',
      title,
      message,
      action,
      duration: 8000 // مدة أطول للإشعارات
    });
  }, [addToast]);
}

export function useSuccessToast() {
  const { addToast } = useAdvancedToast();
  
  return useCallback((title: string, message?: string) => {
    addToast({
      type: 'success',
      title,
      message,
      duration: 4000
    });
  }, [addToast]);
}

export function useErrorToast() {
  const { addToast } = useAdvancedToast();
  
  return useCallback((title: string, message?: string) => {
    addToast({
      type: 'error',
      title,
      message,
      duration: 6000 // مدة أطول للأخطاء
    });
  }, [addToast]);
}

export function useWarningToast() {
  const { addToast } = useAdvancedToast();
  
  return useCallback((title: string, message?: string) => {
    addToast({
      type: 'warning',
      title,
      message,
      duration: 5000
    });
  }, [addToast]);
}

export function useInfoToast() {
  const { addToast } = useAdvancedToast();
  
  return useCallback((title: string, message?: string) => {
    addToast({
      type: 'info',
      title,
      message,
      duration: 4000
    });
  }, [addToast]);
}