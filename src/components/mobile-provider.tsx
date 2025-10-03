'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeMobile, isMobile, isCapacitor, getPlatform, vibrate } from '@/lib/mobile-utils';

interface MobileContextType {
  isMobile: boolean;
  isCapacitor: boolean;
  platform: 'ios' | 'android' | 'web';
  isOnline: boolean;
  vibrate: (type?: 'light' | 'medium' | 'heavy') => Promise<void>;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

interface MobileProviderProps {
  children: ReactNode;
}

export function MobileProvider({ children }: MobileProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const contextValue: MobileContextType = {
    isMobile: isMobile(),
    isCapacitor: isCapacitor(),
    platform: getPlatform(),
    isOnline,
    vibrate,
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize mobile optimizations
        await initializeMobile();
        
        // Set initial online status
        setIsOnline(navigator.onLine);
        
        // Listen for network changes
        const handleNetworkChange = (event: CustomEvent<{ connected: boolean }>) => {
          setIsOnline(event.detail.connected);
        };

        document.addEventListener('network-status-change', handleNetworkChange as EventListener);
        
        // Handle app lifecycle events
        const handleAppResumed = () => {
          console.log('📱 App resumed');
          // Refresh data when app comes back
          document.dispatchEvent(new CustomEvent('app-data-refresh'));
        };

        const handleAppPaused = () => {
          console.log('📱 App paused');
          // Save any pending data
          document.dispatchEvent(new CustomEvent('app-data-save'));
        };

        const handleHardwareBack = () => {
          console.log('📱 Hardware back button pressed');
          // Handle custom back button logic
          const currentPath = window.location.pathname;
          
          // Define exit confirmation paths
          const exitPaths = ['/', '/login'];
          
          if (exitPaths.includes(currentPath)) {
            // Show exit confirmation
            const shouldExit = confirm('هل تريد إغلاق التطبيق؟');
            if (shouldExit && isCapacitor()) {
              // Exit app (Capacitor will handle this)
              console.log('Exiting app...');
            }
          } else {
            // Navigate back
            window.history.back();
          }
        };

        document.addEventListener('app-resumed', handleAppResumed);
        document.addEventListener('app-paused', handleAppPaused);
        document.addEventListener('hardware-back-button', handleHardwareBack);
        
        setInitialized(true);
        console.log('📱 Mobile Provider initialized successfully');

        // Cleanup function
        return () => {
          document.removeEventListener('network-status-change', handleNetworkChange as EventListener);
          document.removeEventListener('app-resumed', handleAppResumed);
          document.removeEventListener('app-paused', handleAppPaused);
          document.removeEventListener('hardware-back-button', handleHardwareBack);
        };
      } catch (error) {
        console.error('❌ Failed to initialize Mobile Provider:', error);
        setInitialized(true); // Continue anyway
      }
    };

    initialize();
  }, []);

  // Add mobile-specific CSS classes to body
  useEffect(() => {
    const body = document.body;
    
    if (contextValue.isMobile) {
      body.classList.add('mobile-device');
    }
    
    if (contextValue.isCapacitor) {
      body.classList.add('capacitor-app');
    }
    
    body.classList.add(`platform-${contextValue.platform}`);
    
    return () => {
      body.classList.remove('mobile-device', 'capacitor-app', `platform-${contextValue.platform}`);
    };
  }, [contextValue.isMobile, contextValue.isCapacitor, contextValue.platform]);

  // Update online status in body class
  useEffect(() => {
    document.body.classList.toggle('offline', !isOnline);
  }, [isOnline]);

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
      
      {/* Mobile-specific UI elements */}
      {contextValue.isMobile && (
        <>
          {/* Network status indicator */}
          {!isOnline && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm font-medium">
              📡 غير متصل بالإنترنت
            </div>
          )}
          
          {/* Safe area spacers for mobile */}
          <div className="safe-area-top" />
          <div className="safe-area-bottom" />
        </>
      )}
    </MobileContext.Provider>
  );
}

// Hook to use mobile context
export function useMobile(): MobileContextType {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

// Utility hooks
export function useVibration() {
  const { vibrate } = useMobile();
  return vibrate;
}

export function useNetworkStatus() {
  const { isOnline } = useMobile();
  return isOnline;
}

export function usePlatform() {
  const { platform, isMobile, isCapacitor } = useMobile();
  return { platform, isMobile, isCapacitor };
}

// Export mobile utilities for direct usage
export { isMobile, isCapacitor, getPlatform } from '@/lib/mobile-utils';