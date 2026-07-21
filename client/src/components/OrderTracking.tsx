import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Mail, Key, Calendar, Clock, MapPin, Sparkles, 
  CheckCircle2, AlertTriangle, Loader2, ArrowLeft, ChevronRight, 
  Cake, Check, HelpCircle, PhoneCall, Gift, FileText, User,
  Printer, Camera, X, BadgeCheck, ShieldCheck
} from 'lucide-react';
import VoucherModal from './VoucherModal';
import ScreenshotModal from './ScreenshotModal';

interface OrderTrackingProps {
  onBackToHome: () => void;
}

export default function OrderTracking({ onBackToHome }: OrderTrackingProps) {
  // Navigation & Search State
  const [searchCode, setSearchCode] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  // Workflow Phase
  // 'initial' | 'otp_pending' | 'results' | 'single_code'
  const [phase, setPhase] = useState<'initial' | 'otp_pending' | 'results' | 'single_code'>('initial');
  
  // Data State
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [voucherModalOrder, setVoucherModalOrder] = useState<any | null>(null);
  const [screenshotUrlToView, setScreenshotUrlToView] = useState<string | null>(null);
  const [screenshotTitleToView, setScreenshotTitleToView] = useState<string>('');
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverOtp, setServerOtp] = useState<string | null>(null); // Visual aid for local testing

  // Real-time SSE connection for live status updates
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Connect to SSE stream when an order is selected
  useEffect(() => {
    if (!selectedOrder) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }

    // Store current status for change detection
    prevStatusRef.current = selectedOrder.status;

    // Connect to the existing SSE stream
    const sse = new EventSource('/api/events');
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // The SSE sends event types, not order objects directly
        // So we poll for the updated order when we get an event
        if (data.type === 'order_update' || data.type === 'new_order') {
          // Poll for our specific order update
          fetch(`/api/orders?trackingCode=${selectedOrder.trackingCode}`)
            .then(r => { if (!r.ok) throw new Error('Order not found'); return r.json(); })
            .then(updatedOrder => {
              if (updatedOrder && !updatedOrder.error) {
                // Status changed?
                if (prevStatusRef.current && prevStatusRef.current !== updatedOrder.status) {
                  const statusLabels: Record<string, string> = {
                    'Confirmado': '✅ Diseño Confirmado',
                    'Preparando': '🔥 En Horneado',
                    'Decoración': '🎨 Decoración de Autor',
                    'Listo': '📦 Listo para Entrega',
                    'En camino': '🚗 En Camino / Delivery',
                    'Entregado': '🎉 Entregado con Éxito',
                    'Cancelado': '❌ Pedido Cancelado'
                  };
                  const notification = statusLabels[updatedOrder.status] || `📋 Estado actualizado: ${updatedOrder.status}`;
                  setStatusNotification(notification);
                  setTimeout(() => setStatusNotification(null), 6000);
                }
                prevStatusRef.current = updatedOrder.status;
                setSelectedOrder(updatedOrder);
              }
            })
            .catch(() => {});
        }
      } catch {
        // Ignore parse errors
      }
    };

    sse.onerror = () => {
      // SSE will auto-reconnect
    };

    return () => {
      sse.close();
      sseRef.current = null;
    };
  }, [selectedOrder?.id]);

  // Read URL parameters on mount for automatic tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('trackingCode') || params.get('code');
    const emailParam = params.get('email');

    if (code) {
      setSearchCode(code.toUpperCase());
      handleTrackByCode(code.toUpperCase());
    } else if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  // Quick Tracking by Code
  const handleTrackByCode = async (codeToSearch?: string) => {
    const targetCode = codeToSearch || searchCode.trim().toUpperCase();
    if (!targetCode) {
      setError('Por favor, ingresa un código de seguimiento de 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders?trackingCode=${encodeURIComponent(targetCode)}`);
      
      if (res.ok) {
        const order = await res.json();
        if (order && !order.error) {
          setSelectedOrder(order);
          setPhase('single_code');
        } else {
          setError('No se encontró ningún pedido con ese código de seguimiento.');
        }
      } else {
        setError('No se encontró ningún pedido con ese código de seguimiento. Verifica que esté correcto.');
      }
    } catch (err) {
      console.error('Error tracking order by code:', err);
      setError('Ocurrió un error al buscar tu pedido. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Request OTP Email
  const handleRequestOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          customerName: email.trim().toLowerCase()
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setPhase('otp_pending');
        setSuccessMsg('¡Código de verificación enviado! Revisa tu bandeja de entrada.');
        if (data.codeForTesting) {
          setServerOtp(data.codeForTesting);
        }
      } else {
        setError(data.error || 'No se pudo enviar el código OTP.');
      }
    } catch (err) {
      setError('Error al comunicarse con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & Fetch Orders
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 5) {
      setError('Por favor, ingresa el código de 6 dígitos enviado a tu correo.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp.trim() })
      });

      const data = await res.json();
      if (data.success) {
        // Successful verification! Now load all orders
        const ordersRes = await fetch(`/api/orders?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          setCustomerOrders(ordersData);
          setPhase('results');
          setSuccessMsg('Identidad verificada con éxito.');
          if (ordersData.length > 0) {
            setSelectedOrder(ordersData[0]);
          } else {
            setSelectedOrder(null);
          }
        } else {
          setError('Error al descargar tus pedidos.');
        }
      } else {
        setError(data.error || 'Código de verificación incorrecto.');
      }
    } catch (err) {
      setError('Error al verificar código con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Get active step index for the timeline
  const getActiveStep = (status: string) => {
    const steps = ['Pendiente', 'Confirmado', 'Preparando', 'Decoración', 'Listo', 'En camino', 'Entregado'];
    return steps.indexOf(status);
  };

  const steps = [
    { name: 'Pendiente', title: 'Pedido Recibido', desc: 'Tu solicitud de diseño ya está en nuestro taller. Carol comenzará la revisión técnica de inmediato.' },
    { name: 'Confirmado', title: 'Diseño Confirmado', desc: 'Edwin y Carol han confirmado la agenda, ingredientes premium y disponibilidad de entrega.' },
    { name: 'Preparando', title: 'En Horneado', desc: 'Seleccionamos los mejores insumos orgánicos y comenzamos a hornear el bizcocho húmedo artesanal.' },
    { name: 'Decoración', title: 'Decoración de Autor', desc: 'El pastel está frío. Carol modela a mano la cobertura de crema sedosa y decoraciones de ensueño.' },
    { name: 'Listo', title: 'Listo para Entrega', desc: 'Pastel listo y empacado con el sello de calidad de Maison Rosas, esperando recojo o envío.' },
    { name: 'En camino', title: 'En Camino / Delivery', desc: 'Nuestra movilidad especializada transporta tu pastel con sumo cuidado y aire acondicionado.' },
    { name: 'Entregado', title: 'Entregado con Éxito', desc: '¡Entregado! Esperamos con todo el corazón que endulce tu celebración familiar.' }
  ];

  const currentStepIndex = selectedOrder ? getActiveStep(selectedOrder.status) : 0;
  const isCancelled = selectedOrder?.status === 'Cancelado';

  // Filter steps if delivery type is 'recojo' (remove 'En camino' step as it's not applicable)
  const filteredSteps = selectedOrder?.deliveryType === 'recojo' 
    ? steps.filter(s => s.name !== 'En camino')
    : steps;

  return (
    <div className="pt-24 pb-20 min-h-screen" id="tracking" style={{backgroundColor: 'var(--theme-bg)'}}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center space-x-2 bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/30 px-3 py-1.5 rounded-full text-brand-700 dark:text-brand-300 text-xs font-mono font-bold tracking-wider uppercase mb-3"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Seguimiento Maison Rosas</span>
          </motion.div>
          <h1 className="font-serif text-4xl font-bold tracking-tight sm:text-5xl" style={{color: 'var(--theme-text)'}}>
            Consulta tu Pedido
          </h1>
          <p className="mt-3 text-sm max-w-xl mx-auto font-sans leading-relaxed" style={{color: 'var(--theme-text-secondary)'}}>
            Ingresa tu código de seguimiento de 6 dígitos o solicita un acceso OTP seguro a tu correo electrónico para ver el historial completo de tus pedidos de autor.
          </p>
        </div>

        {/* ERROR / SUCCESS FEEDBACK */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-3 text-sm shadow-sm"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start space-x-3 text-sm shadow-sm"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* 🔴 LIVE STATUS NOTIFICATION BANNER (SSE real-time) */}
          {statusNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="max-w-2xl mx-auto mb-6 p-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl shadow-lg shadow-brand-500/25 flex items-center gap-3 text-sm"
            >
              <div className="p-1.5 bg-white/20 rounded-full shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">🎯 ¡Tu pedido avanzó!</p>
                <p className="text-[12px] text-white/80 mt-0.5">{statusNotification}</p>
              </div>
              <button
                onClick={() => setStatusNotification(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OTP verification code displayed for convenience - visible until email delivery is fully configured */}
        {serverOtp && phase === 'otp_pending' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center shadow-inner"
          >
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1">
              📧 Código Enviado a tu Correo
            </span>
            <p className="text-xs mb-2 text-zinc-600">
              Hemos enviado un código de verificación a <strong>{email}</strong>. 
              Revisa tu bandeja de entrada o spam e ingrésalo en el campo de abajo.
            </p>
          </motion.div>
        )}

        {/* SEARCH AND AUTHENTICATION MODULE */}
        {phase === 'initial' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
            
            {/* SEARCH BY 6-CHAR CODE */}
            <div className="space-y-4 md:border-r md:border-zinc-100 md:pr-8">
              <div className="flex items-center space-x-3 text-brand-700">
                <div className="p-2 bg-brand-50 rounded-xl">
                  <Key className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">Consulta Rápida</h3>
              </div>
              <p className="text-xs leading-relaxed font-sans text-zinc-600 dark:text-zinc-300">
                ¿Tienes el código de seguimiento de 6 caracteres que te enviamos por WhatsApp o correo? Ingrésalo aquí para ver su estado al instante.
              </p>
              
              <div className="space-y-3 pt-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-600 dark:text-zinc-300">
                  Código de Seguimiento
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Ej: MR892X"
                    maxLength={6}
                    className="w-full pl-4 pr-12 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-lg uppercase tracking-widest text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                  <button
                    onClick={() => handleTrackByCode()}
                    disabled={loading}
                    className="absolute right-2 top-2 p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[10px] block font-sans text-zinc-500 dark:text-zinc-400">
                  Ejemplos: Busca un código generado en tus compras o presiona "Consultar" con el OTP de abajo.
                </span>
              </div>
            </div>

            {/* SECURE EMAIL / OTP LOGIN */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-brand-700">
                <div className="p-2 bg-brand-50 rounded-xl">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-zinc-900 dark:text-white">Ver mis Pedidos</h3>
              </div>
              <p className="text-xs leading-relaxed font-sans text-zinc-600 dark:text-zinc-300">
                Ingresa tu correo electrónico registrado al hacer tu pedido. Te enviaremos un código de verificación para acceder a todos tus pedidos al instante.
              </p>
              
              <div className="space-y-3 pt-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider block text-zinc-600 dark:text-zinc-300">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full pl-4 pr-12 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  />
                  <button
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="absolute right-2 top-2 p-1.5 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-lg transition-colors"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  onClick={handleRequestOtp}
                  disabled={loading}
                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}                        <span>{loading ? 'Enviando...' : 'Enviar Código'}</span>
                </button>
                <span className="text-[10px] block font-sans text-zinc-500 dark:text-zinc-400">
                  Recibirás un código de 6 dígitos en tu correo. Válido por 10 minutos.
                </span>
              </div>
            </div>

          </div>
        )}

        {/* OTP VERIFICATION INPUT FIELD */}
        {phase === 'otp_pending' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm text-center space-y-6"
          >
            <div className="inline-flex p-3.5 bg-brand-50 rounded-full text-brand-600">
              <Key className="h-6 w-6" />
            </div>
            
            <div>
              <h3 className="font-serif text-xl font-bold" style={{color: 'var(--theme-text)'}}>Ingresa tu Código OTP</h3>
              <p className="text-xs text-zinc-400 mt-1 font-sans">
                Hemos enviado un código de seguridad de 6 dígitos a: <strong className="text-zinc-600">{email}</strong>
              </p>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-full py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono text-2xl uppercase tracking-widest text-center text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setPhase('initial')}
                  className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-500 dark:text-zinc-300 uppercase tracking-wider transition-colors"
                >
                  Regresar
                </button>
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Ingresar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULTS PAGE: SECURE WORKSPACE FOR VERIFIED ACCOUNTS */}
        {(phase === 'results' || phase === 'single_code') && (
          <div className="space-y-8">
            
            {/* ACTION BAR / HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-sm gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setCustomerOrders([]);
                    setPhase('initial');
                    setError(null);
                    setSuccessMsg(null);
                    setServerOtp(null);
                  }}
                  className="p-2 hover:bg-zinc-50 rounded-lg text-zinc-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block font-bold">
                    {phase === 'single_code' ? 'Búsqueda por Código' : 'Portal de Pedidos'}
                  </span>
                  <span className="text-sm font-serif font-bold" style={{color: 'var(--theme-text)'}}>
                    {phase === 'single_code' ? `Pedido #${selectedOrder?.id}` : `${email.toLowerCase()}`}
                  </span>
                </div>
              </div>

              {/* Multi-Order Selector (only if OTP results) */}
              {phase === 'results' && customerOrders.length > 1 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-xs font-sans whitespace-nowrap" style={{color: 'var(--theme-text-muted)'}}>Ver otro pedido:</span>
                  <select
                    value={selectedOrder?.id || ''}
                    onChange={(e) => {
                      const found = customerOrders.find(o => o.id === e.target.value);
                      if (found) setSelectedOrder(found);
                    }}
                    className="w-full sm:w-64 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-sans text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {customerOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.productName} (S/. {o.totalPrice}) - {o.date}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {phase === 'results' && customerOrders.length === 0 && (
                <span className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-1 rounded-lg">
                  No tienes ningún pedido registrado con este correo.
                </span>
              )}
            </div>

            {selectedOrder && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. VISUAL PROGRESS TIMELINE (COLSPAN 2) */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-8">
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-5 gap-3">
                    <div>
                      <h3 className="font-serif text-2xl font-bold" style={{color: 'var(--theme-text)'}}>Estado de Preparación</h3>
                      <p className="text-xs mt-0.5" style={{color: 'var(--theme-text-secondary)'}}>Seguimiento en vivo del horneado y decoración de Carol Rosas</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Cod: {selectedOrder.trackingCode}
                    </span>
                  </div>

                  {/* CANCELLED BANNER */}
                  {isCancelled ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-red-900"
                    >
                      <div className="flex items-center space-x-2 text-red-700 font-bold font-serif text-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Pedido Cancelado</span>
                      </div>
                      <p className="text-xs text-red-800 leading-relaxed font-sans">
                        Lamentamos informarte que este pedido ha sido cancelado por el administrador de Maison Rosas.
                      </p>
                      {selectedOrder.cancelReason && (
                        <div className="pt-2 border-t border-red-200/50 text-xs">
                          <strong className="font-semibold block text-red-900 mb-1">Motivo de Cancelación:</strong>
                          <p className="italic text-red-700 font-serif">"{selectedOrder.cancelReason}"</p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    /* DYNAMIC HORIZONTAL / VERTICAL TIMELINE STAGES */
                    <div className="relative pl-6 sm:pl-0 pt-4 pb-4">
                      {/* Vertical line helper on mobile */}
                      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-zinc-100 sm:hidden"></div>

                      <div className="flex flex-col sm:flex-row justify-between relative gap-6 sm:gap-4">
                        {filteredSteps.map((step, idx) => {
                          const isActive = idx <= currentStepIndex;
                          const isCurrent = idx === currentStepIndex;
                          
                          return (
                            <div 
                              key={step.name} 
                              className={`flex sm:flex-col items-start sm:items-center text-left sm:text-center flex-1 relative group ${
                                isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-300 dark:text-zinc-500'
                              }`}
                            >
                              {/* Horizontal connector line on desktop */}
                              {idx < filteredSteps.length - 1 && (
                                <div className="hidden sm:block absolute left-1/2 right-[-50%] top-4 h-0.5 bg-zinc-100 -z-10 overflow-hidden">
                                  <div 
                                    className="h-full bg-brand-500 transition-all duration-1000"
                                    style={{ width: idx < currentStepIndex ? '100%' : '0%' }}
                                  ></div>
                                </div>
                              )}

                              {/* Node Indicator Dot */}
                              <div className="z-10 relative mr-4 sm:mr-0">
                                <motion.div
                                  animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                                    isCurrent 
                                      ? 'bg-brand-500 border-brand-600 text-white shadow-md shadow-brand-500/20' 
                                      : isActive 
                                        ? 'bg-brand-50 border-brand-500 text-brand-600' 
                                        : 'bg-white border-zinc-200 text-zinc-300'
                                  }`}
                                >
                                  {isActive ? (
                                    <Check className="h-4 w-4 stroke-[3px]" />
                                  ) : (
                                    <span className="text-xs font-mono font-bold">{idx + 1}</span>
                                  )}
                                </motion.div>
                              </div>

                              {/* Content text */}
                              <div className="mt-0 sm:mt-4 space-y-1">
                                <h4 className={`text-sm font-serif font-bold transition-colors ${
                                  isCurrent ? 'text-brand-700 dark:text-brand-300' : isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
                                }`}>
                                  {step.title}
                                </h4>
                                <p className="text-[11px] font-sans leading-relaxed max-w-[130px] sm:mx-auto" style={{color: 'var(--theme-text-secondary)'}}>
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 📸 GALERÍA DE FOTOS DEL PROGRESO (subidas por Carol) */}
                  {selectedOrder.progressPhotos && selectedOrder.progressPhotos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Camera className="h-4 w-4 text-purple-500" />
                        <h4 className="font-serif text-sm font-bold" style={{color: 'var(--theme-text)'}}>Galería del Progreso</h4>
                        <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/30 px-2 py-0.5 rounded-full">
                          {selectedOrder.progressPhotos.length} foto{selectedOrder.progressPhotos.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                        <AnimatePresence>
                          {selectedOrder.progressPhotos.map((photo: any, idx: number) => {
                            const stageLabels: Record<string, string> = {
                              bizcocho: '🟤 Bizcocho',
                              decoracion: '🎨 Decoración',
                              final: '✨ Final'
                            };
                            return (
                              <motion.div
                                key={photo.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="group relative"
                              >
                                <div
                                  onClick={() => {
                                    setScreenshotUrlToView(photo.imageUrl);
                                    setScreenshotTitleToView(`📸 ${photo.caption} - Pedido MR-${selectedOrder.trackingCode}`);
                                  }}
                                  className="aspect-square rounded-xl overflow-hidden border border-zinc-200 cursor-pointer hover:ring-2 hover:ring-brand-500/50 transition-all shadow-sm hover:shadow-md"
                                >
                                  <img
                                    src={photo.imageUrl}
                                    alt={photo.caption}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="mt-1.5 text-center">
                                  <span className="text-[8px] font-mono text-zinc-400 block leading-tight truncate">
                                    {stageLabels[photo.stage] || photo.stage}
                                  </span>
                                  {photo.caption && (
                                    <span className="text-[7px] text-zinc-500 block truncate">{photo.caption}</span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* LIVE ORDER LOG SUMMARY DETAILS */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-serif text-sm font-bold mb-3 flex items-center space-x-2" style={{color: 'var(--theme-text)'}}>
                        <Gift className="h-4 w-4 text-brand-500" />
                        <span>Composición del Pastel</span>
                      </h4>
                      <ul className="space-y-2 text-xs font-sans text-zinc-600">
                        <li><strong>Bizcocho:</strong> {selectedOrder.flavor}</li>
                        <li><strong>Tamaño Seleccionado:</strong> {selectedOrder.size}</li>
                        <li><strong>Decoración Adicional:</strong> {selectedOrder.selectedDecoration}</li>
                        {selectedOrder.customColor && <li><strong>Color de Cobertura:</strong> {selectedOrder.customColor}</li>}
                        {selectedOrder.theme && <li><strong>Temática de Diseño:</strong> {selectedOrder.theme}</li>}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-serif text-sm font-bold mb-3 flex items-center space-x-2" style={{color: 'var(--theme-text)'}}>
                        <FileText className="h-4 w-4 text-brand-secondary" />
                        <span>Datos de Dedicatoria</span>
                      </h4>
                      <ul className="space-y-2 text-xs font-sans text-zinc-600">
                        <li><strong>Homenajeado/a:</strong> {selectedOrder.celebratedName || 'No especificado'}</li>
                        <li><strong>Edad:</strong> {selectedOrder.customerAge || 'No especificada'} años</li>
                        <li><strong>Mensaje de Azúcar:</strong> <span className="italic font-serif text-brand-secondary">"{selectedOrder.message || 'Sin mensaje'}"</span></li>
                        {selectedOrder.specialNotes && (
                          <li className="pt-1 border-t border-zinc-200 mt-1">
                            <strong>Instrucciones Carol:</strong> <span className="text-zinc-500 block italic">"{selectedOrder.specialNotes}"</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                </div>

                {/* 2. ORDER INFORMATION / RECEIPT CARD & PAYMENT STATUS */}
                <div className="space-y-6 self-start w-full">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-zinc-100 pb-4">
                      <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{color: 'var(--theme-text-muted)'}}>Resumen de Cuenta</span>
                      <h3 className="font-serif text-xl font-bold mt-0.5" style={{color: 'var(--theme-text)'}}>{selectedOrder.productName}</h3>
                    </div>

                    {/* PRICE SUMMARY */}
                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex justify-between" style={{color: 'var(--theme-text-secondary)'}}>
                        <span>Precio Base Pastel:</span>
                        <span className="font-mono font-medium">S/. {(selectedOrder.totalPrice * 0.8).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between" style={{color: 'var(--theme-text-secondary)'}}>
                        <span>Decoraciones & Diseño Carol:</span>
                        <span className="font-mono font-medium">S/. {(selectedOrder.totalPrice * 0.2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-3 text-sm" style={{color: 'var(--theme-text)', borderColor: 'var(--theme-border)'}}>
                        <span>Monto Total Estimado:</span>
                        <span className="font-mono" style={{color: 'var(--theme-brand-primary)'}}>S/. {selectedOrder.totalPrice}</span>
                      </div>
                    </div>

                    {/* DELIVERY DETAILS PANEL */}
                    <div className="border-t border-zinc-100 pt-4 space-y-4">
                      <h4 className="font-serif text-xs font-bold uppercase tracking-wider" style={{color: 'var(--theme-text-secondary)'}}>Logística de Entrega</h4>
                      
                      <div className="space-y-3 font-sans text-xs">
                        
                        {/* DATE */}
                        <div className="flex items-start space-x-3">
                          <Calendar className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block" style={{color: 'var(--theme-text)'}}>Fecha Programada</strong>
                            <span className="block mt-0.5" style={{color: 'var(--theme-text-secondary)'}}>{selectedOrder.deliveryDate}</span>
                          </div>
                        </div>

                        {/* TIME */}
                        <div className="flex items-start space-x-3">
                          <Clock className="h-4 w-4 text-brand-secondary shrink-0 mt-0.5" />
                          <div>
                            <strong className="block" style={{color: 'var(--theme-text)'}}>Hora Estimada</strong>
                            <span className="block mt-0.5" style={{color: 'var(--theme-text-secondary)'}}>{selectedOrder.deliveryTime} (Sujeto a coordinación)</span>
                          </div>
                        </div>

                        {/* DELIVERY TYPE */}
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block" style={{color: 'var(--theme-text)'}}>Modalidad de Entrega</strong>
                            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200/50 px-2 py-0.5 rounded uppercase inline-block mt-1">
                              {selectedOrder.deliveryType === 'recojo' ? 'Recojo en Local' : 'Envío a Domicilio'}
                            </span>
                            {selectedOrder.deliveryType === 'recojo' ? (
                              <p className="text-zinc-500 block mt-1 leading-normal">
                                Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana. Sede Principal.
                              </p>
                            ) : (
                              <p className="text-zinc-500 block mt-1 leading-normal">
                                <strong>Dirección:</strong> {selectedOrder.deliveryAddress || 'No especificada'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* CONTACT WHATSAPP */}
                        <div className="flex items-start space-x-3 border-t border-zinc-100 pt-3 mt-3">
                          <User className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block" style={{color: 'var(--theme-text)'}}>Cliente Registrado</strong>
                            <span className="block mt-0.5" style={{color: 'var(--theme-text-secondary)'}}>{selectedOrder.customerName}</span>
                            <span className="block mt-0.5 font-mono" style={{color: 'var(--theme-text-muted)'}}>{selectedOrder.customerPhone}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* DIRECT WHATSAPP CHAT WITH EDWIN BUTTON */}
                    <a
                      href={`https://wa.me/51902568187?text=Hola%20Edwin,%20necesito%20coordinar%20mi%20pedido%20con%20código%20${selectedOrder.trackingCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center space-x-2 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-medium text-xs uppercase tracking-wider rounded-xl transition-colors font-sans shadow-sm"
                    >
                      <PhoneCall className="h-4 w-4" />
                      <span>Coordinar con Edwin</span>
                    </a>
                  </div>

                  {/* 💰 ESTADO DE PAGO Y COMPROBANTE OFICIAL */}
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-5">
                    <div className="border-b border-zinc-100 pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{color: 'var(--theme-text-muted)'}}>Transacción</span>
                      <h3 className="font-serif text-lg font-bold mt-0.5 flex items-center gap-1.5" style={{color: 'var(--theme-text)'}}>
                        <ShieldCheck className="h-5 w-5 text-brand-500" />
                        <span>Estado de Pago</span>
                      </h3>
                    </div>

                    {(() => {
                      const pStatus = selectedOrder.paymentStatus || 'pendiente';
                      const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
                        pendiente: { label: 'Pago pendiente', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: '⏳' },
                        confirmado: { label: 'Pago verificado', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: '✅' },
                        rechazado: { label: 'Pago rechazado', color: 'text-red-700 bg-red-50 border-red-200', icon: '❌' },
                        parcial: { label: 'Pago parcial', color: 'text-zinc-600 bg-zinc-50 border-zinc-200', icon: '⚪' },
                      };
                      const cfg = statusConfig[pStatus] || statusConfig.pendiente;

                      return (
                        <>
                          {/* Payment status badge */}
                          <div className={`px-4 py-3 rounded-xl border ${cfg.color} flex items-center gap-3`}>
                            <div className="text-xl">{cfg.icon}</div>
                            <div>
                              <p className="text-sm font-bold">{cfg.label}</p>
                              {selectedOrder.paymentMethod && (
                                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                                  Via {selectedOrder.paymentMethod}
                                </p>
                              )}
                            </div>
                            {pStatus === 'confirmado' && (
                              <div className="ml-auto">
                                <BadgeCheck className="h-6 w-6 text-emerald-500" />
                              </div>
                            )}
                          </div>

                          {/* Payment details summary */}
                          <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                            {selectedOrder.fechaPago && (
                              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Fecha</span>
                                <span className="font-semibold text-zinc-800 mt-1 block">{selectedOrder.fechaPago}</span>
                              </div>
                            )}
                            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 block font-bold">Monto</span>
                              <span className="font-mono font-bold text-zinc-900 mt-1 block">
                                S/. {(selectedOrder.montoPagado || selectedOrder.totalPrice || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* --- COMPROBANTE DE VENTA OFICIAL --- */}
                          {pStatus === 'confirmado' ? (
                            <div className="border-t border-zinc-100 pt-4">
                              <div className="relative overflow-hidden bg-gradient-to-br from-[#FCFBF7] to-[#FFF9F5] border-2 border-brand-200/70 rounded-2xl p-5 shadow-sm">
                                {/* Decorative stamp */}
                                <div className="absolute -top-3 -right-3 w-20 h-20 opacity-[0.06] pointer-events-none">
                                  <span className="font-serif font-black text-6xl rotate-12 block text-center">OK</span>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-brand-100 rounded-lg">
                                      <Printer className="h-4 w-4 text-brand-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-serif font-bold text-zinc-900 text-sm">Boleta de Venta Digital</h4>
                                      <p className="text-[9px] font-mono text-zinc-400">
                                        MR-{selectedOrder.trackingCode}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider border border-emerald-200">
                                    ✓ Oficial
                                  </span>
                                </div>

                                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans mb-4">
                                  Tu comprobante de pago ha sido emitido y verificado por Maison Rosas. 
                                  Este documento tiene validez oficial como boleta de venta electrónica.
                                </p>

                                <button
                                  type="button"
                                  onClick={() => setVoucherModalOrder(selectedOrder)}
                                  className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                                >
                                  <Printer className="h-4 w-4" />
                                  <span>Ver / Descargar Boleta</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="border-t border-zinc-100 pt-4">
                              <div className="bg-zinc-50/70 dark:bg-zinc-800/70 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 text-center space-y-2">
                                <div className="inline-flex p-2 bg-zinc-100 dark:bg-zinc-700 rounded-full">
                                  <FileText className="h-5 w-5 text-zinc-400 dark:text-zinc-300" />
                                </div>
                                <p className="text-xs font-serif font-bold" style={{color: 'var(--theme-text)'}}>
                                  Comprobante de Pago Digital
                                </p>
                                <p className="text-[10px] leading-relaxed max-w-[200px] mx-auto font-sans" style={{color: 'var(--theme-text-secondary)'}}>
                                  Se generará automáticamente una boleta oficial cuando el administrador verifique tu pago.
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* BOTTOM NAVIGATION ACTIONS */}
        <div className="mt-12 text-center">
          <button
            onClick={onBackToHome}
            className="inline-flex items-center space-x-2 text-zinc-500 hover:text-brand-700 text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver a la Página Principal</span>
          </button>
        </div>

        {/* Dynamic auto-generated voucher ticket viewer modal for customer */}
        <VoucherModal
          order={voucherModalOrder}
          isOpen={voucherModalOrder !== null}
          onClose={() => setVoucherModalOrder(null)}
        />

        {/* Verified payment screenshot popup modal */}
        <ScreenshotModal
          imageUrl={screenshotUrlToView}
          title={screenshotTitleToView}
          isOpen={screenshotUrlToView !== null}
          onClose={() => {
            setScreenshotUrlToView(null);
            setScreenshotTitleToView('');
          }}
        />

      </div>
    </div>
  );
}
