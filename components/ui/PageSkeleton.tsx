export function PageSkeleton({ rows = 6, kpis = 3 }: { rows?: number; kpis?: number }) {
  return <div aria-label="Cargando pantalla" className="animate-pulse space-y-4">
    <div className="h-4 w-56 rounded-md bg-slate-200" />
    <div className="flex flex-wrap gap-3"><div className="h-9 min-w-[260px] flex-1 rounded-md bg-slate-100" /><div className="h-9 w-24 rounded-md bg-slate-100" /><div className="h-9 w-28 rounded-md bg-slate-200" /></div>
    <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: kpis }).map((_, index) => <div key={index} className="h-20 rounded-md bg-slate-100" />)}</div>
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">{Array.from({ length: rows }).map((_, index) => <div key={index} className="h-11 border-b border-slate-100 bg-slate-50/70 last:border-0" />)}</div>
  </div>;
}
