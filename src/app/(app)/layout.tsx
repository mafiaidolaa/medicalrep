
import { AppLayout } from '@/components/app-layout';
import { OptimizedDataProvider } from '@/lib/optimized-data-provider';
import { DatabaseStatusAlert } from '@/components/database-status-alert';
// تم تبسيط الكود وإزالة المكونات المسببة للمشاكل

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OptimizedDataProvider>
      <DatabaseStatusAlert />
      <AppLayout>{children}</AppLayout>
    </OptimizedDataProvider>
  );
}
