"use client";

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useSimpleActivityLogger } from '@/hooks/use-simple-activity-logger';
import { useToast } from '@/hooks/use-toast';

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ 
  variant = "ghost", 
  size = "default", 
  className = "",
  children 
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const { toast } = useToast();
  const { logLogout } = useSimpleActivityLogger();

  const handleLogout = async () => {
    if (!session?.user) return;

    setIsLoading(true);

    try {
      // Set logout timestamp to prevent auto re-login
      localStorage.setItem('logout_timestamp', Date.now().toString());
      
      // Log the logout activity first
      await logLogout();

      // Show success message
      toast({
        title: "تم تسجيل الخروج",
        description: "تم تسجيل الخروج بنجاح",
      });

      // Sign out after logging
      await signOut({
        redirect: true,
        callbackUrl: '/login'
      });

    } catch (error) {
      console.error('Logout error:', error);
      
      // Set logout timestamp even if logging fails
      localStorage.setItem('logout_timestamp', Date.now().toString());
      
      // Still proceed with logout even if logging fails
      await signOut({
        redirect: true,
        callbackUrl: '/login'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {children || (
        <>
          <LogOut className="h-4 w-4 mr-2" />
          {isLoading ? "جاري تسجيل الخروج..." : "تسجيل الخروج"}
        </>
      )}
    </Button>
  );
}