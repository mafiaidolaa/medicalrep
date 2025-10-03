/**
 * Currency Formatting Utilities for Egyptian Pound
 * دوال مساعدة لتنسيق الجنيه المصري
 */

/**
 * Format amount as Egyptian Pounds
 * تنسيق المبلغ بالجنيه المصري
 */
export function formatEGP(amount: number): string {
  return `${amount.toLocaleString('ar-EG')} ج.م.`;
}

/**
 * Format amount with full currency style
 * تنسيق المبلغ بنمط العملة الكامل
 */
export function formatEGPCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

/**
 * Format amount as compact EGP (for large numbers)
 * تنسيق المبلغ بشكل مضغوط للأرقام الكبيرة
 */
export function formatEGPCompact(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}م ج.م.`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}ألف ج.م.`;
  }
  return formatEGP(amount);
}

/**
 * Parse EGP string back to number
 * تحويل نص الجنيه المصري إلى رقم
 */
export function parseEGP(egpString: string): number {
  return parseFloat(egpString.replace(/[^\d.]/g, '')) || 0;
}

/**
 * Currency constants
 * ثوابت العملة
 */
export const CURRENCY = {
  CODE: 'EGP',
  SYMBOL: 'ج.م.',
  NAME: 'جنيه مصري',
  NAME_EN: 'Egyptian Pound',
  LOCALE: 'ar-EG'
} as const;