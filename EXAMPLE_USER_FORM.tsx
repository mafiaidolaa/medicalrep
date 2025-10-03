'use client';

import React, { useState } from 'react';
import { ImageUpload } from '@/components/ui/image-upload';

/**
 * مثال على نموذج تسجيل مستخدم جديد
 * Example User Registration Form
 * 
 * يوضح كيفية استخدام ImageUpload component
 */
export function UserRegistrationForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'medical_rep',
    area: '',
    line: '',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * معالجة تغيير الصورة
   */
  const handleImageChange = (file: File | null, preview: string | null) => {
    setAvatarFile(file);
    setAvatarPreview(preview);
  };

  /**
   * معالجة تغيير الحقول
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * رفع الصورة إلى Supabase Storage
   */
  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();
      return data.url; // URL الصورة في Supabase Storage
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  /**
   * إرسال النموذج
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. إنشاء المستخدم أولاً
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create user');
      }

      const userData = await userResponse.json();
      const userId = userData.id;

      // 2. إذا كان هناك صورة، ارفعها
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, userId);
        
        // 3. حدّث المستخدم بـ URL الصورة
        if (avatarUrl) {
          await fetch(`/api/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: avatarUrl }),
          });
        }
      }

      alert('تم تسجيل المستخدم بنجاح!');
      
      // Reset form
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: 'medical_rep',
        area: '',
        line: '',
      });
      setAvatarFile(null);
      setAvatarPreview(null);

    } catch (error) {
      console.error('Error creating user:', error);
      alert('حدث خطأ أثناء تسجيل المستخدم');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">تسجيل مستخدم جديد</h2>

      {/* رفع الصورة */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          صورة المستخدم (اختياري)
        </label>
        <ImageUpload
          userName={formData.full_name}
          username={formData.username}
          currentImage={avatarPreview}
          onImageChange={handleImageChange}
          maxSizeKB={200}
        />
      </div>

      {/* الاسم الكامل */}
      <div className="mb-4">
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
          الاسم الكامل *
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* اسم المستخدم */}
      <div className="mb-4">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
          اسم المستخدم *
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* البريد الإلكتروني */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          البريد الإلكتروني *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* كلمة المرور */}
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          كلمة المرور *
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          minLength={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* الدور */}
      <div className="mb-4">
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          الدور *
        </label>
        <select
          id="role"
          name="role"
          value={formData.role}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="medical_rep">مندوب طبي</option>
          <option value="manager">مدير</option>
          <option value="accountant">محاسب</option>
          <option value="admin">مسؤول النظام</option>
        </select>
      </div>

      {/* المنطقة */}
      <div className="mb-4">
        <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
          المنطقة *
        </label>
        <input
          type="text"
          id="area"
          name="area"
          value={formData.area}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* الخط */}
      <div className="mb-6">
        <label htmlFor="line" className="block text-sm font-medium text-gray-700 mb-1">
          الخط *
        </label>
        <input
          type="text"
          id="line"
          name="line"
          value={formData.line}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* زر الإرسال */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'جاري التسجيل...' : 'تسجيل المستخدم'}
      </button>
    </form>
  );
}
