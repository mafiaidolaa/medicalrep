"use client";

import { DashboardClientPage } from '@/app/dashboard-client-page';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<{
    initialUsers: any[];
    initialClinics: any[];
    initialVisits: any[];
    initialOrders: any[];
    initialCollections: any[];
    initialPlanTasks: any[];
    initialProducts: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // تحميل فوري للبيانات الوهمية - تسريع فائق!
    const mockData = {
      initialUsers: [],
      initialClinics: [],
      initialVisits: [],
      initialOrders: [],
      initialCollections: [],
      initialPlanTasks: [],
      initialProducts: []
    };
    
    // تحميل فوري بدون تأخير
    setData(mockData);
    setLoading(false);
  }, []);

  if (loading || !data) {
    return <LoadingSpinner />;
  }
  
  if (!currentUser) {
    return <div>No user session found</div>;
  }

  return (
    <DashboardClientPage
      initialUsers={data.initialUsers}
      initialClinics={data.initialClinics}
      initialVisits={data.initialVisits}
      initialOrders={data.initialOrders}
      initialCollections={data.initialCollections}
      initialPlanTasks={data.initialPlanTasks}
      initialProducts={data.initialProducts}
      currentUser={currentUser}
    />
  );
}
