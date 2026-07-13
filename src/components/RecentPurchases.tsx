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
    <div className="bg-zinc-900/95 dark:bg-zinc-950/95 py-6 border-y border-zinc-800 relative z-20 overflow-hidden" id="recent-purchases-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
            Actividad en Vivo • Maison Rosas
          </span>
          <span className="text-xs text-zinc-500 font-sans">• Compras reales de la familia Rosas Albines</span>
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
                className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center space-x-3.5 hover:border-brand-500/50 transition-all duration-300"
                id={`recent-slide-${order.id}`}
              >
                {/* Visual Icon badge */}
                <div className="p-3 bg-brand-500/10 rounded-full text-brand-400 border border-brand-500/20 shrink-0">
                  <ShoppingBag className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[11px] font-mono font-bold text-zinc-300 truncate">
                      {order.customerName}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 flex items-center space-x-1 shrink-0">
                      <Clock className="h-2.5 w-2.5 text-zinc-500" />
                      <span>{formatOrderTime(order.date)}</span>
                    </span>
                  </div>

                  <p className="text-xs font-serif font-semibold text-white truncate mt-0.5">
                    {order.productName}
                  </p>

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-zinc-900">
                    <span className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-brand-400" />
                      Sullana / Piura
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 shrink-0">
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
