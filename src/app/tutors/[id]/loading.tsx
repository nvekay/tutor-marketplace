import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8" aria-busy="true" aria-label="Loading tutor">
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="mt-2 h-4 w-80 max-w-full" />
            </div>
          </div>
          <Skeleton className="mt-6 h-16 w-full" />
          <div className="mt-8 grid grid-cols-7 gap-2">
            {Array.from({ length: 21 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
