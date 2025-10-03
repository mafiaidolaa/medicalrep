'use client';

import React from 'react';
import Image from 'next/image';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * UserAvatar Component
 * 
 * يعرض صورة المستخدم أو Avatar بديل مع الحروف الأولى
 * 
 * Features:
 * - ✅ يعرض صورة المستخدم إذا كانت موجودة
 * - ✅ يعرض أول حرفين من الاسم كـ fallback
 * - ✅ ألوان عشوائية ثابتة لكل مستخدم (based on name)
 * - ✅ أحجام متعددة (xs, sm, md, lg, xl)
 * - ✅ محسّن للأداء
 */
export function UserAvatar({ 
  src, 
  name, 
  username, 
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  // احصل على الاسم المستخدم
  const displayName = name || username || 'UN';

  // استخرج الحروف الأولى
  const getInitials = (fullName: string): string => {
    const trimmed = fullName.trim();
    
    // إذا كان هناك مسافة، خذ أول حرف من كل كلمة
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(' ').filter(p => p.length > 0);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return trimmed.substring(0, 2).toUpperCase();
    }
    
    // إذا لم يكن هناك مسافة، خذ أول حرفين
    return trimmed.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(displayName);

  // احصل على لون ثابت based on الاسم
  const getColorFromName = (name: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const bgColor = getColorFromName(displayName);

  // أحجام Avatar
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const sizeClass = sizes[size];

  // إذا كان هناك صورة، عرضها
  if (src) {
    return (
      <div className={`relative ${sizeClass} rounded-full overflow-hidden ${className}`}>
        <Image
          src={src}
          alt={displayName}
          fill
          className="object-cover"
          sizes={size === 'xl' ? '64px' : size === 'lg' ? '48px' : size === 'md' ? '40px' : size === 'sm' ? '32px' : '24px'}
        />
      </div>
    );
  }

  // عرض Avatar بديل مع الحروف
  return (
    <div
      className={`
        ${sizeClass}
        ${bgColor}
        rounded-full
        flex
        items-center
        justify-center
        text-white
        font-semibold
        select-none
        ${className}
      `}
    >
      {initials}
    </div>
  );
}
