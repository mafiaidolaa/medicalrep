// Global type declarations for missing browser APIs and third-party libraries

declare global {
  // Network Information API
  interface NetworkInformation {
    effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
    saveData?: boolean;
    downlink?: number;
    rtt?: number;
  }

  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }

  // Google Analytics gtag function
  function gtag(...args: any[]): void;

  // NextAuth global flag
  interface Window {
    __NEXT_AUTH?: boolean;
    MarkerClusterer?: any; // Google Maps MarkerClusterer
    google?: any; // Changed from typeof google to any to avoid circular reference
    googleMaps?: any; // For google maps loader
  }

  // Google Maps global
  var google: any;
  
  // Web Vitals types
  namespace WebVitals {
    interface Metric {
      name: string;
      value: number;
      delta: number;
      id: string;
    }
  }
}

export {};