import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { ShoppingBag, MapPin, Sparkles, Clock } from 'lucide-react';
import { Order } from '../types';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/autoplay';

interface RecentPurchasesProps {
  orders: Order[];
}

export default function RecentPurchases({ orders }: RecentPurchasesProps) {
  // Take the 10 most recent orders for social proof
  const recentOrders = orders
    .filter(o => o.status !== 'Cancelado')
    .slice(0, 10);

  if (recentOrders.length === 0) return null;

  // Helper to format date/relative time elegantly
  const formatOrderTime = (dateStr: string) => {
    if (!dateStr) return 'Reciente';
    try {
      const orderDate = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - orderDate.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 5) return 'Hace unos momentos';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} hr`;
      if (diffDays === 1) return 'Ayer';
      return `Hace ${diffDays} días`;
    } catch (e) {
      return 'Reciente';
    }
  };

  return (
    <div className="relative z-20 overflow-hidden bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 py-10 border-y border-zinc-800/50" id="recent-purchases-container">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute inset-0 m-auto" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </div>
            <h2 className="text-sm font-bold tracking-[0.15em] uppercase bg-gradient-to-r from-emerald-300 via-brand-200 to-emerald-400 bg-clip-text text-transparent">
              Compras Recientes
            </h2>
            <span className="hidden sm:inline text-zinc-600">•</span>
            <span className="text-[10px] font-mono tracking-[0.2em] text-zinc-500 uppercase hidden sm:inline">
              Maison Rosas
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Sparkles className="h-3 w-3 text-amber-400/70" />
            <span className="font-sans italic">Clientes satisfechos en todo el Perú</span>
            <Sparkles className="h-3 w-3 text-amber-400/70" />
          </div>
        </div>

        {/* Swiper Slider */}
        <Swiper
          modules={[Autoplay]}
          spaceBetween={16}
          slidesPerView={1}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true
          }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 4 }
          }}
          className="recent-orders-swiper"
        >
          {recentOrders.map((order) => (
            <SwiperSlide key={order.id}>
              <div 
                className="group bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900/80 border border-zinc-800/80 p-4 rounded-2xl flex items-center space-x-3.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 hover:scale-[1.02] transition-all duration-500 ease-out"
                id={`recent-slide-${order.id}`}
              >
                {/* Visual Icon badge */}
                <div className="relative p-3 bg-gradient-to-br from-brand-500/20 to-brand-600/10 rounded-full text-brand-300 border border-brand-500/20 shrink-0 shadow-lg shadow-brand-500/5">
                  <ShoppingBag className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-zinc-200 truncate tracking-wide">
                      {order.customerName}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-600 flex items-center gap-1 shrink-0">
                      <Clock className="h-2.5 w-2.5 text-zinc-600" />
                      <span>{formatOrderTime(order.date)}</span>
                    </span>
                  </div>

                  <p className="text-xs font-serif font-semibold text-white/90 truncate mt-0.5">
                    {order.productName}
                  </p>

                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-zinc-800">
                    <span className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-brand-500/70" />
                      Sullana / Piura
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent shrink-0">
                      S/. {order.totalPrice}
                    </span>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </div>
  );
}
