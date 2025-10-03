/**
 * 🚀 نظام تحسين الصور المتقدم
 * - WebP support مع fallback
 * - Lazy loading ذكي
 * - تحسين الأحجام التلقائي
 * - Progressive loading
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  progressive?: boolean;
}

/**
 * مكون الصورة المحسن مع تقنيات متقدمة
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'blur',
  blurDataURL,
  onLoad,
  onError,
  lazy = true,
  progressive = true,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy || priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // IntersectionObserver للـ lazy loading
  useEffect(() => {
    if (!lazy || priority || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // تحميل قبل 50px من الظهور
      }
    );

    const currentRef = imgRef.current;
    if (currentRef) {
      observer.observe(currentRef.parentElement!);
    }

    return () => observer.disconnect();
  }, [lazy, priority, shouldLoad]);

  // معالجة تحميل الصورة
  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  // إنشاء placeholder blur تلقائي
  const defaultBlurDataURL = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4gIDxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZGRkZGRkIi8+PC9zdmc+';

  // صور الطوارئ
  const fallbackSrc = '/images/placeholder.svg';

  if (!shouldLoad) {
    return (
      <div 
        ref={imgRef}
        className={cn(
          "bg-gray-200 animate-pulse rounded-md",
          className
        )}
        style={{ width, height }}
      />
    );
  }

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gray-100 text-gray-400 text-sm rounded-md",
        className
      )}>
        <span>فشل تحميل الصورة</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Progressive loading overlay */}
      {isLoading && progressive && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      )}
      
      <Image
        ref={imgRef}
        src={hasError ? fallbackSrc : src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        placeholder={placeholder}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        {...props}
      />
      
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * مكون الصور المتعددة مع carousel محسن
 */
export function OptimizedImageGallery({ 
  images, 
  className 
}: { 
  images: string[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set([0]));

  // Preload الصور المجاورة
  useEffect(() => {
    const preloadNext = () => {
      const nextIndex = (currentIndex + 1) % images.length;
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      
      setPreloadedImages(prev => new Set([...prev, nextIndex, prevIndex]));
    };

    const timer = setTimeout(preloadNext, 100);
    return () => clearTimeout(timer);
  }, [currentIndex, images.length]);

  return (
    <div className={cn("relative", className)}>
      <div className="aspect-video relative overflow-hidden rounded-lg">
        {images.map((src, index) => (
          <OptimizedImage
            key={src}
            src={src}
            alt={`صورة ${index + 1}`}
            fill
            priority={index === currentIndex}
            lazy={!preloadedImages.has(index)}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              index === currentIndex ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
      </div>
      
      {/* Navigation */}
      {images.length > 1 && (
        <div className="flex justify-center mt-2 gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentIndex ? "bg-blue-500" : "bg-gray-300"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook لتحسين الصور برمجياً
 */
export function useImageOptimization() {
  const convertToWebP = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx?.drawImage(img, 0, 0);
        
        // تحويل إلى WebP مع ضغط 80%
        const webpDataURL = canvas.toDataURL('image/webp', 0.8);
        resolve(webpDataURL);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const resizeImage = async (
    file: File, 
    maxWidth: number, 
    maxHeight: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // حساب الأبعاد الجديدة مع المحافظة على النسبة
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);
        
        const resizedDataURL = canvas.toDataURL('image/webp', 0.8);
        resolve(resizedDataURL);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  return {
    convertToWebP,
    resizeImage
  };
}