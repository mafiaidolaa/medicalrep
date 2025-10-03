import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import AuthProvider from '@/components/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Suspense } from 'react';
import { EnhancedLoadingSpinner } from '@/components/enhanced-loading-spinner';
import { LanguageProvider } from '@/components/language-provider';
import { SiteSettingsProvider } from '@/contexts/site-settings-context';
import { MobileProvider } from '@/components/mobile-provider';
import { ActivityTrackingProvider } from '@/providers/activity-tracking-provider';
import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'EP Group',
  description: 'Manage clinic visits and orders efficiently.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="ar" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SiteSettingsProvider>
          <LanguageProvider>
            <ThemeProvider>
              <MobileProvider>
                <Suspense fallback={<EnhancedLoadingSpinner />}>
                  <AuthProvider>
                    <ActivityTrackingProvider>
                      <div className="min-h-screen flex flex-col bg-background text-foreground">
                        {children}
                      </div>
                    </ActivityTrackingProvider>
                  </AuthProvider>
                </Suspense>
                <Toaster />
                <SonnerToaster position="top-center" richColors />
              </MobileProvider>
            </ThemeProvider>
          </LanguageProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
