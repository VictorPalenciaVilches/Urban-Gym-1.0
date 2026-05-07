import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, children, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 px-5 py-12 sm:px-8 text-center shadow-sm ${className}`}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tight text-slate-800">{title}</h3>
      {description && <p className="mt-1.5 mx-auto max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
