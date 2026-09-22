'use client';

export function PlanSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Header Skeleton */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-300 rounded-lg animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-slate-300 rounded animate-pulse"></div>
            <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-4 w-20 bg-slate-300 rounded animate-pulse"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200/60">
              <div className="h-6 w-12 bg-slate-300 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* Insight Skeleton */}
        <div className="bg-slate-100/70 border border-slate-200/60 rounded-lg p-4">
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-3/4 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Profile Skeleton */}
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <div className="h-4 w-24 bg-slate-300 rounded animate-pulse"></div>
        <div className="bg-slate-50/80 rounded-lg p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between items-center py-1">
              <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-3 w-16 bg-slate-300 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="px-4 sm:px-6 pb-6 space-y-4">
        <div className="h-4 w-20 bg-slate-300 rounded animate-pulse"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200/60 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-40 bg-slate-300 rounded animate-pulse"></div>
                  <div className="h-5 w-12 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-3 w-2/3 bg-slate-200 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-4">
                  <div className="h-3 w-24 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/30">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}