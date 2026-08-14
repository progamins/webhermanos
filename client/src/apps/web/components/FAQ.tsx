import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, HeartHandshake } from 'lucide-react';
import { useReducedMotion } from '../../../shared/hooks';
import Button from '../../../shared/components/ui/Button';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS: FAQItem[] = [
  {
    question: '¿Cómo realizo mi pedido de kekes por WhatsApp?',
    answer: '¡Es súper fácil! Explora nuestro catálogo y elige tu keke favorito. Presiona "Pedir este Keke" para seleccionar el tamaño, el sabor y la decoración adicional. Luego presiona "Pedir por WhatsApp". Se abrirá automáticamente un chat con Edwin Rosas con todos tus detalles listos para coordinar la fecha y hora de entrega.'
  },
  {
    question: '¿Con cuánta anticipación debo realizar mi pedido?',
    answer: 'Nuestros kekes se hornean el mismo día con ingredientes frescos. Te pedimos realizar tu pedido con un mínimo de 24 horas de anticipación; para encargos grandes o fechas especiales, coordinamos la fecha directamente por WhatsApp.'
  },
  {
    question: '¿Cuáles son las opciones de entrega y recojo?',
    answer: 'Ofrecemos dos modalidades convenientes: Recojo presencial sin costo en nuestro taller familiar ubicado en Sullana, Piura; o Delivery coordinado directamente con Edwin, garantizando que tu keke llegue intacto y en perfectas condiciones.'
  },
  {
    question: '¿Puedo pedir un keke con un sabor o decoración especial?',
    answer: '¡Claro! Trabajamos con nuestros sabores artesanales de la casa y puedes personalizar el tamaño, el relleno y la decoración. Si tienes una idea especial (por ejemplo un keke con mensaje o para una celebración), escríbenos por WhatsApp y lo hacemos realidad.'
  },
  {
    question: '¿Cuáles son los métodos de pago aceptados para concretar el pedido?',
    answer: 'Tras definir todos los detalles de entrega con Edwin por WhatsApp, podrás concretar tu pedido con el pago total o un adelanto mediante transferencias bancarias (BCP, Interbank, BBVA) o a través de billeteras digitales (Yape o Plin).'
  },
  {
    question: '¿Cómo debo conservar mi keke una vez recibido?',
    answer: 'Nuestros kekes están elaborados con ingredientes naturales y se disfrutan mejor frescos. Guárdalos en un lugar fresco y seco; en climas cálidos, consérvalos refrigerados y sácalos unos minutos antes de servir para disfrutar de toda su suavidad y aroma.'
  }
];

function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();

  const toggleAccordion = useCallback((index: number) => {
    setActiveIndex(prev => prev === index ? null : index);
  }, []);

  return (
    <section
      id="preguntas-frecuentes"
      className="py-24 bg-transparent relative overflow-hidden"
      aria-label="Preguntas frecuentes"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            DESPEJA TUS DUDAS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Preguntas Frecuentes
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            Todo lo que necesitas saber sobre el proceso artesanal de Carol y la coordinación comercial de Edwin.
          </p>
        </div>

        <div className="space-y-4" id="faq-accordion-group" role="region" aria-label="Acordeón de preguntas frecuentes">
          {FAQS.map((faq, index) => {
            const isOpen = activeIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-trigger-${index}`;

            return (
              <div
                key={index}
                className="rounded-[20px] overflow-hidden transition-all duration-300 border"
                style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
                id={`faq-item-${index}`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  id={buttonId}
                >
                  <div className="flex items-center space-x-3.5 pr-4">
                    <HelpCircle className="h-5 w-5 text-brand-secondary shrink-0" aria-hidden="true" />
                    <span className="font-serif font-light italic text-base leading-tight" style={{ color: 'var(--theme-text)' }}>
                      {faq.question}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.3 }}
                    className="p-1.5 rounded-full shrink-0 border"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={reducedMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                    >
                      <div className="px-6 pb-6 pt-1 border-t text-sm font-light leading-relaxed" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div
          className="mt-12 p-6 rounded-[24px] flex flex-col sm:flex-row items-center justify-between gap-4 border backdrop-blur-md"
          style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center space-x-3.5 text-left">
            <HeartHandshake className="h-6 w-6 text-brand-secondary shrink-0" aria-hidden="true" />
            <div>
              <h4 className="text-base font-serif font-light italic" style={{ color: 'var(--theme-text)' }}>
                ¿Tienes alguna consulta adicional?
              </h4>
              <p className="text-xs font-light mt-0.5" style={{ color: 'var(--theme-text-secondary)' }}>
                Edwin está listo para ayudarte con cualquier requerimiento particular por chat.
              </p>
            </div>
          </div>
          <Button
            href="https://wa.me/51902568187"
            target="_blank"
            rel="noreferrer"
            variant="primary"
            size="md"
            id="faq-help-whatsapp"
          >
            Preguntar por WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
}

export default memo(FAQ);
