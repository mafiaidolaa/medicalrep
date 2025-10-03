"use client";

import { SessionProvider, useSession } from 'next-auth/react';
import { useRef, useState } from 'react';
import { usePathname, useRouter, redirect } from 'next/navigation';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { LoadingSpinner } from '@/components/loading-spinner';
import { hasPermission, defaultRolesConfig } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { DataProvider, useDataProvider } from '@/lib/data-provider';

// Create a context to hold the current user
const AuthContext = createContext<{ currentUser: User | null }>({ currentUser: null });

// Custom hook to access the current user
export const useAuth = () => useContext(AuthContext);

function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      // لا تفعل شيء هنا - سيتم معالجته في useEffect
    },
  });
  
  // Client-side session memoization to avoid repeated /api/auth/session
  const sessionCacheRef = useRef<{ user: User | null; timestamp: number } | null>(null);
  const [cachedUser, setCachedUser] = useState<User | null>(null);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState(0);
  const lastValidationRef = useRef<number>(0);
  
  // دالة للتحقق من صحة بيانات المستخدم
  const isValidUser = (user: any): user is User => {
    return user && 
           typeof user.id === 'string' && 
           typeof user.role === 'string' && 
           typeof user.username === 'string';
  };
  
  // تحديث الـ cache عندما تتغير الجلسة
  useEffect(() => {
    const now = Date.now();
    
    if (status === 'authenticated' && session?.user) {
      const user = session.user as User | null;
      
      // التحقق من صحة بيانات المستخدم
      if (isValidUser(user)) {
        sessionCacheRef.current = { user, timestamp: now };
        setCachedUser(user);
        setSessionCheckAttempts(0);
      } else {
        console.error('⚠️ Invalid user data in session');
        sessionCacheRef.current = { user: null, timestamp: now };
        setCachedUser(null);
      }
    } else if (status === 'unauthenticated') {
      sessionCacheRef.current = { user: null, timestamp: now };
      setCachedUser(null);
    }
  }, [session, status]);

  const currentUser = (sessionCacheRef.current?.user ?? cachedUser ?? (session?.user as User | null)) || null;
  
  // التحقق الدوري من صحة الجلسة (كل 5 دقائق)
  useEffect(() => {
    if (!currentUser || status !== 'authenticated') return;
    
    const VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 دقائق
    const now = Date.now();
    
    // تخطي إذا كان التحقق قد تم مؤخراً
    if (now - lastValidationRef.current < VALIDATION_INTERVAL) {
      return;
    }
    
        const validateSession = async () => {
      try {
        // retry small times to avoid transient dev NetworkError
        const tryFetch = async (attempt = 0): Promise<Response> => {
          try {
            return await fetch('/api/auth/session', { cache: 'no-store', keepalive: true });
          } catch (e) {
            if (attempt < 2) {
              await new Promise(r => setTimeout(r, 300));
              return tryFetch(attempt + 1);
            }
            throw e;
          }
        };
        const response = await tryFetch();
        if (!response.ok || response.status === 401) {
          console.warn('⚠️ Session validation failed - redirecting to login');
          router.replace('/login');
        } else {
          lastValidationRef.current = now;
        }
      } catch (error) {
        console.warn('⚠️ Session validation network error (ignored in dev):', error);
      }
    };
    
    validateSession();
  }, [currentUser, status, router, pathname]);

  useEffect(() => {
    if (status === 'loading') return; // Do nothing while loading

    const isPublicPath = pathname === '/login' || pathname === '/offline';

    // حماية من المحاولات المتعددة للوصول
    if (!currentUser && !isPublicPath) {
      if (sessionCheckAttempts > 3) {
        console.error('⚠️ Multiple failed authentication attempts detected');
        // يمكن إضافة إجراءات أمنية إضافية هنا
      }
      setSessionCheckAttempts(prev => prev + 1);
      router.replace('/login');
      return;
    }

    // إعادة توجيه المستخدمين المصادق عليهم من صفحة الدخول
    if (currentUser && pathname === '/login' && status === 'authenticated') {
      // التحقق من عدم وجود تسجيل خروج حديث
      const logoutTime = localStorage.getItem('logout_timestamp');
      const isRecentLogout = logoutTime && (Date.now() - parseInt(logoutTime)) < 5000; // 5 ثواني
      
      if (!isRecentLogout) {
        console.log('✅ Authenticated user on login page - redirecting to dashboard');
        localStorage.removeItem('logout_timestamp');
        router.replace('/');
        return;
      } else {
        // مسح طابع تسجيل الخروج بعد فترة قصيرة
        setTimeout(() => {
          localStorage.removeItem('logout_timestamp');
        }, 5000);
      }
    }
    
    // Permission check for authenticated users
    if (currentUser && !isPublicPath) {
        // Normalize the path: '/' becomes 'dashboard', '/clinics/new' becomes 'clinics'
        const pathSegments = pathname.split('/').filter(segment => segment);
        const currentModule = pathSegments.length === 0 ? 'dashboard' : pathSegments[0];
        
        if (currentModule !== 'dashboard' && !hasPermission(currentUser.role, currentModule, defaultRolesConfig)) {
            toast({
                variant: 'destructive',
                title: 'Permission Denied',
                description: "You don't have access to this page.",
            });
            router.replace('/'); // Redirect to a safe default page
            return;
        }
    }
  }, [pathname, router, toast, currentUser, status]);

  if (status === 'loading') {
    return <LoadingSpinner />;
  }
  
  if (!currentUser && pathname !== '/login') {
    return <LoadingSpinner />;
  }
  
  if (currentUser) {
    return (
      <AuthContext.Provider value={{ currentUser }}>
        <DataProvider>
          {children}
        </DataProvider>
      </AuthContext.Provider>
    );
  }

  return <>{children}</>;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
    return (
        <SessionProvider
          basePath="/api/auth"
          refetchOnWindowFocus={false}
          refetchInterval={0}
        >
            <AuthGuard>
                {children}
            </AuthGuard>
        </SessionProvider>
    )
}
