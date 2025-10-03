"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Printer, 
  Download, 
  Eye, 
  Settings, 
  RotateCcw,
  FileText,
  Palette,
  Clock,
  Save,
  Share2,
  MoreHorizontal,
  Zap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";

import { PrintSettings } from '@/lib/print-templates/print-templates';
import { PrintableData } from '@/hooks/use-advanced-print';
import { PrintSettingsDialog } from './print-settings-dialog';

interface PrintToolbarProps {
  data: PrintableData | null;
  settings: PrintSettings;
  isLoading?: boolean;
  onPrint: (data: PrintableData) => void;
  onPreview: (data: PrintableData) => void;
  onExportPDF: (data: PrintableData) => void;
  onSettingsChange: (settings: PrintSettings) => void;
  onReprintLast?: () => void;
  canReprintLast?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'extended';
}

export function PrintToolbar({
  data,
  settings,
  isLoading = false,
  onPrint,
  onPreview,
  onExportPDF,
  onSettingsChange,
  onReprintLast,
  canReprintLast = false,
  className = '',
  size = 'md',
  variant = 'default'
}: PrintToolbarProps) {
  const isDataAvailable = data && data.content && data.content.length > 0;

  const buttonSizes = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const currentButtonSize = buttonSizes[size];
  const currentIconSize = iconSizes[size];

  // إصدار مضغوط للشريط
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => isDataAvailable && onPrint(data)}
                disabled={!isDataAvailable || isLoading}
                size="sm"
                variant="default"
                className="h-8 w-8 p-0"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                ) : (
                  <Printer className="w-3 h-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>طباعة مباشرة</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => isDataAvailable && onExportPDF(data)}
                disabled={!isDataAvailable || isLoading}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Download className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تصدير PDF</TooltipContent>
          </Tooltip>

          <PrintSettingsDialog
            onApplySettings={onSettingsChange}
            onPreview={(settings) => isDataAvailable && onPreview(data)}
            onDownloadPDF={(settings) => isDataAvailable && onExportPDF(data)}
            currentSettings={settings}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                  <Settings className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>إعدادات الطباعة</TooltipContent>
            </Tooltip>
          </PrintSettingsDialog>
        </TooltipProvider>
      </div>
    );
  }

  // إصدار ممتد للشريط
  if (variant === 'extended') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-4 ${className}`}>
        {/* معلومات سريعة */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">{data?.title || 'لا يوجد محتوى'}</h3>
              <p className="text-xs text-muted-foreground">
                {isDataAvailable ? `${data.content.length} عنصر` : 'غير جاهز للطباعة'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isDataAvailable ? "default" : "secondary"}>
              {settings.template === 'official' ? 'رسمي' : 
               settings.template === 'elegant' ? 'أنيق' : 'حديث'}
            </Badge>
            {settings.includeWatermark && (
              <Badge variant="outline" className="text-xs">
                علامة مائية
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* أزرار العمليات الرئيسية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            onClick={() => isDataAvailable && onPrint(data)}
            disabled={!isDataAvailable || isLoading}
            className="h-12 flex-col gap-1"
            variant="default"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Printer className="w-4 h-4" />
            )}
            <span className="text-xs">طباعة</span>
          </Button>

          <Button
            onClick={() => isDataAvailable && onPreview(data)}
            disabled={!isDataAvailable}
            className="h-12 flex-col gap-1"
            variant="outline"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">معاينة</span>
          </Button>

          <Button
            onClick={() => isDataAvailable && onExportPDF(data)}
            disabled={!isDataAvailable || isLoading}
            className="h-12 flex-col gap-1"
            variant="outline"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs">PDF</span>
          </Button>

          <PrintSettingsDialog
            onApplySettings={onSettingsChange}
            onPreview={(settings) => isDataAvailable && onPreview(data)}
            onDownloadPDF={(settings) => isDataAvailable && onExportPDF(data)}
            currentSettings={settings}
          >
            <Button className="h-12 flex-col gap-1" variant="ghost">
              <Settings className="w-4 h-4" />
              <span className="text-xs">إعدادات</span>
            </Button>
          </PrintSettingsDialog>
        </div>

        {/* معلومات الإعدادات الحالية */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Palette className="w-3 h-3" />
            <span>نمط: {settings.template}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>A4 عمودي</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>التوقيت: {settings.includeTimestamp ? 'مفعل' : 'معطل'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Save className="w-3 h-3" />
            <span>العلامة المائية: {settings.includeWatermark ? 'مفعلة' : 'معطلة'}</span>
          </div>
        </div>
      </div>
    );
  }

  // الإصدار الافتراضي
  return (
    <div className={`flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* الأزرار الرئيسية */}
      <div className="flex items-center gap-1">
        <Button
          onClick={() => isDataAvailable && onPrint(data)}
          disabled={!isDataAvailable || isLoading}
          className={`${currentButtonSize} gap-2`}
          variant="default"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Printer className={currentIconSize} />
          )}
          {size !== 'sm' && 'طباعة'}
        </Button>

        <Button
          onClick={() => isDataAvailable && onPreview(data)}
          disabled={!isDataAvailable}
          className={`${currentButtonSize} gap-2`}
          variant="outline"
        >
          <Eye className={currentIconSize} />
          {size !== 'sm' && 'معاينة'}
        </Button>

        <Button
          onClick={() => isDataAvailable && onExportPDF(data)}
          disabled={!isDataAvailable || isLoading}
          className={`${currentButtonSize} gap-2`}
          variant="outline"
        >
          <Download className={currentIconSize} />
          {size !== 'sm' && 'PDF'}
        </Button>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {/* إعدادات وخيارات إضافية */}
      <div className="flex items-center gap-1">
        <PrintSettingsDialog
          onApplySettings={onSettingsChange}
          onPreview={(settings) => isDataAvailable && onPreview(data)}
          onDownloadPDF={(settings) => isDataAvailable && onExportPDF(data)}
          currentSettings={settings}
        >
          <Button
            className={`${currentButtonSize} gap-2`}
            variant="ghost"
          >
            <Settings className={currentIconSize} />
            {size !== 'sm' && 'إعدادات'}
          </Button>
        </PrintSettingsDialog>

        {/* قائمة الخيارات الإضافية */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`${currentButtonSize} px-2`}
            >
              <MoreHorizontal className={currentIconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>خيارات إضافية</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              {canReprintLast && (
                <DropdownMenuItem onClick={onReprintLast} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  إعادة طباعة آخر مطبوعة
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem
                onClick={() => isDataAvailable && navigator.share && navigator.share({
                  title: data.title,
                  text: data.subtitle || data.title,
                  url: window.location.href
                })}
                disabled={!isDataAvailable || !navigator.share}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                مشاركة المحتوى
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
            
            <DropdownMenuItem disabled className="gap-2 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              نمط الطباعة: {
                settings.template === 'official' ? 'EP Group الرسمي' :
                settings.template === 'elegant' ? 'كلاسيكي أنيق' :
                'حديث وبسيط'
              }
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* معلومات سريعة */}
      {size !== 'sm' && (
        <>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isDataAvailable ? (
              <>
                <FileText className="w-4 h-4" />
                <span>{data.content.length} عنصر</span>
                <Badge variant="outline" className="text-xs">جاهز</Badge>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-gray-400" />
                <span>لا يوجد محتوى</span>
                <Badge variant="secondary" className="text-xs">غير جاهز</Badge>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}