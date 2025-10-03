"use client";

import { useState, useRef, useEffect } from 'react';
import { Search, Globe, LogOut, User as UserIcon, Shield, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SidebarTrigger } from './ui/sidebar';
import { AppIcon } from './ui/dynamic-logo';
import { useLanguage } from '@/hooks/use-language';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { CompleteProfileDialog } from '@/components/complete-profile-dialog';
import { defaultRolesConfig } from '@/lib/permissions';
import { useAuth } from './auth-provider';
import { signOut } from 'next-auth/react';

export function AppHeader() {
    const { toast } = useToast();
    const { t, changeLanguage, supportedLanguages } = useLanguage();
    const { currentUser } = useAuth();

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCompleteOpen, setIsCompleteOpen] = useState(false);
    const hasIncompleteProfile = !!currentUser && (!currentUser.primaryPhone || !currentUser.whatsappPhone || !currentUser.altPhone || !currentUser.profilePicture);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        // Set logout timestamp to prevent auto re-login
        localStorage.setItem('logout_timestamp', Date.now().toString());
        signOut({ callbackUrl: '/login' });
    };
    
    // This function is now a placeholder as we don't have a backend to update the user
    const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        toast({
            title: t('common.wip_title'),
            description: t('common.wip_desc'),
        });
    };

    return (
        <>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 sm:px-6">
                {/* Sidebar Trigger - visible on desktop */}
                <SidebarTrigger className="hidden md:flex" />
                
                <div className="relative flex-1">
                    <Search className="absolute ltr:left-2.5 rtl:right-2.5 top-2.5 h-4 w-4 text-muted-foreground search-icon" />
                    <Input
                        type="search"
                        placeholder={t('search_placeholder')}
                        className="w-full rounded-lg bg-muted ltr:pl-8 rtl:pr-8 md:w-[200px] lg:w-[320px]"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Globe className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {supportedLanguages.map((lang) => (
                                <DropdownMenuItem 
                                    key={lang.code} 
                                    onClick={() => changeLanguage(lang.code)}
                                >
                                    {lang.nativeName}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={currentUser?.profilePicture || `https://i.pravatar.cc/150?u=${currentUser?.id}`} alt={currentUser?.fullName} />
                                    <AvatarFallback>{currentUser?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{currentUser?.fullName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                <UserIcon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                <span>{t('profile.my_profile')}</span>
                            </DropdownMenuItem>
                            {hasIncompleteProfile && (
                              <DropdownMenuItem onClick={() => setIsCompleteOpen(true)}>
                                <AlertCircle className="ltr:mr-2 rtl:ml-2 h-4 w-4 text-amber-600" />
                                <span className="text-amber-700">{t('profile.complete_your_profile')}</span>
                              </DropdownMenuItem>
                            )}
                            <div className="px-2 py-1.5 text-sm text-muted-foreground flex items-center">
                               <Shield className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                               <span>{currentUser ? t(defaultRolesConfig[currentUser.role]?.name || currentUser.role) : ''}</span>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                                <span>{t('logout')}</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('profile.mini_profile_title')}</DialogTitle>
                        <DialogDescription>{t('profile.mini_profile_desc')}</DialogDescription>
                    </DialogHeader>
                    {currentUser && (
                        <div className="py-4 space-y-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative group">
                                    <Avatar className="h-24 w-24">
                                        <AvatarImage src={currentUser.profilePicture || `https://i.pravatar.cc/150?u=${currentUser.id}`} alt={currentUser.fullName} />
                                        <AvatarFallback className="text-3xl">{currentUser.fullName?.charAt(0) || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="absolute bottom-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {t('profile.change_picture')}
                                    </Button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleProfilePictureChange} 
                                    />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-xl font-bold">{currentUser.fullName}</h3>
                                    <p className="text-muted-foreground">{t(defaultRolesConfig[currentUser.role]?.name || currentUser.role)}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div><Label>{t('common.email')}:</Label> <span className="text-sm text-muted-foreground">{currentUser.email}</span></div>
                                <div><Label>{t('common.username')}:</Label> <span className="text-sm text-muted-foreground">{currentUser.username}</span></div>
                                <div><Label>{t('common.primaryPhone')}:</Label> <span className="text-sm text-muted-foreground">{currentUser.primaryPhone || 'N/A'}</span></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Manual Complete Profile dialog trigger */}
            <CompleteProfileDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen} autoShow={false} />
        </>
    );
}
