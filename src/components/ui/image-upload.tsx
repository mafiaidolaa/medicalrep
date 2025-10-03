'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import { UserAvatar } from './user-avatar';

interface ImageUploadProps {
  currentImage?: string | null;
  userName?: string | null;
  username?: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
  maxSizeKB?: number; // الحد الأقصى للحجم بالـ KB
  className?: string;
}

/**
 * ImageUpload Component
 * 
 * يتيح رفع صورة مع:
 * - ✅ معاينة فورية
 * - ✅ تحجيم تلقائي (resize + compress)
 * - ✅ تحويل إلى WebP للأداء الأفضل
 * - ✅ Avatar fallback مع الحروف الأولى
 * - ✅ إمكانية الحذف
 */
export function ImageUpload({
  currentImage,
  userName,
  username,
  onImageChange,
  maxSizeKB = 200, // افتراضي: 200KB
  className = '',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * تحجيم وضغط الصورة
   */
  const resizeAndCompressImage = async (
    file: File,
    maxWidth: number = 400,
    maxHeight: number = 400,
    quality: number = 0.8
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = document.createElement('img');
        
        img.onload = () => {
          // احسب الأبعاد الجديدة مع الحفاظ على النسبة
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }
          
          // أنشئ canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          // ارسم الصورة
          ctx.drawImage(img, 0, 0, width, height);
          
          // حوّل إلى Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              
              // أنشئ ملف جديد
              const resizedFile = new File([blob], file.name, {
                type: 'image/webp',
                lastModified: Date.now(),
              });
              
              resolve(resizedFile);
            },
            'image/webp',
            quality
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * معالجة تغيير الملف
   */
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // تحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار ملف صورة فقط');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // تحجيم وضغط الصورة
      const resizedFile = await resizeAndCompressImage(file);
      
      // تحقق من الحجم
      const sizeKB = resizedFile.size / 1024;
      if (sizeKB > maxSizeKB) {
        // إذا كان الحجم كبير، جرب ضغط أكبر
        const moreCompressed = await resizeAndCompressImage(file, 400, 400, 0.6);
        const newSizeKB = moreCompressed.size / 1024;
        
        if (newSizeKB > maxSizeKB) {
          alert(`حجم الصورة كبير جداً. الحد الأقصى: ${maxSizeKB}KB`);
          setIsProcessing(false);
          return;
        }
        
        // استخدم الصورة المضغوطة أكثر
        const previewUrl = URL.createObjectURL(moreCompressed);
        setPreview(previewUrl);
        onImageChange(moreCompressed, previewUrl);
      } else {
        // حجم مناسب
        const previewUrl = URL.createObjectURL(resizedFile);
        setPreview(previewUrl);
        onImageChange(resizedFile, previewUrl);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('حدث خطأ أثناء معالجة الصورة');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * حذف الصورة
   */
  const handleRemove = () => {
    setPreview(null);
    onImageChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * فتح مربع اختيار الملف
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* معاينة الصورة أو Avatar */}
      <div className="relative">
        <UserAvatar
          src={preview}
          name={userName}
          username={username}
          size="xl"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleClick}
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        )}
      </div>

      {/* الأزرار */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={isProcessing}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {preview ? 'تغيير الصورة' : 'رفع صورة'}
        </button>
        
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            حذف
          </button>
        )}
      </div>

      {/* Input مخفي */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* معلومات */}
      <p className="text-xs text-gray-500 text-center">
        الصورة اختيارية. الحد الأقصى للحجم: {maxSizeKB}KB
        <br />
        سيتم تحجيم الصورة تلقائياً
      </p>
    </div>
  );
}
