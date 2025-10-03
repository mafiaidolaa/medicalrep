import { useState, useEffect } from 'react';

interface Counts {
  areas: number;
  lines: number;
  users: number;
  products: number;
}

export function useCounts() {
  const [counts, setCounts] = useState<Counts>({
    areas: 0,
    lines: 0,
    users: 0,
    products: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const SKIP_COUNTS = process.env.NEXT_PUBLIC_SKIP_COUNTS === '1';
    if (SKIP_COUNTS) {
      // في التطوير: لا نجلب العدّادات لتخفيف الضغط
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }
    // تأجيل جلب العدّادات لما بعد أول عرض
    const timer = setTimeout(async () => {
      try {
        // جلب العدّادات من APIs خفيفة بدلاً من تحميل كل البيانات
        const [areasRes, linesRes, usersRes, productsRes] = await Promise.allSettled([
          fetch('/api/areas/count').then(r => r.ok ? r.json() : { count: 0 }),
          fetch('/api/lines/count').then(r => r.ok ? r.json() : { count: 0 }),
          fetch('/api/users/count').then(r => r.ok ? r.json() : { count: 0 }),
          fetch('/api/products/count').then(r => r.ok ? r.json() : { count: 0 }),
        ]);

        setCounts({
          areas: areasRes.status === 'fulfilled' ? (areasRes.value as any).count || 0 : 0,
          lines: linesRes.status === 'fulfilled' ? (linesRes.value as any).count || 0 : 0,
          users: usersRes.status === 'fulfilled' ? (usersRes.value as any).count || 0 : 0,
          products: productsRes.status === 'fulfilled' ? (productsRes.value as any).count || 0 : 0,
        });
      } catch (error) {
        console.warn('Failed to fetch counts:', error);
      } finally {
        setLoading(false);
      }
    }, 200); // تأجيل بسيط لضمان عدم تأثير على أول عرض

    return () => clearTimeout(timer);
  }, []);

  return { counts, loading };
}