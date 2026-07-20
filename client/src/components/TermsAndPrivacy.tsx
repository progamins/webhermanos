import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Shield } from 'lucide-react';
import { useKeyboard } from '../hooks';
import Modal from './ui/Modal';
import Button from './ui/Button';

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
        <p>Maison Rosas, propiedad de Carol Yakeline Rosas Albines y Edwin Raúl Rosas Albines, ofrece servicios de pastelería de autor y repostería fina.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Venta de pasteles personalizados bajo pedido</li>
          <li>Servicio de personalización de diseños a través de nuestra plataforma web</li>
          <li>Coordinación de entregas y recojo en nuestro taller en Sullana, Piura</li>
          <li>Decoración artesanal de alta repostería</li>
        </ul>
      </ContentSection>
      <ContentSection title="3. Proceso de Pedido">
        <p>Todos los pedidos se realizan a través de nuestra plataforma web y se confirman mediante coordinación directa por WhatsApp.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Los pedidos requieren un mínimo de 48 horas de anticipación para pasteles estándar y 72 horas para pasteles de bodas o alta gama.</li>
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
          <li>Detalles del pedido y personalización del pastel</li>
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

  useKeyboard('Escape', onClose, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Información legal"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl shadow-2xl border"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      >
        <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--theme-bg-alt)' }}>
              <FileText className="h-5 w-5" style={{ color: 'var(--theme-brand-primary)' }} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg" style={{ color: 'var(--theme-text)' }}>Información Legal</h3>
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Maison Rosas • Pastelería de Autor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            style={{ color: 'var(--theme-text-muted)' }}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex border-b px-6" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-alt)' }} role="tablist" aria-label="Seleccionar información legal">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              activeTab === 'terms'
                ? 'border-brand-500'
                : 'border-transparent'
            }`}
            style={{ color: activeTab === 'terms' ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
            role="tab"
            aria-selected={activeTab === 'terms'}
            id="legal-tab-terms"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Términos de Servicio</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              activeTab === 'privacy'
                ? 'border-brand-500'
                : 'border-transparent'
            }`}
            style={{ color: activeTab === 'privacy' ? 'var(--theme-brand-primary)' : 'var(--theme-text-muted)' }}
            role="tab"
            aria-selected={activeTab === 'privacy'}
            id="legal-tab-privacy"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Políticas de Privacidad</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ backgroundColor: 'var(--theme-surface)' }}>
          <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--theme-bg-alt)', borderColor: 'var(--theme-border)' }}>
            <h4 className="font-serif font-bold text-lg" style={{ color: 'var(--theme-text)' }}>
              {activeTab === 'terms' ? 'Términos de Servicio' : 'Políticas de Privacidad'}
            </h4>
            <p className="text-[11px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>Última actualización: Julio 2026</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 py-4 flex items-center justify-between shrink-0 border-t" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-alt)' }}>
          <span className="text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
            &copy; {new Date().getFullYear()} Maison Rosas
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
