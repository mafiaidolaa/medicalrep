
"use client";

import { useState, useEffect, useRef } from 'react';
import { useDataProvider } from '@/lib/data-provider';
import type { User, Notification } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/lib/i18n'; // Using mock i18n
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

interface CompleteProfileDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    autoShow?: boolean; // default false; if true will auto-prompt when fields missing
}

export function CompleteProfileDialog({ open, onOpenChange, autoShow = false }: CompleteProfileDialogProps) {
    const t = i18n.t; // Using mock function
    const { toast } = useToast();
    const { currentUser, updateUser, isClient } = useDataProvider();

    const [isOpenInternal, setIsOpenInternal] = useState(false);
    const isControlled = typeof open === 'boolean';
    const isOpen = isControlled ? (open as boolean) : isOpenInternal;
    const [incompleteFields, setIncompleteFields] = useState<string[]>([]);
    const [hasShownInSession, setHasShownInSession] = useState(false);
    
    // Form state
    const [primaryPhone, setPrimaryPhone] = useState('');
    const [whatsappPhone, setWhatsappPhone] = useState('');
    const [altPhone, setAltPhone] = useState('');
    const [profilePicture, setProfilePicture] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Session storage key for tracking if dialog was shown
    const SESSION_KEY = 'profile_completion_shown';

    useEffect(() => {
        if (currentUser && isClient && autoShow) {
            // Check if dialog was already shown in this session
            const wasShownInSession = sessionStorage.getItem(SESSION_KEY) === 'true';
            if (wasShownInSession && !hasShownInSession) {
                setHasShownInSession(true);
                return;
            }

            const fields: string[] = [];
            if (!currentUser.primaryPhone) fields.push('primaryPhone');
            if (!currentUser.whatsappPhone) fields.push('whatsappPhone');
            if (!currentUser.altPhone) fields.push('altPhone');
            if (!currentUser.profilePicture) fields.push('profilePicture');
            
            if (fields.length > 0 && !hasShownInSession) {
                setIncompleteFields(fields);
                setPrimaryPhone(currentUser.primaryPhone || '');
                setWhatsappPhone(currentUser.whatsappPhone || '');
                setAltPhone(currentUser.altPhone || '');
                setProfilePicture(currentUser.profilePicture || null);
                
                // Mark as shown in session
                setHasShownInSession(true);
                sessionStorage.setItem(SESSION_KEY, 'true');
                
                setTimeout(() => (isControlled ? onOpenChange?.(true) : setIsOpenInternal(true)), 1500);
            } else if (fields.length === 0) {
                // Profile is complete, remove session flag
                sessionStorage.removeItem(SESSION_KEY);
                isControlled ? onOpenChange?.(false) : setIsOpenInternal(false);
            }
        }
    }, [currentUser, isClient, hasShownInSession]);

    const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicture(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSkip = () => {
        // Mark as shown in session to prevent re-showing
        sessionStorage.setItem(SESSION_KEY, 'true');
        setHasShownInSession(true);
        isControlled ? onOpenChange?.(false) : setIsOpenInternal(false);
        
        toast({
            title: "Profile completion skipped",
            description: "You can complete your profile later in Settings.",
        });
    };

    const handleSave = async () => {
        if (!currentUser) {
            console.error('No current user available');
            toast({
                variant: 'destructive',
                title: "Error",
                description: "No user session found. Please log in again.",
            });
            return;
        }

        if (!currentUser.id) {
            console.error('Current user has no ID');
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Invalid user session. Please log in again.",
            });
            return;
        }

        const updatedData: Partial<User> = { 
            primaryPhone,
            whatsappPhone,
            altPhone,
            profilePicture: profilePicture || undefined,
        };

        try {
            console.log('Attempting to update user with data:', updatedData);
            console.log('Current user ID:', currentUser.id);
            console.log('Current user object:', currentUser);
            
            await updateUser(currentUser.id, updatedData);
            
            // Clear the session flag when profile is successfully completed
            sessionStorage.removeItem(SESSION_KEY);
            setHasShownInSession(false);
            
            toast({
                title: t('profile.completion_success_title'),
                description: t('profile.completion_success_desc'),
            });
    
            isControlled ? onOpenChange?.(false) : setIsOpenInternal(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                updatedData,
                currentUser: currentUser.id
            });
            toast({
                variant: 'destructive',
                title: "Error",
                description: `Failed to update profile: ${err.message || 'Unknown error'}`,
            });
        }
    };

    if (!isOpen || !isClient) return null;

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            // If user closes dialog without saving, mark as shown to prevent re-showing
            sessionStorage.setItem(SESSION_KEY, 'true');
            setHasShownInSession(true);
        }
        isControlled ? onOpenChange?.(open) : setIsOpenInternal(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('profile.complete_your_profile')}</DialogTitle>
                    <DialogDescription>{t('profile.complete_profile_desc')}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {incompleteFields.includes('profilePicture') && (
                        <div className="flex flex-col items-center gap-2">
                            <Label>{t('profile.profile_picture')}</Label>
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={profilePicture || ''} />
                                <AvatarFallback className="text-3xl">{currentUser?.fullName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>{t('profile.upload_picture')}</Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleProfilePictureChange} />
                        </div>
                    )}
                    {incompleteFields.includes('primaryPhone') && (
                        <div className="space-y-2">
                            <Label htmlFor="primaryPhone">{t('common.primaryPhone')}</Label>
                            <Input id="primaryPhone" value={primaryPhone} onChange={e => setPrimaryPhone(e.target.value)} />
                        </div>
                    )}
                    {incompleteFields.includes('whatsappPhone') && (
                        <div className="space-y-2">
                            <Label htmlFor="whatsappPhone">{t('common.whatsappPhone')}</Label>
                            <Input id="whatsappPhone" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} />
                        </div>
                    )}
                    {incompleteFields.includes('altPhone') && (
                        <div className="space-y-2">
                            <Label htmlFor="altPhone">{t('common.altPhone')}</Label>
                            <Input id="altPhone" value={altPhone} onChange={e => setAltPhone(e.target.value)} />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleSkip}>
                        {t('common.skip')}
                    </Button>
                    <Button onClick={handleSave}>{t('common.save_changes')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
