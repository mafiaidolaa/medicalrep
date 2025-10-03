"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">أنت غير متصل حالياً</h1>
        <p className="text-muted-foreground mb-4">يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.</p>
        <p className="text-xs text-muted-foreground">سيتم تحميل المحتوى تلقائياً عند عودة الاتصال.</p>
      </div>
    </div>
  );
}
