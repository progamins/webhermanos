import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Shield } from 'lucide-react';

interface TermsAndPrivacyProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'terms' | 'privacy';
}

export default function TermsAndPrivacy({ isOpen, onClose, initialTab = 'terms' }: TermsAndPrivacyProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 100, damping: 18 }}
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-xl">
              <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-zinc-900 dark:text-white">
                Información Legal
              </h3>
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Maison Rosas • Pastelería de Autor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-zinc-50/50 dark:bg-zinc-950/50">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Términos de Servicio</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center space-x-2 px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Políticas de Privacidad</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-zinc-950">
          <AnimatePresence mode="wait">
            {activeTab === 'terms' ? (
              <motion.div
                key="terms"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans"
              >
                <div className="bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/30 rounded-2xl p-5">
                  <h4 className="font-serif font-bold text-lg text-zinc-900 dark:text-white mb-1">Términos de Servicio</h4>
                  <p className="text-[11px] text-zinc-500">Última actualización: Julio 2026</p>
                </div>

                <div className="space-y-5">
                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">1. Aceptación de los Términos</h5>
                    <p className="text-xs">
                      Al acceder y utilizar el sitio web de Maison Rosas (en adelante, "la Pastelería"), aceptas cumplir con estos Términos de Servicio. Si no estás de acuerdo con alguna parte de estos términos, no deberías utilizar nuestros servicios.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">2. Servicios Ofrecidos</h5>
                    <p className="text-xs">
                      Maison Rosas, propiedad de Carol Yakeline Rosas Albines y Edwin Raúl Rosas Albines, ofrece servicios de pastelería de autor y repostería fina, incluyendo:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Venta de pasteles personalizados bajo pedido</li>
                      <li>Servicio de personalización de diseños a través de nuestra plataforma web</li>
                      <li>Coordinación de entregas y recojo en nuestro taller en Sullana, Piura</li>
                      <li>Decoración artesanal de alta repostería</li>
                    </ul>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">3. Proceso de Pedido</h5>
                    <p className="text-xs">
                      Todos los pedidos se realizan a través de nuestra plataforma web y se confirman mediante coordinación directa por WhatsApp. El cliente se compromete a proporcionar información veraz y completa para la correcta elaboración y entrega del producto.
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Los pedidos requieren un mínimo de 48 horas de anticipación para pasteles estándar y 72 horas para pasteles de bodas o alta gama.</li>
                      <li>Se solicita un abono del 50% para confirmar la reserva del pedido.</li>
                      <li>El saldo restante debe cancelarse antes de la entrega o al momento del recojo.</li>
                    </ul>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">4. Política de Cancelación y Reembolsos</h5>
                    <p className="text-xs">
                      El cliente puede cancelar su pedido con un mínimo de 24 horas de anticipación para recibir un reembolso completo del adelanto. Cancelaciones menores a 24 horas no serán reembolsables debido a la compra de insumos frescos y la reserva de agenda de producción.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">5. Entregas y Recojo</h5>
                    <p className="text-xs">
                      Ofrecemos dos modalidades:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li><strong>Recojo en Local:</strong> Sin costo adicional, en nuestro taller ubicado en Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura.</li>
                      <li><strong>Delivery Premium:</strong> Servicio de envío con costo adicional, coordinado directamente con Edwin Rosas. El pastel se transporta en condiciones climatizadas para garantizar su calidad.</li>
                    </ul>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">6. Propiedad Intelectual</h5>
                    <p className="text-xs">
                      Todos los diseños de pasteles, modelos de autor, fotografías, textos y contenido del sitio web son propiedad exclusiva de Maison Rosas. Queda prohibida la reproducción total o parcial sin autorización expresa.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">7. Limitación de Responsabilidad</h5>
                    <p className="text-xs">
                      Maison Rosas no se hace responsable por daños derivados del mal transporte, almacenamiento inadecuado o manipulación incorrecta del producto después de la entrega. Nos comprometemos a entregar el producto en perfectas condiciones conforme a las especificaciones acordadas.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">8. Contacto</h5>
                    <p className="text-xs">
                      Para cualquier consulta sobre estos términos, puedes comunicarte con nosotros:
                    </p>
                    <ul className="list-none space-y-1 text-xs mt-2">
                      <li>📧 edwinraulrosasalbines@gmail.com</li>
                      <li>📱 +51 902 568 187</li>
                      <li>📍 Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Piura, Perú</li>
                    </ul>
                  </section>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans"
              >
                <div className="bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100 dark:border-brand-900/30 rounded-2xl p-5">
                  <h4 className="font-serif font-bold text-lg text-zinc-900 dark:text-white mb-1">Políticas de Privacidad</h4>
                  <p className="text-[11px] text-zinc-500">Última actualización: Julio 2026</p>
                </div>

                <div className="space-y-5">
                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">1. Información que Recopilamos</h5>
                    <p className="text-xs">
                      En Maison Rosas, nos tomamos muy en serio tu privacidad. Recopilamos la siguiente información cuando realizas un pedido o te comunicas con nosotros:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Nombre y apellidos completos</li>
                      <li>Número de teléfono y/o WhatsApp</li>
                      <li>Dirección de correo electrónico</li>
                      <li>Dirección de entrega (cuando aplica)</li>
                      <li>Detalles del pedido y personalización del pastel</li>
                    </ul>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">2. Uso de la Información</h5>
                    <p className="text-xs">
                      Utilizamos tu información únicamente para:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Procesar y gestionar tus pedidos de pastelería</li>
                      <li>Comunicarnos contigo sobre el estado de tu pedido</li>
                      <li>Enviarte notificaciones de seguimiento y confirmación</li>
                      <li>Mejorar nuestros servicios y atención al cliente</li>
                      <li>Cumplir con obligaciones fiscales y contables (emisión de boletas)</li>
                    </ul>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">3. Protección de Datos</h5>
                    <p className="text-xs">
                      Tus datos personales se almacenan de forma segura en nuestra base de datos encriptada. No compartimos, vendemos ni alquilamos tu información personal a terceros. Implementamos medidas de seguridad técnicas y organizativas para proteger tu información contra accesos no autorizados, pérdida o destrucción.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">4. Correos Electrónicos</h5>
                    <p className="text-xs">
                      Utilizamos tu correo electrónico exclusivamente para enviarte:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Confirmación de tu pedido con los detalles acordados</li>
                      <li>Actualizaciones sobre el estado de preparación y entrega</li>
                      <li>Códigos de verificación OTP para consultar tus pedidos</li>
                    </ul>
                    <p className="text-xs mt-2">
                      No realizamos envíos masivos de publicidad ni newsletters no solicitadas.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">5. Almacenamiento y Conservación</h5>
                    <p className="text-xs">
                      Tus datos se conservarán durante el tiempo necesario para cumplir con los fines descritos en esta política, y durante el plazo exigido por las obligaciones fiscales y contables peruanas (5 años). Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">6. Tus Derechos</h5>
                    <p className="text-xs">
                      Como titular de datos personales en Perú, tienes derecho a:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                      <li>Acceder a la información que tenemos sobre ti</li>
                      <li>Solicitar la rectificación de datos incorrectos</li>
                      <li>Solicitar la cancelación o eliminación de tus datos</li>
                      <li>Oponerte al tratamiento de tus datos para fines específicos</li>
                    </ul>
                    <p className="text-xs mt-2">
                      Para ejercer estos derechos, contáctanos a: <strong>edwinraulrosasalbines@gmail.com</strong>
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">7. Cookies</h5>
                    <p className="text-xs">
                      Nuestro sitio web puede utilizar cookies técnicas necesarias para el funcionamiento de la plataforma. No utilizamos cookies de rastreo publicitario ni de terceros para perfiles comerciales.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">8. Cambios a esta Política</h5>
                    <p className="text-xs">
                      Nos reservamos el derecho de actualizar esta política de privacidad en cualquier momento. Los cambios serán publicados en esta página con la fecha de actualización correspondiente.
                    </p>
                  </section>

                  <section>
                    <h5 className="font-serif font-bold text-zinc-900 dark:text-white mb-2">9. Contacto del Responsable</h5>
                    <p className="text-xs">
                      Responsable del tratamiento de datos: Edwin Raúl Rosas Albines
                    </p>
                    <ul className="list-none space-y-1 text-xs mt-2">
                      <li>📧 edwinraulrosasalbines@gmail.com</li>
                      <li>📱 +51 902 568 187</li>
                      <li>📍 Av. Ricardo Palma 213, Urb. Sánchez Cerro, Sullana, Piura, Perú</li>
                    </ul>
                  </section>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-400 font-mono">
            &copy; {new Date().getFullYear()} Maison Rosas
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
