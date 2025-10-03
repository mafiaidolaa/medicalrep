import { createServerSupabaseClient } from '@/lib/supabase';
import { ActivityLogClientPage } from './activity-log-client-page';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import type { ActivityLog, User } from '@/lib/types';

// Server component to fetch activity logs
export default async function ActivityLogPage() {
    try {
        // Check authentication with NextAuth
        const session = await getServerSession(authOptions);
        
        if (!session || !session.user) {
            redirect('/login');
        }
        
        const currentUser = session.user as User;
        
        // Only admin and manager users can access activity logs
        if (!['admin', 'manager'].includes((currentUser.role || '').toLowerCase())) {
            return (
                <div className="container mx-auto p-6">
                    <div className="max-w-2xl mx-auto text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">وصول غير مسموح</h1>
                        <p className="text-lg text-gray-600 mb-8">
                            عذراً، لا تملك الصلاحيات اللازمة للوصول إلى سجل الأنشطة.
                        </p>
                        <a href="/" className="text-blue-600 hover:underline">العودة للصفحة الرئيسية</a>
                    </div>
                </div>
            );
        }
        
        const supabase = createServerSupabaseClient();
        
        // Define important activity types
        const importantActivityTypes = [
            'login',
            'logout', 
            'visit',
            'register_clinic',
            'order',
            'payment_created',
            'payment_confirmed',
            'expense_created'
        ];
        
        // Fetch activity logs directly from the database (faster and cookie-safe on server)
        let activityLogs = [] as any[];
        let error: any = null;

        const { data: directLogs, error: dbError } = await supabase
          .from('activity_log')
          .select(`
            *,
            users:user_id (
              id,
              full_name,
              username,
              role
            )
          `)
          .in('type', importantActivityTypes)
          .order('timestamp', { ascending: false })
          .limit(200);

        activityLogs = directLogs || [];
        error = dbError;

        // If the view-based endpoint is required for some deployments and the table query fails, you could add an optional fallback here.
        // If a database error occurred, log it but do not block the UI
        if (error) {
          console.warn('Error fetching activity logs:', error);
        }

        // Transform the data to match our ActivityLog interface
        const transformedLogs: ActivityLog[] = (activityLogs || []).map((log: any) => {
            // Handle both view format and basic table format with joined user data
            const userData = log.users || {};
            
            return {
                id: log.id,
                type: log.type || 'unknown',
                title: log.title || log.action,
                timestamp: log.timestamp,
                user: {
                    id: log.user_id,
                    name: log.user_name || userData.full_name || userData.username || 'مستخدم غير معروف',
                    role: log.user_role || userData.role || 'unknown'
                },
                clinic: log.entity_type === 'clinic' ? {
                    id: log.entity_id,
                    name: log.details || 'عيادة غير معروفة'
                } : undefined,
                details: log.details,
                ip: log.ip_address,
                realIp: log.real_ip,
                userAgent: log.user_agent,
                device: log.device || 'Unknown',
                browser: log.browser || 'Unknown',
                browserVersion: log.browser_version,
                os: log.os,
                lat: log.lat,
                lng: log.lng,
                locationName: log.location_name,
                country: log.country,
                city: log.city,
                attemptedUsername: log.attempted_username,
                attemptedPassword: log.attempted_password_hash,
                isSuccess: log.is_success,
                failureReason: log.failure_reason,
                sessionId: log.session_id,
                userId: log.user_id,
                action: log.action,
                entityType: log.entity_type,
                entityId: log.entity_id,
                changes: log.changes,
                duration: log.duration_ms,
                referrer: log.referrer,
                riskScore: log.risk_score
            };
        });

        return (
            <div className="container mx-auto p-6">
                <ActivityLogClientPage initialActivityLog={transformedLogs} />
            </div>
        );

    } catch (error) {
        console.error('Unexpected error in ActivityLogPage:', error);
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-2xl font-bold text-red-600">خطأ غير متوقع</h1>
                <p className="text-gray-600 mt-2">حدث خطأ غير متوقع. يرجى إعادة تحميل الصفحة أو الاتصال بالدعم الفني.</p>
            </div>
        );
    }
}