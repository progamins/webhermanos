import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  MapPin, Clock, Phone, Mail, Facebook, Instagram,
  Send, CheckCircle, Copy, ExternalLink
} from 'lucide-react';
import type { AppConfig } from '../../../shared/types';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import { useReducedMotion } from '../../../shared/hooks';

interface ContactProps {
  config?: AppConfig | null;
}

export default function Contact({ config }: ContactProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const reducedMotion = useReducedMotion();

  const addressText = config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura, Perú';

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(addressText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [addressText]);

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || undefined, message })
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        setName('');
        setEmail('');
        setMessage('');
        setTimeout(() => setSent(false), 5000);
      } else {
        alert(data.error || 'No se pudo enviar el mensaje.');
      }
    } catch {
      alert('Ocurrió un error al enviar tu mensaje.');
    } finally {
      setSending(false);
    }
  }, [name, email, message]);

  const containerVariants = reducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
      };

  const itemVariants = reducedMotion
    ? { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } }
    : {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 14 } },
      };

  const infoCards = [
    { icon: MapPin, title: 'Dirección de Entrega / Recojo', value: config?.address || addressText },
    { icon: Clock, title: 'Horario de Atención Familiar', value: config?.openingHours || 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM' },
    { icon: Phone, title: 'WhatsApp de Edwin Rosas', value: `+${config?.whatsappNumber || '51902568187'}` },
    { icon: Mail, title: 'Correo Electrónico', value: config?.email || 'edwinraulrosasalbines@gmail.com' },
  ];

  return (
    <section id="contacto" className="py-24 bg-transparent relative overflow-hidden" aria-label="Contacto">
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-brand-200/20 dark:bg-brand-900/10 rounded-full blur-3xl pointer-events-none animate-blob-1 will-change-transform" aria-hidden="true" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-brand-secondary/10 dark:bg-zinc-900/20 rounded-full blur-3xl pointer-events-none animate-blob-2 will-change-transform" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-50px' }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 16 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-90 text-brand-secondary dark:text-brand-300 block font-mono font-bold">
            CONECTA CON NOSOTROS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Estamos Listos para Atenderte
          </h2>
          <div className="w-12 h-[1.5px] bg-brand-secondary/40 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            Coordina con Edwin Raúl Rosas Albines todos los detalles de tu evento.
            Estaremos encantados de resolver tus requerimientos con nuestra pastelería gourmet de autor.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch"
        >
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              {infoCards.map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    variants={itemVariants}
                    className="group flex items-start space-x-4 p-4 rounded-2xl border shadow-sm backdrop-blur-sm transition-all duration-300"
                    style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
                  >
                    <div className="p-3 rounded-xl shrink-0 transition-colors duration-300" style={{ backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-brand-primary)' }}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="text-sm font-serif font-semibold" style={{ color: 'var(--theme-text)' }}>{card.title}</h4>
                      <p className="text-xs font-light mt-1 leading-normal" style={{ color: 'var(--theme-text-secondary)' }}>{card.value}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              variants={itemVariants}
              className="relative rounded-[24px] border shadow-sm overflow-hidden flex flex-col backdrop-blur-md p-3.5 space-y-3.5"
              style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
              id="map-container"
            >
              <div className="relative h-64 rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--theme-border)' }} id="google-map-iframe-wrapper">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1987.5922687315956!2d-80.68788103194943!3d-4.908764583474027!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2spe!4v1783983457270!5m2!1ses!2spe"
                  className="w-full h-full border-0 absolute inset-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación de Maison Rosas"
                />
                <div className="absolute bottom-3 left-3 backdrop-blur-sm py-1.5 px-3 rounded-lg border shadow-md pointer-events-none z-10 max-w-[85%]"
                  style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}>
                  <span className="text-[10px] font-mono font-bold block" style={{ color: 'var(--theme-text)' }}>Maison Rosas</span>
                  <span className="text-[8px] font-sans" style={{ color: 'var(--theme-text-secondary)' }}>{addressText}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5" id="map-actions">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 border rounded-xl text-xs font-mono font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>{copied ? '¡Dirección Copiada!' : 'Copiar Dirección'}</span>
                </button>
                <a
                  href="https://maps.app.goo.gl/qMp7JX9D1N44TSAfA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-brand-500 text-white rounded-xl text-xs font-mono font-bold hover:bg-brand-600 transition-all shadow-md"
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  <span>Cómo llegar (Maps)</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                </a>
              </div>
            </motion.div>
          </div>

          <motion.div
            variants={itemVariants}
            className="lg:col-span-7 p-8 rounded-[32px] border shadow-sm backdrop-blur-md"
            style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
          >
            <div className="space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: 'var(--theme-brand-primary)' }}>
                ESCRÍBENOS
              </span>
              <h3 className="text-2xl font-serif font-light italic" style={{ color: 'var(--theme-text)' }}>
                Envíanos una Consulta Directa
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                ¿Tienes alguna consulta rápida o te gustaría coordinar un pedido corporativo?
                Llena el siguiente formulario y Edwin se comunicará contigo vía telefónica o WhatsApp a la brevedad.
              </p>
            </div>

            {sent ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-16 space-y-4"
                id="contact-success-msg"
              >
                <div className="inline-flex p-3 rounded-full" style={{ backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-brand-primary)' }}>
                  <CheckCircle className="h-8 w-8" aria-hidden="true" />
                </div>
                <h4 className="text-lg font-serif font-bold" style={{ color: 'var(--theme-text)' }}>¡Mensaje Recibido!</h4>
                <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                  Edwin Raúl Rosas revisará tu mensaje y se pondrá en contacto contigo en las próximas horas. ¡Gracias por confiar en Maison Rosas!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4 pt-6" aria-label="Formulario de contacto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nombre Completo"
                    placeholder="Ej: Edwin Rosas"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    id="contact-name-input"
                    wrapperClassName="w-full"
                  />
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="Ej: edwin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    id="contact-email-input"
                    wrapperClassName="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="contact-message-input" className="block text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>
                    Tu Mensaje o Requerimiento
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Escribe aquí los detalles que te gustaría consultar con Edwin..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                    id="contact-message-input"
                  />
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full" loading={sending} icon={<Send className="h-4 w-4" />} id="contact-submit-btn">
                  {sending ? 'Enviando...' : 'Enviar Mensaje'}
                </Button>
              </form>
            )}

            <div className="flex items-center justify-center space-x-6 pt-6 mt-6" style={{ borderTop: '1px solid var(--theme-border)' }}>
              <a
                href={config?.facebookUrl || 'https://www.facebook.com/edwinraul.rosasalbines'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs font-mono font-medium transition-colors hover:text-brand-500 dark:hover:text-brand-300"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <Facebook className="h-4 w-4" aria-hidden="true" />
                <span>Facebook</span>
              </a>
              <a
                href={config?.instagramUrl || 'https://www.instagram.com/edwinraulrosas741/'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs font-mono font-medium transition-colors hover:text-brand-500 dark:hover:text-brand-300"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <Instagram className="h-4 w-4" aria-hidden="true" />
                <span>Instagram</span>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
