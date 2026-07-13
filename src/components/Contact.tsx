import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Facebook, 
  Instagram, 
  Send, 
  CheckCircle, 
  Copy, 
  ExternalLink 
} from 'lucide-react';
import { AppConfig } from '../types';

interface ContactProps {
  config?: AppConfig | null;
}

export default function Contact({ config }: ContactProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const addressText = "Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura, Perú";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(addressText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message) return;
    
    // Simulate contact form submission
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSent(false), 5000);
  };

  // Modern Framer Motion variants for dynamic entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 14
      }
    }
  };

  return (
    <section 
      id="contacto" 
      className="py-24 bg-transparent relative overflow-hidden"
    >
      {/* Aesthetic ambient lighting circles */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-brand-200/20 dark:bg-brand-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-brand-secondary/10 dark:bg-zinc-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header with modern upward fade */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-90 text-brand-secondary dark:text-brand-300 block font-mono font-bold">
            CONECTA CON NOSOTROS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic text-zinc-900 dark:text-white mt-3">
            Estamos Listos para Atenderte
          </h2>
          <div className="w-12 h-[1.5px] bg-brand-secondary/40 mx-auto mt-5" />
          <p className="text-sm font-light text-zinc-600 dark:text-zinc-400 mt-5 max-w-xl mx-auto leading-relaxed">
            Coordina con Edwin Raúl Rosas Albines todos los detalles de tu evento. 
            Estaremos encantados de resolver tus requerimientos con nuestra pastelería gourmet de autor.
          </p>
        </motion.div>

        {/* Contact Grid split */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch"
        >
          
          {/* Info Side with Map */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              
              {/* Address card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group flex items-start space-x-4 p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-800/40 shadow-sm backdrop-blur-sm hover:border-brand-300 hover:shadow-md transition-all duration-300"
              >
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-300 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-semibold text-zinc-900 dark:text-zinc-100">Dirección de Entrega / Recojo</h4>
                  <p className="text-xs font-light text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                    {config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana, Piura - Perú'}
                  </p>
                </div>
              </motion.div>

              {/* Hours card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group flex items-start space-x-4 p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-800/40 shadow-sm backdrop-blur-sm hover:border-brand-300 hover:shadow-md transition-all duration-300"
              >
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-300 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-semibold text-zinc-900 dark:text-zinc-100">Horario de Atención Familiar</h4>
                  <p className="text-xs font-light text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                    {config?.openingHours || 'Lunes a Sábado: 9:00 AM - 7:00 PM | Domingos: 10:00 AM - 2:00 PM'}
                  </p>
                </div>
              </motion.div>

              {/* Phone card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group flex items-start space-x-4 p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-800/40 shadow-sm backdrop-blur-sm hover:border-brand-300 hover:shadow-md transition-all duration-300"
              >
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-300 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp de Edwin Rosas</h4>
                  <p className="text-xs font-light text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                    +{config?.whatsappNumber || '51902568187'}
                  </p>
                </div>
              </motion.div>

              {/* Email card */}
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2 } }}
                className="group flex items-start space-x-4 p-4 rounded-2xl bg-white/40 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-800/40 shadow-sm backdrop-blur-sm hover:border-brand-300 hover:shadow-md transition-all duration-300"
              >
                <div className="p-3 bg-brand-100 dark:bg-brand-900/30 rounded-xl text-brand-600 dark:text-brand-300 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-serif font-semibold text-zinc-900 dark:text-zinc-100">Correo Electrónico</h4>
                  <p className="text-xs font-light text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                    {config?.email || 'maisonrosas@gmail.com'}
                  </p>
                </div>
              </motion.div>

            </div>

            {/* Interactive Embedded Google Maps & Direct Navigation Link */}
            <motion.div 
              variants={itemVariants}
              className="glass-panel relative rounded-[24px] border border-white/30 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/20 shadow-sm overflow-hidden flex flex-col justify-between backdrop-blur-md p-3.5 space-y-3.5" 
              id="map-container"
            >
              <div className="relative h-64 rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800/80" id="google-map-iframe-wrapper">
                {/* Fully functional interactive standard embed map of Sullana/Piura */}
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d1987.5900509991548!2d-80.6880143!3d-4.9095089!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses!2spe!4v1783971349976!5m2!1spe"
                  className="w-full h-full border-0 absolute inset-0"
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Maison Rosas"
                />

                {/* Address Badge Overlay */}
                <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm py-1.5 px-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 shadow-md pointer-events-none z-10 max-w-[85%]">
                  <span className="text-[10px] font-mono font-bold text-zinc-800 dark:text-zinc-200 block">
                    Maison Rosas
                  </span>
                  <span className="text-[8px] font-sans text-zinc-500 dark:text-zinc-400">
                    {config?.address || 'Av. Ricardo Palma 213, Sánchez Cerro, Sullana'}
                  </span>
                </div>
              </div>

              {/* Action buttons for copying the address or opening in Google Maps */}
              <div className="flex flex-col sm:flex-row gap-2.5" id="map-actions">
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 shadow-sm cursor-pointer"
                >
                  <Copy className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span>{copied ? '¡Dirección Copiada!' : 'Copiar Dirección'}</span>
                </button>

                <a
                  href="https://maps.app.goo.gl/qMp7JX9D1N44TSAfA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-3 bg-brand-500 text-white rounded-xl text-xs font-mono font-bold hover:bg-brand-600 active:scale-[0.98] hover:scale-[1.02] transition-all duration-200 shadow-md shadow-brand-500/15 cursor-pointer"
                >
                  <MapPin className="h-4 w-4" />
                  <span>Cómo llegar (Maps)</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                </a>
              </div>
            </motion.div>

          </div>

          {/* Message form side */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-7 glass-panel p-8 rounded-[32px] border border-white/30 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary dark:text-brand-300 font-bold">
                ESCRÍBENOS
              </span>
              <h3 className="text-2xl font-serif font-light italic text-zinc-900 dark:text-white">
                Envíanos una Consulta Directa
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
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
                <div className="inline-flex p-3 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-300">
                  <CheckCircle className="h-8 w-8 animate-bounce" />
                </div>
                <h4 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">¡Mensaje Recibido!</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Edwin Raúl Rosas revisará tu mensaje y se pondrá en contacto contigo en las próximas horas. ¡Gracias por confiar en Maison Rosas!
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-4 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 mb-1 font-bold">Nombre Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Edwin Rosas"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-zinc-800 dark:text-white backdrop-blur-sm transition-all duration-200"
                      id="contact-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 mb-1 font-bold">Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="Ej: edwin@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-zinc-800 dark:text-white backdrop-blur-sm transition-all duration-200"
                      id="contact-email-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-zinc-400 dark:text-zinc-500 mb-1 font-bold">Tu Mensaje o Requerimiento</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Escribe aquí los detalles que te gustaría consultar con Edwin..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl text-xs placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 text-zinc-800 dark:text-white backdrop-blur-sm resize-none transition-all duration-200"
                    id="contact-message-input"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/10 cursor-pointer transition-all duration-300"
                  id="contact-submit-btn"
                >
                  <Send className="h-4 w-4" />
                  <span>Enviar Mensaje</span>
                </motion.button>
              </form>
            )}

            {/* Social media connections footer */}
            <div className="flex items-center justify-center space-x-6 pt-6 border-t border-zinc-100 dark:border-zinc-900/50 mt-6">
              <a 
                href={config?.facebookUrl || "https://facebook.com/maisonrosas.pasteleria"} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center space-x-1.5 text-zinc-500 hover:text-brand-500 dark:text-zinc-400 dark:hover:text-brand-300 transition-colors text-xs font-mono font-medium"
              >
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
              </a>
              <a 
                href={config?.instagramUrl || "https://instagram.com/maisonrosas.pasteleria"} 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center space-x-1.5 text-zinc-500 hover:text-brand-500 dark:text-zinc-400 dark:hover:text-brand-300 transition-colors text-xs font-mono font-medium"
              >
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </a>
            </div>

          </motion.div>

        </motion.div>

      </div>
    </section>
  );
}
