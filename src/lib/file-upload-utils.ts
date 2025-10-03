/**
 * مساعدات رفع الملفات والصور
 * يوفر وظائف للتحقق من صحة الملفات ومعالجتها وحفظها
 */

export interface FileUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 for compression
}

export interface FileUploadResult {
  success: boolean;
  data?: {
    base64: string;
    fileName: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
  };
  error?: string;
}

// القيم الافتراضية لخيارات رفع الملفات
const DEFAULT_OPTIONS: Required<FileUploadOptions> = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.9
};

/**
 * التحقق من صحة الملف
 */
export function validateFile(file: File, options: FileUploadOptions = {}): { valid: boolean; error?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // فحص نوع الملف
  if (!opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${opts.allowedTypes.join(', ')}`
    };
  }

  // فحص حجم الملف
  if (file.size > opts.maxSizeBytes) {
    const maxSizeMB = (opts.maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB} ميجابايت`
    };
  }

  return { valid: true };
}

/**
 * تحويل الملف إلى base64 مع إمكانية ضغط الصور
 */
export function processFileUpload(file: File, options: FileUploadOptions = {}): Promise<FileUploadResult> {
  return new Promise((resolve) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // التحقق من صحة الملف
    const validation = validateFile(file, options);
    if (!validation.valid) {
      resolve({
        success: false,
        error: validation.error
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // إذا كان الملف SVG، لا نحتاج لمعالجة إضافية
      if (file.type === 'image/svg+xml') {
        resolve({
          success: true,
          data: {
            base64: result,
            fileName: file.name,
            fileSize: file.size
          }
        });
        return;
      }

      // معالجة الصور العادية
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            success: false,
            error: 'خطأ في معالجة الصورة'
          });
          return;
        }

        // حساب الأبعاد الجديدة مع المحافظة على النسبة
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const aspectRatio = width / height;
          
          if (width > height) {
            width = Math.min(width, opts.maxWidth);
            height = width / aspectRatio;
          } else {
            height = Math.min(height, opts.maxHeight);
            width = height * aspectRatio;
          }
        }

        // إعداد الـ canvas
        canvas.width = width;
        canvas.height = height;

        // رسم الصورة على الـ canvas
        ctx.drawImage(img, 0, 0, width, height);

        // تحويل إلى base64 مع الضغط
        const compressedBase64 = canvas.toDataURL(file.type, opts.quality);

        // حساب الحجم الجديد
        const base64Length = compressedBase64.length - (compressedBase64.indexOf(',') + 1);
        const newSize = Math.round((base64Length * 3) / 4);

        resolve({
          success: true,
          data: {
            base64: compressedBase64,
            fileName: file.name,
            fileSize: newSize,
            dimensions: { width: Math.round(width), height: Math.round(height) }
          }
        });
      };

      img.onerror = () => {
        resolve({
          success: false,
          error: 'فشل في تحميل الصورة'
        });
      };

      img.src = result;
    };

    reader.onerror = () => {
      resolve({
        success: false,
        error: 'فشل في قراءة الملف'
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * إنشاء input مخفي لاختيار الملفات
 */
export function createFileInput(options: FileUploadOptions = {}): Promise<File | null> {
  return new Promise((resolve) => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = opts.allowedTypes.join(',');
    input.style.display = 'none';
    
    input.onchange = (event) => {
      try {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0] || null;
        console.log('تم اختيار الملف:', file?.name, file?.size, file?.type);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
        resolve(file);
      } catch (error) {
        console.error('خطأ في onchange:', error);
        if (document.body.contains(input)) {
          document.body.removeChild(input);
        }
        resolve(null);
      }
    };
    
    input.oncancel = () => {
      console.log('تم إلغاء اختيار الملف');
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      resolve(null);
    };
    
    // إضافة معالج timeout لتجنب التعليق
    const timeout = setTimeout(() => {
      console.log('timeout لاختيار الملف');
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      resolve(null);
    }, 60000); // 60 ثانية
    
    try {
      document.body.appendChild(input);
      console.log('فتح نافذة اختيار الملف...');
      input.click();
      
      // إلغاء timeout عند حدوث أي حدث
      input.addEventListener('change', () => clearTimeout(timeout));
      input.addEventListener('cancel', () => clearTimeout(timeout));
    } catch (error) {
      console.error('خطأ في فتح نافذة الملف:', error);
      clearTimeout(timeout);
      resolve(null);
    }
  });
}

/**
 * رفع الملف إلى الخادم
 */
export async function uploadFileToServer(file: File, endpoint: string, additionalData: Record<string, any> = {}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // إضافة البيانات الإضافية
    Object.keys(additionalData).forEach(key => {
      formData.append(key, String(additionalData[key]));
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `خطأ في الخادم: ${response.status}`
      };
    }

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      error: 'فشل في رفع الملف'
    };
  }
}

/**
 * حفظ الصورة في localStorage مؤقتاً
 */
export function saveImageToLocalStorage(key: string, base64Data: string): void {
  try {
    localStorage.setItem(`brand-logo-${key}`, base64Data);
  } catch (error) {
    console.error('فشل في حفظ الصورة محلياً:', error);
  }
}

/**
 * استرجاع الصورة من localStorage
 */
export function getImageFromLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(`brand-logo-${key}`);
  } catch (error) {
    console.error('فشل في استرجاع الصورة محلياً:', error);
    return null;
  }
}

/**
 * حذف الصورة من localStorage
 */
export function removeImageFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(`brand-logo-${key}`);
  } catch (error) {
    console.error('فشل في حذف الصورة محلياً:', error);
  }
}

/**
 * إنشاء معاينة للصورة
 */
export function createImagePreview(base64: string, maxWidth: number = 200, maxHeight: number = 100): HTMLImageElement {
  const img = document.createElement('img');
  img.src = base64;
  img.style.maxWidth = `${maxWidth}px`;
  img.style.maxHeight = `${maxHeight}px`;
  img.style.objectFit = 'contain';
  img.style.border = '1px solid #e5e7eb';
  img.style.borderRadius = '4px';
  return img;
}

/**
 * خيارات مخصصة لأنواع مختلفة من الشعارات
 */
export const LOGO_UPLOAD_OPTIONS = {
  main: {
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxWidth: 500,
    maxHeight: 200,
    quality: 0.9
  },
  icon: {
    maxSizeBytes: 1 * 1024 * 1024, // 1MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    maxWidth: 128,
    maxHeight: 128,
    quality: 0.9
  },
  watermark: {
    maxSizeBytes: 1 * 1024 * 1024, // 1MB
    allowedTypes: ['image/png', 'image/svg+xml'], // بحاجة للشفافية
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.8
  },
  printHeader: {
    maxSizeBytes: 1 * 1024 * 1024, // 1MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxWidth: 400,
    maxHeight: 150,
    quality: 0.95 // جودة عالية للطباعة
  }
};