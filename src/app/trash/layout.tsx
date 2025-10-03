import { AppLayout } from '@/components/app-layout';
import { OptimizedDataProvider } from '@/lib/optimized-data-provider';
import { DatabaseStatusAlert } from '@/components/database-status-alert';

export default function TrashLayout({ children }: { children: React.ReactNode }) {
  return (
    <OptimizedDataProvider>
      <DatabaseStatusAlert />
      <AppLayout>{children}</AppLayout>
    </OptimizedDataProvider>
  );
}
