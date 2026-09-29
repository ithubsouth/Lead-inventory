import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  label?: string;
}

/** Placeholder shaped like a filter bar + data table, shown while a tab's data or code loads. */
export const TableSkeleton = ({ rows = 8, columns = 6, label = 'Loading…' }: TableSkeletonProps) => (
  <div className='w-full px-3 sm:px-8 py-4 space-y-3' role='status' aria-live='polite' aria-label={label}>
    <span className='sr-only'>{label}</span>
    <div className='flex flex-wrap gap-2'>
      <Skeleton className='h-8 flex-1 min-w-[180px]' />
      <Skeleton className='h-8 w-24' />
      <Skeleton className='h-8 w-24' />
    </div>
    <div className='rounded-md border border-border/60 overflow-hidden'>
      <div className='flex gap-3 bg-muted/40 px-3 py-2'>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className='h-3 flex-1' />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className='flex gap-3 px-3 py-3 border-t border-border/40'>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className='h-3 flex-1' style={{ opacity: 1 - r * 0.08 }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
