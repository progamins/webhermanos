import Skeleton from './ui/Skeleton';

type SectionType = 'history' | 'catalog' | 'gallery' | 'reviews' | 'faq' | 'contact' | 'order-tracking';

interface SectionSkeletonProps {
  /** Identificador de la sección para mostrar el esqueleto correspondiente */
  section: SectionType;
}

/** Esqueletos de carga con la forma exacta de cada sección del sitio.
 *  Se usa en los Suspense fallbacks de App.tsx para que el usuario vea
 *  contenido con la misma estructura visual mientras el chunk JS se descarga. */
function SectionSkeleton({ section }: SectionSkeletonProps) {
  switch (section) {
    case 'history':
      return <HistorySkeleton />;
    case 'catalog':
      return <CatalogSkeleton />;
    case 'gallery':
      return <GallerySkeleton />;
    case 'reviews':
      return <ReviewsSkeleton />;
    case 'faq':
      return <FaqSkeleton />;
    case 'contact':
      return <ContactSkeleton />;
    case 'order-tracking':
      return <OrderTrackingSkeleton />;
    default:
      return (
        <div className="py-24 flex items-center justify-center" aria-hidden="true">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Cargando...</span>
          </div>
        </div>
      );
  }
}

// ═══════════════════════════════════════════
// Section-specific skeleton layouts
// ═══════════════════════════════════════════

function HistorySkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-48 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-80 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
        </div>
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" count={3} />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-44 rounded-full mt-8" />
          </div>
          <div className="aspect-[4/3]">
            <Skeleton variant="image" className="w-full h-full rounded-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CatalogSkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-48 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-72 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
        </div>
        {/* Filter bar */}
        <div className="flex gap-4 mb-12">
          <Skeleton className="h-12 flex-1 max-w-md rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-12 w-24 rounded-full" count={4} />
          </div>
        </div>
        {/* Product grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-48 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-80 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mb-12">
          <Skeleton className="h-10 w-28 rounded-full" count={4} />
        </div>
        {/* Image grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Skeleton variant="image" className="aspect-square rounded-2xl" count={8} />
        </div>
      </div>
    </section>
  );
}

function ReviewsSkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-48 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-80 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
        </div>
        {/* Stats bar */}
        <div className="flex justify-center mb-16">
          <Skeleton className="h-8 w-64 rounded-full" />
        </div>
        {/* Review cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-[24px] p-6 border border-[var(--theme-border)]">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-3 w-full mb-2" count={3} />
              <Skeleton className="h-3 w-3/4 mt-4" />
              <Skeleton className="h-4 w-20 mt-4" />
            </div>
          ))}
        </div>
        {/* Button */}
        <div className="text-center">
          <Skeleton className="h-12 w-56 rounded-full mx-auto" />
        </div>
      </div>
    </section>
  );
}

function FaqSkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-36 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-72 mx-auto" />
          <Skeleton className="h-4 w-80 max-w-full mx-auto" />
        </div>
        {/* Accordion items */}
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-[20px] p-5 border border-[var(--theme-border)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 flex-1">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-5 w-full" />
                </div>
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              </div>
            </div>
          ))}
        </div>
        {/* CTA card */}
        <div className="mt-12 p-6 rounded-[24px] border border-[var(--theme-border)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 flex-1">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-80 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-44 rounded-full shrink-0" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactSkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <Skeleton className="h-3 w-36 mx-auto rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 max-w-full mx-auto" />
        </div>
        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left column — info cards */}
          <div className="lg:col-span-5 space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--theme-border)]">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
            {/* Map placeholder */}
            <div className="rounded-[24px] p-3.5 border border-[var(--theme-border)] space-y-3.5">
              <Skeleton variant="image" className="h-64 rounded-2xl" />
              <div className="flex gap-2.5">
                <Skeleton className="h-12 flex-1 rounded-xl" />
                <Skeleton className="h-12 flex-1 rounded-xl" />
              </div>
            </div>
          </div>
          {/* Right column — form */}
          <div className="lg:col-span-7 p-8 rounded-[32px] border border-[var(--theme-border)] space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="flex justify-center gap-6 pt-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrderTrackingSkeleton() {
  return (
    <section className="py-24" aria-hidden="true">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-3 w-40 mx-auto rounded-full" />
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-4 w-80 max-w-full mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Skeleton variant="rectangular" className="h-64 w-full rounded-2xl" />
      </div>
    </section>
  );
}

export default SectionSkeleton;
