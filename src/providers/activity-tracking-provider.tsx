"use client";

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useSilentGeolocation } from '@/hooks/use-silent-geolocation';
import { ActivityTracker } from '@/lib/silent-activity-tracker';
import { SystemDiagnostics } from '@/lib/system-diagnostics';

export function ActivityTrackingProvider({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const { getLocationWithFallback } = useSilentGeolocation();
    const [hasLoggedIn, setHasLoggedIn] = useState(false);
    const isTrackingRef = useRef(false);
    const logoutTrackedRef = useRef(false);
    const sessionIdRef = useRef<string | null>(null);
    const [diagnosticsRun, setDiagnosticsRun] = useState(false);
    
    // Run system diagnostics on first load
    useEffect(() => {
        if (!diagnosticsRun) {
            SystemDiagnostics.runFullDiagnostics();
            setDiagnosticsRun(true);
        }
    }, [diagnosticsRun]);
    
    // Track login when session becomes available
    useEffect(() => {
        const handleLogin = async () => {
            // Only track if we have a user and haven't tracked this session yet
            if (status === 'authenticated' && 
                session?.user && 
                !hasLoggedIn && 
                !isTrackingRef.current &&
                sessionIdRef.current !== session.user.id) {
                
                isTrackingRef.current = true;
                sessionIdRef.current = session.user.id;
                
                try {
                    // Reduced delay for faster loading
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Get location silently
                    const location = await getLocationWithFallback();
                    
                    // Transform location data to expected format
                    const locationData = location ? {
                        lat: location.latitude,
                        lng: location.longitude,
                        accuracy: location.accuracy,
                        source: location.provider,
                        locationName: location.locationName,
                        city: location.city,
                        country: location.country,
                        device: detectDevice(),
                        browser: detectBrowser(),
                        os: detectOS()
                    } : null;
                    
                    // Log location status for diagnostics
                    SystemDiagnostics.logLocationStatus(locationData);
                    
                    // Track login activity with location
                    await ActivityTracker.trackActivity({
                        type: 'login',
                        title: `تسجيل دخول - ${session.user.name || session.user.email}`,
                        details: `تم تسجيل الدخول بنجاح عبر ${locationData?.source || 'المتصفح'}`,
                        isSuccess: true,
                        location: locationData
                    });
                    
                    setHasLoggedIn(true);
                    console.log('✅ Login activity tracked silently');
                    
                } catch (error) {
                    console.warn('Login tracking failed (non-blocking):', error);
                    // Still set as logged in to prevent retries
                    setHasLoggedIn(true);
                } finally {
                    isTrackingRef.current = false;
                }
            }
        };

        handleLogin();
    }, [session, status, hasLoggedIn, getLocationWithFallback]);

    // Idle auto-logout after 10 minutes of inactivity
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user?.id) return;

        const IDLE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes
        let lastActivity = Date.now();
        let idleTimer: ReturnType<typeof setInterval> | null = null;

        const activityEvents = ['mousemove','keydown','click','scroll','touchstart','touchmove'] as const;
        const markActivity = () => { lastActivity = Date.now(); };

        // Start periodic check
        idleTimer = setInterval(async () => {
          const idleFor = Date.now() - lastActivity;
          if (idleFor >= IDLE_LIMIT_MS) {
            // Track logout silently, then sign out
            try {
              await ActivityTracker.trackActivity({
                type: 'logout',
                title: `تسجيل خروج بسبب الخمول - ${session.user.name || session.user.email}`,
                details: 'تم تسجيل الخروج تلقائيًا بعد 10 دقائق من عدم النشاط',
                isSuccess: true,
              });
            } catch {}
            // Ensure signOut is called once
            if (!logoutTrackedRef.current) {
              logoutTrackedRef.current = true;
              // Prevent auto-redirect loop: set recent logout flag
              try { localStorage.setItem('logout_timestamp', Date.now().toString()); } catch {}
              await signOut({ callbackUrl: '/login' });
            }
          }
        }, 30_000); // check every 30s

        // Bind activity listeners
        activityEvents.forEach(ev => window.addEventListener(ev, markActivity, { passive: true } as any));
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') markActivity(); });

        // Cleanup on unmount or session change
        return () => {
          if (idleTimer) clearInterval(idleTimer);
          activityEvents.forEach(ev => window.removeEventListener(ev, markActivity as any));
          document.removeEventListener('visibilitychange', () => {});
        };
    }, [status, session]);

    // Track logout on page unload/close
    useEffect(() => {
        const handleLogout = async () => {
            // Only track if we have logged in and haven't already tracked logout
            if (hasLoggedIn && session?.user && !logoutTrackedRef.current) {
                logoutTrackedRef.current = true;
                
                try {
                    // Get location quickly for logout
                    const location = await getLocationWithFallback();
                    
                    // Transform location data
                    const locationData = location ? {
                        lat: location.latitude,
                        lng: location.longitude,
                        accuracy: location.accuracy,
                        source: location.provider,
                        locationName: location.locationName,
                        city: location.city,
                        country: location.country,
                        device: detectDevice(),
                        browser: detectBrowser(),
                        os: detectOS()
                    } : null;
                    
                    // Use sendBeacon for reliable logout tracking
                    const logoutData = {
                        type: 'logout',
                        title: `تسجيل خروج - ${session.user.name || session.user.email}`,
                        details: 'تم تسجيل الخروج من النظام',
                        isSuccess: true,
                        location: locationData
                    };
                    
                    // Try sendBeacon first (most reliable)
                    if (navigator.sendBeacon) {
                        const payload = JSON.stringify(logoutData);
                        const blob = new Blob([payload], { type: 'application/json' });
                        navigator.sendBeacon('/api/activity-log/logout', blob);
                    } else {
                        // Fallback to regular fetch with no-cors
                        fetch('/api/activity-log/logout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(logoutData),
                            keepalive: true
                        }).catch(() => {
                            // Ignore errors on logout
                        });
                    }
                    
                    console.log('✅ Logout activity tracked silently');
                } catch (error) {
                    console.warn('Logout tracking failed (non-blocking):', error);
                }
            }
        };

        // Handle various ways the user might leave
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            handleLogout();
        };
        
        const handlePageHide = () => {
            handleLogout();
        };
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                handleLogout();
            }
        };

        // Add event listeners
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [hasLoggedIn, session, getLocationWithFallback]);

    // Reset state when session changes
    useEffect(() => {
        if (status === 'unauthenticated') {
            setHasLoggedIn(false);
            logoutTrackedRef.current = false;
            sessionIdRef.current = null;
            isTrackingRef.current = false;
        }
    }, [status]);

    return <>{children}</>;
}

// دوال مساعدة لكشف معلومات الجهاز
function detectDevice(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
        if (/ipad|tablet/.test(userAgent)) return 'Tablet';
        return 'Mobile';
    }
    return 'Desktop';
}

function detectBrowser(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    return 'Unknown';
}

function detectOS(): string {
    if (typeof navigator === 'undefined') return 'Unknown';
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
}
