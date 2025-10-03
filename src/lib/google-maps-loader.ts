// Unified Google Maps API Loader
// Prevents multiple script loading and manages global state

interface GoogleMapsConfig {
  apiKey: string;
  libraries?: string[];
  language?: string;
  region?: string;
}

interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  promise: Promise<void> | null;
}

class GoogleMapsLoader {
  private static instance: GoogleMapsLoader | null = null;
  private loadingState: LoadingState = {
    isLoading: false,
    isLoaded: false,
    error: null,
    promise: null
  };

  private constructor() {}

  public static getInstance(): GoogleMapsLoader {
    if (!GoogleMapsLoader.instance) {
      GoogleMapsLoader.instance = new GoogleMapsLoader();
    }
    return GoogleMapsLoader.instance;
  }

  public async loadGoogleMaps(config: GoogleMapsConfig): Promise<void> {
    console.log('GoogleMapsLoader: Starting to load Google Maps API with config:', config);
    
    // If already loaded, return immediately
    if (this.loadingState.isLoaded && window.google?.maps) {
      console.log('GoogleMapsLoader: API already loaded, returning immediately');
      return Promise.resolve();
    }

    // If already loading, return the existing promise
    if (this.loadingState.isLoading && this.loadingState.promise) {
      console.log('GoogleMapsLoader: API currently loading, returning existing promise');
      return this.loadingState.promise;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript && window.google?.maps) {
      console.log('GoogleMapsLoader: Script exists and google.maps available, marking as loaded');
      this.loadingState.isLoaded = true;
      return Promise.resolve();
    }

    console.log('GoogleMapsLoader: No existing valid script found, creating new one');
    if (existingScript) {
      console.log('GoogleMapsLoader: Found existing script but google.maps not available:', (existingScript as HTMLScriptElement).src);
    }

    // Start loading
    this.loadingState.isLoading = true;
    this.loadingState.error = null;

    this.loadingState.promise = new Promise<void>((resolve, reject) => {
      try {
        // Remove any existing script to prevent conflicts
        const scripts = document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]');
        console.log(`GoogleMapsLoader: Found ${scripts.length} existing Google Maps scripts to remove`);
        scripts.forEach(script => {
          if (script.parentNode) {
            console.log('GoogleMapsLoader: Removing script:', (script as HTMLScriptElement).src);
            script.parentNode.removeChild(script);
          }
        });
        
        // Also clear any window.google references if scripts were removed
        if (scripts.length > 0 && window.google) {
          console.log('GoogleMapsLoader: Clearing existing window.google reference');
          // @ts-ignore - We need to clear this for a fresh load
          delete window.google;
        }

        const script = document.createElement('script');
        const libraries = config.libraries?.join(',') || 'places,geometry';
        const language = config.language || 'ar';
        const region = config.region || 'EG';

        script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&libraries=${libraries}&language=${language}&region=${region}&loading=async`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('GoogleMapsLoader: Script loaded successfully');
          
          // Wait for the API to fully initialize with retries
          let attempts = 0;
          const maxAttempts = 10;
          const checkInterval = 200;
          
          const checkApiReady = () => {
            attempts++;
            console.log(`GoogleMapsLoader: Checking API readiness, attempt ${attempts}/${maxAttempts}`);
            
            if (window.google && window.google.maps && window.google.maps.Map) {
              console.log('GoogleMapsLoader: Google Maps API fully initialized');
              this.loadingState.isLoaded = true;
              this.loadingState.isLoading = false;
              this.loadingState.promise = null;
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error('GoogleMapsLoader: Script loaded but google.maps.Map not available after maximum attempts:', {
                hasWindow: !!window.google,
                hasMaps: !!window.google?.maps,
                hasMapConstructor: !!window.google?.maps?.Map,
                attempts
              });
              this.loadingState.error = 'Google Maps API loaded but Map constructor not available after retries';
              this.loadingState.isLoading = false;
              this.loadingState.promise = null;
              reject(new Error('Google Maps API loaded but Map constructor not available after retries'));
            } else {
              console.log('GoogleMapsLoader: API not ready yet, retrying...');
              setTimeout(checkApiReady, checkInterval);
            }
          };
          
          // Start checking after initial delay
          setTimeout(checkApiReady, checkInterval);
        };

        script.onerror = () => {
          console.error('GoogleMapsLoader: Failed to load script');
          this.loadingState.error = 'Failed to load Google Maps API';
          this.loadingState.isLoading = false;
          this.loadingState.promise = null;
          reject(new Error('Failed to load Google Maps API'));
        };

        console.log('GoogleMapsLoader: Appending script to head:', script.src);
        document.head.appendChild(script);
      } catch (error) {
        this.loadingState.error = error instanceof Error ? error.message : 'Unknown error';
        this.loadingState.isLoading = false;
        this.loadingState.promise = null;
        reject(error);
      }
    });

    return this.loadingState.promise;
  }

  public isLoaded(): boolean {
    return this.loadingState.isLoaded && !!window.google?.maps;
  }

  public isLoading(): boolean {
    return this.loadingState.isLoading;
  }

  public getError(): string | null {
    return this.loadingState.error;
  }

  public reset(): void {
    this.loadingState = {
      isLoading: false,
      isLoaded: false,
      error: null,
      promise: null
    };
  }
  
  public async forceReload(config: GoogleMapsConfig): Promise<void> {
    console.log('GoogleMapsLoader: Force reloading Google Maps API');
    
    // Reset the state
    this.reset();
    
    // Remove any existing scripts
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]');
    scripts.forEach(script => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });
    
    // Clear window.google if it exists
    if (window.google) {
      // @ts-ignore - We need to clear this for a fresh load
      delete window.google;
    }
    
    // Load fresh
    return this.loadGoogleMaps(config);
  }
}

// Export singleton instance
export const googleMapsLoader = GoogleMapsLoader.getInstance();

// Utility function for easy loading
export const loadGoogleMapsAPI = (config: GoogleMapsConfig) => {
  return googleMapsLoader.loadGoogleMaps(config);
};

// Force reload function
export const forceReloadGoogleMapsAPI = (config: GoogleMapsConfig) => {
  return googleMapsLoader.forceReload(config);
};

// Check if Google Maps is available
export const isGoogleMapsLoaded = () => {
  return googleMapsLoader.isLoaded();
};

// Get loader error
export const getGoogleMapsLoaderError = () => {
  return googleMapsLoader.getError();
};

// Type declarations for Google Maps
export interface GoogleMapsWindow extends Window {
  google?: {
    maps?: {
      Map?: any;
      Marker?: any;
      InfoWindow?: any;
      SymbolPath?: any;
      MapTypeId?: any;
      places?: any;
      geometry?: any;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
