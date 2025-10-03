"use client";

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useSiteSettingsValue } from '@/contexts/site-settings-context';
import { cn } from '@/lib/utils';
import { PreloaderTemplate } from '@/components/preloader-templates';

interface AdvancedTemplatePreloaderProps {
  isVisible?: boolean;
  onComplete?: () => void;
  template: PreloaderTemplate;
  className?: string;
}

export function AdvancedTemplatePreloader({ 
  isVisible = true, 
  onComplete, 
  template,
  className 
}: AdvancedTemplatePreloaderProps) {
  const siteSettings = useSiteSettingsValue();
  const [isShowing, setIsShowing] = useState(isVisible);
  const [logoError, setLogoError] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const settings = template.settings;
  
  // Progress simulation
  useEffect(() => {
    if (!settings.show_progress || !isShowing) return;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [isShowing, settings.show_progress]);
  
  // Handle hiding
  useEffect(() => {
    if (!isVisible) {
      const timer = setTimeout(() => {
        setIsShowing(false);
        onComplete?.();
      }, settings.fade_out_duration);
      
      return () => clearTimeout(timer);
    } else {
      setIsShowing(true);
    }
  }, [isVisible, settings.fade_out_duration, onComplete]);
  
  // Minimum display time
  useEffect(() => {
    if (isVisible && settings.min_display_time) {
      const timer = setTimeout(() => {
        // Additional logic can be added here
      }, settings.min_display_time);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, settings.min_display_time]);
  
  if (!isShowing) return null;
  
  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300",
        settings.blur_background && 'backdrop-blur-sm',
        !isVisible && 'opacity-0',
        className
      )}
      style={{
        backgroundColor: settings.background_color || 'hsl(var(--background))',
        color: settings.text_color || 'hsl(var(--foreground))'
      }}
    >
      <div className="flex flex-col items-center gap-8 text-center relative z-10">
        {/* Logo */}
        {settings.show_logo && (settings.logo_url || siteSettings?.logo_path) && (
          <div 
            className={cn(
              'relative flex-shrink-0',
              settings.logo_animation && 'animate-pulse'
            )}
            style={{
              width: settings.logo_size,
              height: settings.logo_size
            }}
          >
            {!logoError ? (
              <Image
                src={settings.logo_url || siteSettings?.logo_path || '/logo.png'}
                alt="System Logo"
                width={settings.logo_size}
                height={settings.logo_size}
                className="object-contain rounded-lg"
                onError={() => setLogoError(true)}
                priority
              />
            ) : (
              <div 
                className="bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20 font-bold"
                style={{
                  width: settings.logo_size,
                  height: settings.logo_size,
                  fontSize: `${settings.logo_size! * 0.3}px`
                }}
              >
                {siteSettings?.site_title?.substring(0, 2)?.toUpperCase() || 'EP'}
              </div>
            )}
          </div>
        )}
        
        {/* App Name */}
        {settings.show_app_name && (
          <h1 className="text-4xl font-bold tracking-tight">
            {siteSettings?.site_title || 'Company Management System'}
          </h1>
        )}
        
        {/* Custom Subtitle */}
        {settings.custom_subtitle && (
          <p className="text-xl max-w-md text-muted-foreground">
            {settings.custom_subtitle}
          </p>
        )}
        
        {/* Progress Bar */}
        {settings.show_progress && (
          <div className="w-80 space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: settings.animation_color
                }}
              />
            </div>
            <p className="text-sm text-center opacity-70">
              {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {/* Loading Message with Animation */}
        <div className="flex items-center gap-4">
          <svg
            className="animate-spin h-6 w-6"
            style={{ color: settings.animation_color }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-xl font-medium">
            {settings.loading_message}
          </span>
        </div>
      </div>
      
      {/* Template Description */}
      <div className="absolute bottom-8 text-center max-w-2xl px-6">
        <div className="text-sm opacity-60">
          <p className="font-medium mb-1">{template.mood}</p>
          <p className="text-xs">{template.description}</p>
        </div>
      </div>
    </div>
  );
}