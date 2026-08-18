import { Skeleton } from '@/components/ui/Skeleton';

export default function CompareLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <span role="status" className="sr-only">
        Cargando el comparador…
      </span>

      {/* Cabecera */}
      <div className="mb-12">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-10 w-[30rem] max-w-full md:h-12" />
        </div>
        <Skeleton className="h-6 w-[32rem] max-w-full" />
      </div>

      <div className="space-y-8">
        {/* Los dos buscadores de piloto */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="h-[50px] w-full rounded-lg" />
            </div>
          ))}
        </div>

        {/* Invitación a elegir dos pilotos */}
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <Skeleton className="mx-auto mb-4 h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto h-5 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}