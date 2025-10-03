"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AdvancedPreloader, PreloaderAnimationType } from '@/components/advanced-preloader';
import { EnhancedLoadingSpinner } from '@/components/enhanced-loading-spinner';
import { PreloaderSettings } from '@/components/settings/preloader-settings';
import { Play, Settings, Eye, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface PreloaderSettings {
  animation_type?: PreloaderAnimationType;
  animation_speed?: 'fast' | 'normal' | 'slow';
  animation_color?: string;
  logo_size?: number;
  show_progress?: boolean;
  blur_background?: boolean;
  custom_subtitle?: string;
  show_app_name?: boolean;
  loading_message?: string;
  background_color?: string;
  text_color?: string;
}

const testConfigurations: Record<string, { title: string; settings: PreloaderSettings }> = {
  default: {
    title: 'Default Setup',
    settings: {}
  },
  modern: {
    title: 'Modern Design',
    settings: {
      animation_type: 'wave' as PreloaderAnimationType,
      animation_speed: 'fast' as const,
      animation_color: '#6366f1',
      logo_size: 100,
      show_progress: true,
      blur_background: true,
      custom_subtitle: 'Modern user experience'
    }
  },
  minimal: {
    title: 'Minimal Design',
    settings: {
      animation_type: 'pulse' as PreloaderAnimationType,
      animation_speed: 'normal' as const,
      animation_color: '#64748b',
      logo_size: 60,
      show_app_name: false,
      loading_message: 'Loading...',
      background_color: '#f8fafc',
      text_color: '#334155'
    }
  },
  professional: {
    title: 'Professional Design',
    settings: {
      animation_type: 'scale' as PreloaderAnimationType,
      animation_speed: 'slow' as const,
      animation_color: '#059669',
      logo_size: 120,
      background_color: '#ffffff',
      text_color: '#111827',
      loading_message: 'Preparing system...',
      custom_subtitle: 'Professional management system'
    }
  }
};

export default function TestPreloaderPage() {
  const [activePreloader, setActivePreloader] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const testPreloader = (configKey: string) => {
    setActivePreloader(configKey);
    toast.success(`Testing: ${testConfigurations[configKey as keyof typeof testConfigurations].title}`);
  };

  const stopPreloader = () => {
    setActivePreloader(null);
    toast.info('Preloader stopped');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Advanced Preloader Lab
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Test and experiment with different preloader settings and types for your application
        </p>
      </div>

      {/* Control Panel */}
      <div className="flex justify-center gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          {showSettings ? 'Hide Settings' : 'Show Settings'}
        </Button>
        
        {activePreloader && (
          <Button
            variant="destructive"
            onClick={stopPreloader}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Stop Preloader
          </Button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Control Panel</CardTitle>
          </CardHeader>
          <CardContent>
            <PreloaderSettings />
          </CardContent>
        </Card>
      )}

      {/* Test Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(testConfigurations).map(([key, config]) => (
          <Card key={key} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{config.title}</span>
                <Button
                  size="sm"
                  onClick={() => testPreloader(key)}
                  className="gap-2"
                  disabled={activePreloader === key}
                >
                  {activePreloader === key ? (
                    <>
                      <Eye className="h-4 w-4" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Test
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm space-y-2">
                  {config.settings.animation_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Animation Type:</span>
                      <span className="font-medium">{config.settings.animation_type}</span>
                    </div>
                  )}
                  {config.settings.animation_speed && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Speed:</span>
                      <span className="font-medium">{config.settings.animation_speed}</span>
                    </div>
                  )}
                  {config.settings.animation_color && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Color:</span>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: config.settings.animation_color }}
                        />
                        <span className="font-mono text-xs">{config.settings.animation_color}</span>
                      </div>
                    </div>
                  )}
                  {config.settings.logo_size && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logo Size:</span>
                      <span className="font-medium">{config.settings.logo_size}px</span>
                    </div>
                  )}
                </div>
                
                {config.settings.custom_subtitle && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm italic text-center">
                      "{config.settings.custom_subtitle}"
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Loading Spinner Test */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced System Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This test uses current system settings from the database
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => setActivePreloader('enhanced')}
                className="gap-2"
                disabled={activePreloader === 'enhanced'}
              >
                <Play className="h-4 w-4" />
                Test Enhanced System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Preloader */}
      {activePreloader && activePreloader !== 'enhanced' && (
        <AdvancedPreloader
          isVisible={true}
          settings={testConfigurations[activePreloader as keyof typeof testConfigurations].settings}
          onComplete={stopPreloader}
          className="cursor-pointer"
        />
      )}
      
      {activePreloader === 'enhanced' && (
        <EnhancedLoadingSpinner
          onComplete={stopPreloader}
          className="cursor-pointer"
        />
      )}
    </div>
  );
}