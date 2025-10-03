"use client";

import Link, { LinkProps } from 'next/link';
import React from 'react';

// مكوّن Link مخصص يعطّل prefetch تماماً أثناء التطوير
// لتقليل الطلبات المسبقة والتحميل الزائد
const isDev = process.env.NODE_ENV !== 'production';

export interface CustomLinkProps extends Omit<LinkProps, 'prefetch'> {
  children?: React.ReactNode;
  className?: string;
  prefetch?: boolean;
}

export default function LinkNoPrefetch({ 
  prefetch, 
  ...props 
}: CustomLinkProps) {
  // في التطوير: تعطيل prefetch تماماً
  // في الإنتاج: استخدام السلوك الافتراضي أو القيمة المحددة
  const shouldPrefetch = isDev ? false : (prefetch ?? true);
  
  return <Link {...props} prefetch={shouldPrefetch} />;
}