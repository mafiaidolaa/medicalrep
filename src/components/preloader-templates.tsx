"use client";

import { PreloaderSettings, PreloaderAnimationType } from '@/components/advanced-preloader';

export interface PreloaderTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'minimal' | 'premium';
  preview_colors: string[];
  settings: PreloaderSettings;
  features: string[];
  mood: string;
  best_for: string[];
}

export const PRELOADER_TEMPLATES: PreloaderTemplate[] = [
  {
    id: 'modern',
    name: 'Modern Advanced',
    description: 'Clean modern design with smooth animations',
    category: 'modern',
    preview_colors: ['#667eea', '#764ba2', '#f093fb'],
    mood: 'Elegant and modern',
    best_for: ['Tech apps', 'Startups', 'Digital platforms'],
    features: [
      'Gradient animations',
      'Smooth wave effect',
      'Advanced transparency',
      'Float effect'
    ],
    settings: {
      logo_size: 100,
      show_logo: true,
      logo_animation: true,
      loading_message: 'Preparing your experience...',
      show_app_name: true,
      custom_subtitle: 'Advanced technology at your service',
      animation_type: 'wave' as PreloaderAnimationType,
      animation_speed: 'normal',
      animation_color: '#667eea',
      background_color: '',
      text_color: '',
      blur_background: true,
      show_progress: true,
      min_display_time: 1500,
      fade_out_duration: 500
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Professional corporate design',
    category: 'professional',
    preview_colors: ['#1e3c72', '#2a5298', '#3d5aa1'],
    mood: 'Professional and trustworthy',
    best_for: ['Corporations', 'Finance', 'Government'],
    features: [
      'Corporate colors',
      'Controlled animations',
      'Progress tracking',
      'Scale effects'
    ],
    settings: {
      logo_size: 90,
      show_logo: true,
      logo_animation: false,
      loading_message: 'Preparing system...',
      show_app_name: true,
      custom_subtitle: 'Professional solutions',
      animation_type: 'scale' as PreloaderAnimationType,
      animation_speed: 'normal',
      animation_color: '#2a5298',
      background_color: '#ffffff',
      text_color: '#1e3c72',
      blur_background: false,
      show_progress: true,
      min_display_time: 1200,
      fade_out_duration: 300
    }
  }
];

export const TEMPLATE_CATEGORIES = {
  modern: { label: 'Modern', color: '#667eea' },
  professional: { label: 'Professional', color: '#2a5298' },
  creative: { label: 'Creative', color: '#ff006e' },
  minimal: { label: 'Minimal', color: '#6c757d' },
  premium: { label: 'Premium', color: '#7209b7' }
};

export const getTemplateById = (id: string): PreloaderTemplate | undefined => {
  return PRELOADER_TEMPLATES.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): PreloaderTemplate[] => {
  return PRELOADER_TEMPLATES.filter(template => template.category === category);
};

export const getAllCategories = () => {
  return Object.keys(TEMPLATE_CATEGORIES);
};

export const getTemplatePreviewColors = (templateId: string): string[] => {
  const template = getTemplateById(templateId);
  return template?.preview_colors || ['#000000'];
};

export const applyTemplateSettings = (templateId: string): PreloaderSettings => {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template with id "${templateId}" not found`);
  }
  return { ...template.settings };
};

export const getTemplateStats = () => {
  const totalTemplates = PRELOADER_TEMPLATES.length;
  const categoriesCount = Object.keys(TEMPLATE_CATEGORIES).length;
  const featuresCount = PRELOADER_TEMPLATES.reduce(
    (total, template) => total + template.features.length, 0
  );
  
  return {
    totalTemplates,
    categoriesCount,
    featuresCount,
    averageFeaturesPerTemplate: Math.round(featuresCount / totalTemplates)
  };
};

export const searchTemplates = (query: string): PreloaderTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return PRELOADER_TEMPLATES.filter(template => 
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.mood.toLowerCase().includes(lowerQuery) ||
    template.features.some(feature => feature.toLowerCase().includes(lowerQuery)) ||
    template.best_for.some(use => use.toLowerCase().includes(lowerQuery))
  );
};