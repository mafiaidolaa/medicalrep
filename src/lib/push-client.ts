export async function initPushSubscription(userId?: string) {
  try {
    if (!userId) return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Prevent duplicate subscriptions per page-load/session
    const g: any = window as any;
    g.__PUSH_SUBSCRIBED_USERS__ = g.__PUSH_SUBSCRIBED_USERS__ || new Set<string>();
    if (g.__PUSH_SUBSCRIBED_USERS__.has(userId)) return;

    // Register service worker if not already
    const reg = await navigator.serviceWorker.register('/sw.js');

    // Ask permission if needed
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    // Subscribe for push
    const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const existing = await reg.pushManager.getSubscription();
    let subscription = existing;

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC ? urlBase64ToUint8Array(VAPID_PUBLIC) : undefined,
      });
    }

    // Send subscription to server
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, subscription }),
      credentials: 'include',
    });

    // Mark as subscribed for this session to avoid spamming the API
    g.__PUSH_SUBSCRIBED_USERS__.add(userId);
  } catch (e) {
    console.warn('initPushSubscription failed:', (e as any)?.message || e);
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
