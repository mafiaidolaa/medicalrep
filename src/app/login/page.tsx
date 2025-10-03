
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User as UserIcon, Lock } from 'lucide-react';
import { signIn, getSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { logLogout } from '@/lib/activity-logger-client';
import LocationPermissionWrapper from '@/components/auth/LocationPermissionWrapper';


export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useTranslation();
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsLoading(true);

        if (!username || !password) {
            toast({
                variant: 'destructive',
                title: t('auth.login_failed'),
                description: t('auth.enter_credentials'),
            });
            setIsLoading(false);
            return;
        }

        try {
            const result = await signIn('credentials', {
                redirect: false, // We will handle redirect manually
                username,
                password,
                callbackUrl: window.location.origin + '/', // Use current origin with correct port
            });

            console.log('Login result:', result); // للتشخيص

            // التحقق الصحيح: النجاح فقط عندما تكون النتيجة ok=true وبدون أخطاء
            if (result?.ok && !result?.error) {
                // تحقق إضافي من الجلسة للتأكد من أن تسجيل الدخول تم بنجاح فعلاً
                const session = await getSession();
                console.log('Session check result:', session);
                
                if (session && session.user) {
                    console.log('Login successful - Session created:', session.user.username);
                    toast({
                        title: t('auth.login_successful'),
                        description: t('auth.welcome_back'),
                    });
                    
                    // Log successful login - IMMEDIATE and ROBUST
                    try {
                        console.log('🔄 Attempting to log successful login...');
                        
                        // Direct API call to ensure immediate logging with location
                        const response = await fetch('/api/activity-log', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                type: 'login',
                                title: `تسجيل دخول ناجح - ${session.user.fullName}`,
                                details: `المستخدم ${session.user.fullName} قام بتسجيل دخول ناجح، الدور: ${session.user.role || 'غير محدد'}`,
                                entityType: 'authentication',
                                entityId: session.user.id,
                                isSuccess: true,
                                // Location data
                                lat: currentLocation?.lat || null,
                                lng: currentLocation?.lng || null,
                                accuracy: currentLocation?.accuracy || null,
                                source: currentLocation ? 'gps' : 'not_available'
                            })
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            console.log('✅ Login activity logged successfully:', result);
                        } else {
                            console.warn('⚠️ Failed to log login activity:', response.status);
                        }
                        
                    } catch (logError) {
                        console.error('❌ Login logging error:', logError);
                        // Still continue with login even if logging fails
                    }
                    
                    router.push('/'); // Redirect to dashboard ONLY on successful login with valid session
                    router.refresh(); // Refresh server components
                } else {
                    console.log('Login failed - No valid session created');
                    toast({
                        variant: 'destructive',
                        title: t('auth.login_failed'),
                        description: t('auth.session_error'),
                    });
                }
            } else {
                // في جميع الحالات الأخرى (فشل تسجيل الدخول)
                console.log('Login failed - Error:', result?.error || 'Unknown error');
                toast({
                    variant: 'destructive',
                    title: t('auth.login_failed'),
                    description: t('auth.invalid_credentials'),
                });
            }
        } catch (error) {
             console.error("Login error:", error);
             toast({
                variant: 'destructive',
                title: t('auth.login_error'),
                description: t('auth.login_error_desc'),
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <LocationPermissionWrapper
            onLocationGranted={(location) => {
                console.log('✅ Location granted:', location);
                setCurrentLocation(location);
            }}
            onLocationDenied={() => {
                console.log('⚠️ Location denied or skipped');
                setCurrentLocation(null);
            }}
        >
            <main className="w-full min-h-screen flex items-center justify-center p-4 bg-cover bg-center" style={{ backgroundImage: `url(https://picsum.photos/1920/1080)` }}>
                <div className="absolute inset-0 bg-black/50" />
                <div className="w-full max-w-md relative">
                    <form 
                        onSubmit={handleLogin}
                        className="bg-card/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/10 text-white"
                        autoComplete="on"
                    >
                         <div className="mb-6 text-center">
<Image src="/logo.svg" alt="EP Group Logo" width={100} height={100} className="mx-auto" data-ai-hint="logo" unoptimized />
                            <h1 className="text-2xl font-bold mt-4">EP Group System</h1>
                            {currentLocation && (
                                <div className="text-xs text-green-300 mt-2">
                                    📍 تم تحديد الموقع بنجاح
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                                <Input 
                                    type="text" 
                                    placeholder={t('auth.username_placeholder')}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10 h-12"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required 
                                    disabled={isLoading}
                                    autoComplete="username"
                                />
                            </div>
                             <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                                <Input 
                                    type="password" 
                                    placeholder={t('auth.password_placeholder')}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10 h-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                    disabled={isLoading}
                                    autoComplete="current-password"
                                />
                            </div>
                            <Button type="submit" className="w-full h-12 bg-primary/80 hover:bg-primary text-lg" disabled={isLoading}>
                                {isLoading ? t('auth.logging_in') : t('auth.login')}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>
        </LocationPermissionWrapper>
    );
}
