import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Shield, X } from 'lucide-react';

interface TermsAndPrivacyProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h5 className="font-serif font-bold mb-2" style={{ color: 'var(--theme-text)' }}>{title}</h5>
      {children}
    </section>
  );
}

function TermsContent() {
  return (
    <div className="space-y-5 text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
      <ContentSection title="1. Aceptación de los Términos">
        <p>Al acceder y utilizar el sitio web de Maison Rosas, aceptas cumplir con estos Términos de Servicio.</p>
      </ContentSection>
      <ContentSection title="2. Servicios Ofrecidos">
        <p>Maison Rosas, propiedad de Carol Yakeline Rosas Albines y Edwin Raúl Rosas Albines, ofrece servicios de pastelería artesanal enfocados en kekes peruanos horneados a diario.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Venta de kekes artesanales bajo pedido</li>
          <li>Servicio de personalización de sabores y decoración a través de nuestra plataforma web</li>
          <li>Coordinación de entregas y recojo en nuestro taller en Sullana, Piura</li>
          <li>Decoración artesanal de kekes y encargos especiales</li>
        </ul>
      </ContentSection>
      <ContentSection title="3. Proceso de Pedido">
        <p>Todos los pedidos se realizan a través de nuestra plataforma web y se confirman mediante coordinación directa por WhatsApp.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Los pedidos requieren un mínimo de 24 horas de anticipación; los kekes se hornean el mismo día de la entrega.</li>
          <li>Se solicita un abono del 50% para confirmar la reserva del pedido.</li>
          <li>El saldo restante debe cancelarse antes de la entrega o al momento del recojo.</li>
        </ul>
      </ContentSection>
      <ContentSection title="4. Política de Cancelación y Reembolsos">
        <p>El cliente puede cancelar su pedido con un mínimo de 24 horas de anticipación para recibir un reembolso completo del adelanto.</p>
      </ContentSection>
      <ContentSection title="5. Entregas y Recojo">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Recojo en Local:</strong> Sin costo adicional, en nuestro taller.</li>
          <li><strong>Delivery Premium:</strong> Servicio de envío con costo adicional, coordinado directamente con Edwin Rosas.</li>
        </ul>
      </ContentSection>
      <ContentSection title="6. Contacto">
        <ul className="list-none space-y-1">
          <li>Email: edwinraulrosasalbines@gmail.com</li>
          <li>Tel: +51 902 568 187</li>
          <li>Av. Ricardo Palma 213, Sullana, Piura, Perú</li>
        </ul>
      </ContentSection>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="space-y-5 text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
      <ContentSection title="1. Información que Recopilamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Nombre y apellidos completos</li>
          <li>Número de teléfono y/o WhatsApp</li>
          <li>Dirección de correo electrónico</li>
          <li>Dirección de entrega (cuando aplica)</li>
          <li>Detalles del pedido y personalización del keke</li>
        </ul>
      </ContentSection>
      <ContentSection title="2. Uso de la Información">
        <p>Utilizamos tu información únicamente para procesar y gestionar tus pedidos, comunicarnos sobre el estado de tu pedido, y mejorar nuestros servicios.</p>
      </ContentSection>
      <ContentSection title="3. Protección de Datos">
        <p>Tus datos personales se almacenan de forma segura en nuestra base de datos encriptada. No compartimos, vendemos ni alquilamos tu información personal a terceros.</p>
      </ContentSection>
      <ContentSection title="4. Tus Derechos">
        <p>Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos. Para ejercer estos derechos, contáctanos a: edwinraulrosasalbines@gmail.com</p>
      </ContentSection>
    </div>
  );
}

export default function TermsAndPrivacy({ isOpen, onClose, initialTab = 'terms' }: TermsAndPrivacyProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Cerrar con Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-3xl max-h-[90dvh] sm:max-h-[85dvh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden mx-0 sm:mx-4"
            style={{
              backgroundColor: 'var(--theme-surface)',
              borderColor: 'var(--theme-border)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Información Legal"
          >
            {/* ─── Close button ─── */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 p-1.5 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-bg-alt)',
                color: 'var(--theme-text-muted)',
              }}
              aria-label="Cerrar"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            {/* ─── Fixed header ─── */}
            <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-5 border-b" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}>
              <div className="flex items-center space-x-2.5 sm:space-x-3 pr-8">
                <div className="p-1.5 sm:p-2 rounded-xl shrink-0" style={{ backgroundColor: 'var(--theme-bg-alt)' }}>
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'var(--theme-brand-primary)' }} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-base sm:text-lg truncate" style={{ color: 'var(--theme-text)' }}>
                    Información Legal
                  </h3>
                  <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                    Maison Rosas &bull; Kekes Artesanales
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Tab buttons (scroll horizontal en mobile) ─── */}
            <div className="shrink-0 overflow-x-auto scrollbar-none" style={{ backgroundColor: 'var(--theme-bg-alt)' }}>
              <div className="px-4 sm:px-6 min-w-fit">
                <div className="flex gap-0 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <button
                    onClick={() => setActiveTab('terms')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'terms'
                        ? 'border-brand-500 text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ color: activeTab === 'terms' ? 'var(--theme-text)' : 'var(--theme-text-muted)' }}
                    role="tab"
                    aria-selected={activeTab === 'terms'}
                  >
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
                    Términos
                  </button>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'privacy'
                        ? 'border-brand-500 text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    style={{ color: activeTab === 'privacy' ? 'var(--theme-text)' : 'var(--theme-text-muted)' }}
                    role="tab"
                    aria-selected={activeTab === 'privacy'}
                  >
                    <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true" />
                    Privacidad
                  </button>
                </div>
              </div>
            </div>

            {/* ─── Tab content (scrollable) ─── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {activeTab === 'terms' && (
                <div className="p-4 sm:p-6">
                  <div className="p-4 sm:p-5 rounded-2xl border mb-5 sm:mb-6" style={{ backgroundColor: 'var(--theme-bg-alt)', borderColor: 'var(--theme-border)' }}>
                    <h4 className="font-serif font-bold text-base sm:text-lg" style={{ color: 'var(--theme-text)' }}>Términos de Servicio</h4>
                    <p className="text-[10px] sm:text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>Última actualización: Julio 2026</p>
                  </div>
                  <TermsContent />
                </div>
              )}
              {activeTab === 'privacy' && (
                <div className="p-4 sm:p-6">
                  <div className="p-4 sm:p-5 rounded-2xl border mb-5 sm:mb-6" style={{ backgroundColor: 'var(--theme-bg-alt)', borderColor: 'var(--theme-border)' }}>
                    <h4 className="font-serif font-bold text-base sm:text-lg" style={{ color: 'var(--theme-text)' }}>Políticas de Privacidad</h4>
                    <p className="text-[10px] sm:text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>Última actualización: Julio 2026</p>
                  </div>
                  <PrivacyContent />
                </div>
              )}
            </div>

            {/* ─── Fixed footer ─── */}
            <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-alt)' }}>
              <span className="text-[9px] sm:text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                &copy; {new Date().getFullYear()} Maison Rosas
              </span>
              <button
                onClick={onClose}
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
