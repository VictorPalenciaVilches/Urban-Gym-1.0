/** Full-page loading placeholders for dashboards (no extra deps). */

export function AdminPageSkeleton() {
  return (
    <div className="space-y-8 page-enter">
      <div className="space-y-2">
        <div className="h-8 w-56 skeleton max-w-full" />
        <div className="h-4 w-72 skeleton max-w-full opacity-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 sm:gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-white p-4 sm:p-5 space-y-3">
            <div className="h-10 w-10 skeleton rounded-xl" />
            <div className="h-7 w-14 skeleton" />
            <div className="h-3.5 w-24 skeleton" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-[280px] rounded-xl border border-slate-100 bg-white p-6">
          <div className="h-5 w-40 skeleton mb-2" />
          <div className="h-3 w-52 skeleton mb-6" />
          <div className="h-[160px] skeleton rounded-lg" />
        </div>
        <div className="h-[280px] rounded-xl border border-slate-100 bg-white p-6">
          <div className="h-5 w-44 skeleton mb-2" />
          <div className="h-3 w-48 skeleton mb-6" />
          <div className="h-[160px] skeleton rounded-lg" />
        </div>
      </div>
      <div className="h-40 rounded-xl border border-slate-100 bg-white" />
    </div>
  );
}

export function TrainerPageSkeleton() {
  return (
    <div className="space-y-8 page-enter">
      <div className="space-y-2">
        <div className="h-8 w-64 skeleton max-w-full" />
        <div className="h-4 w-96 skeleton max-w-full opacity-80" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
            <div className="p-3 border-b border-slate-50">
              <div className="h-10 skeleton rounded-lg" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
                <div className="h-9 w-9 skeleton rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                  <div className="h-3.5 w-3/4 skeleton max-w-[140px]" />
                  <div className="h-3 w-full skeleton max-w-[180px]" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-48 rounded-xl border border-slate-100 bg-white p-4">
            <div className="h-4 w-32 skeleton mb-3" />
            <div className="h-16 skeleton rounded-lg mb-2" />
            <div className="h-9 skeleton rounded-lg" />
          </div>
        </div>
        <div className="lg:col-span-2 h-[420px] rounded-xl border border-dashed border-slate-200 bg-white/60 skeleton" />
      </div>
    </div>
  );
}

export function DashboardSchedulesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4">
          <div className="flex justify-between gap-2">
            <div className="h-6 w-24 skeleton rounded-full" />
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-3/4 skeleton" />
            <div className="h-4 w-20 skeleton" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-28 skeleton" />
            <div className="h-4 w-14 skeleton" />
          </div>
          <div className="h-10 skeleton rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function DashboardBookingsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
      <div className="space-y-0 divide-y divide-slate-50 p-4 sm:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="py-4 space-y-2 first:pt-0">
            <div className="h-4 w-32 skeleton" />
            <div className="h-3 w-full skeleton max-w-[200px]" />
            <div className="flex gap-2 mt-3">
              <div className="h-8 flex-1 skeleton rounded-lg" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden sm:block p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-2">
            <div className="h-4 flex-1 skeleton" />
            <div className="h-4 w-20 skeleton hidden md:block" />
            <div className="h-4 w-24 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
