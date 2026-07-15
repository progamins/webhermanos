import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Send, 
  Cake, 
  Check, 
  Info, 
  Sparkles, 
  Layers, 
  Sliders, 
  Palette, 
  Sparkle, 
  FileText, 
  Eye, 
  EyeOff,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Product, Order } from '../types';
import { dbService } from '../dbService';
import confetti from 'canvas-confetti';

interface CustomizerProps {
  product: Product;
  onClose: () => void;
  whatsappNumber: string;
}

// Professional Color Palette with description of physical icing texture
const COLOR_PALETTE = [
  { name: 'Marfil Real (Vainilla de Papantla)', value: '#FDFBF7', texture: 'Satinado Cream' },
  { name: 'Rosa Vintage (Buttercream de Fresas Silvestres)', value: '#E39E8F', texture: 'Aterciopelado' },
  { name: 'Celeste Pastel (Lavanda & Vainilla Celeste)', value: '#A9C6C9', texture: 'Aterciopelado' },
  { name: 'Lila Suave (Crema de Arándanos & Violetas)', value: '#D4C0CE', texture: 'Mate' },
  { name: 'Verde Menta (Menta Glacial Artesanal)', value: '#B6CCB6', texture: 'Mate' },
  { name: 'Durazno Fino (Crema Dulce de Melocotón)', value: '#FFCCAB', texture: 'Satinado' },
  { name: 'Chocolate Belga (Fudge Intenso al 70%)', value: '#4A2E20', texture: 'Rústico Brillante' },
  { name: 'Blanco Nieve Puro (Chantilly de Queso Crema)', value: '#FFFFFF', texture: 'Brillante' },
];

// Gourmet Fillings (Rellenos de Autor)
const PREMIUM_FILLINGS = [
  { name: 'Manjarblanco Artesanal de Olla (Tradicional)', price: 0, desc: 'Leche caramelizada por horas a fuego lento.' },
  { name: 'Fudge de Cacao Belga al 70% (Premium)', price: 10, desc: 'Ganache espeso e intenso de chocolate gourmet.' },
  { name: 'Jalea Artesanal de Frutos del Bosque (Premium)', price: 12, desc: 'Reducción de fresas, frambuesas y arándanos frescos.' },
  { name: 'Crema de Lúcuma Premium Sullana (Especial)', price: 15, desc: 'Mousse concentrado de lúcuma selecta de la región.' },
  { name: 'Crema Sabor Nutella & Avellanas (Gourmet)', price: 15, desc: 'Crema untuosa de avellanas con chocolate crujiente.' },
];

const SIZES = [
  { name: 'Petit (12-15 Porciones)', modifier: -15, label: 'S/. -15', diameter: '16 cm', tiers: 1, height: 'Extra Alto (12cm)' },
  { name: 'Estándar (20-25 Porciones)', modifier: 0, label: 'Precio Base', diameter: '22 cm', tiers: 1, height: 'Estándar (10cm)' },
  { name: 'Doble Piso (30-35 Porciones)', modifier: 45, label: 'S/. +45', diameter: '24 cm + 16 cm', tiers: 2, height: '2 Pisos Escalonados' },
  { name: 'Gala Imperial (45-50 Porciones)', modifier: 95, label: 'S/. +95', diameter: '28 cm + 20 cm + 14 cm', tiers: 3, height: '3 Pisos Escalonados' },
];

export default function Customizer({ product, onClose, whatsappNumber }: CustomizerProps) {
  // Navigation & Form State
  const [activeStep, setActiveStep] = useState(1); // Steps 1 to 4
  const [size, setSize] = useState(SIZES[1]); // Default Estándar
  const [selectedFlavor, setSelectedFlavor] = useState((product.flavors && product.flavors[0]) || 'Vainilla Francesa');
  const [selectedFilling, setSelectedFilling] = useState(PREMIUM_FILLINGS[0]); // Default Manjarblanco
  const [selectedDecoration, setSelectedDecoration] = useState((product.decorations && product.decorations[0]) || 'Flores de Estación');
  const [customColor, setCustomColor] = useState(COLOR_PALETTE[0]);

  // Design additions
  const [theme, setTheme] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Step 3 logistics and metadata fields (Datos del pedido)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryType, setDeliveryType] = useState<'recojo' | 'domicilio'>('recojo');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  
  // Homenajeado metadata (Opcional)
  const [celebratedName, setCelebratedName] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [message, setMessage] = useState('');

  // Validation feedback
  const [validationError, setValidationError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [totalPrice, setTotalPrice] = useState(product.basePrice);

  useEffect(() => {
    setTotalPrice(product.basePrice + size.modifier + selectedFilling.price);
  }, [product.basePrice, size, selectedFilling]);

  // Validates a step before moving forward
  const handleNextStep = () => {
    setValidationError(null);

    if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      setActiveStep(3);
    } else if (activeStep === 3) {
      // Validate all required step 3 fields
      if (!customerName.trim()) {
        setValidationError('Por favor, ingresa tu nombre completo.');
        return;
      }
      if (!customerPhone.trim() || customerPhone.trim().length < 8) {
        setValidationError('Por favor, ingresa un número de WhatsApp de contacto válido (mínimo 8 dígitos).');
        return;
      }
      if (!customerEmail.trim() || !customerEmail.includes('@') || !customerEmail.includes('.')) {
        setValidationError('Por favor, ingresa un correo electrónico de contacto válido (obligatorio para la factura y seguimiento).');
        return;
      }
      if (!deliveryDate) {
        setValidationError('Por favor, selecciona la fecha tentativa de entrega de tu pastel.');
        return;
      }
      if (!deliveryTime) {
        setValidationError('Por favor, selecciona el horario aproximado de entrega.');
        return;
      }
      if (deliveryType === 'domicilio' && !deliveryAddress.trim()) {
        setValidationError('Por favor, escribe la dirección completa a donde enviaremos el pastel.');
        return;
      }

      setActiveStep(4);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setValidationError(null);

    try {
      // Generate unique 6-character tracking code
      const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Assemble WhatsApp message body
      const formattedMessage = `✨ *NUEVA SOLICITUD DE PASTEL DE AUTOR - MAISON ROSAS* ✨
--------------------------------------------------
Hola Carol & Edwin, acabo de registrar mi pedido personalizado:

🎂 *Modelo Referencial:* ${product.name}
📏 *Escala & Tamaño:* ${size.name} (${size.diameter})
🍰 *Bizcocho:* ${selectedFlavor}
🍨 *Relleno Doble:* ${selectedFilling.name}
🎨 *Tono Cobertura:* ${customColor.name}
✨ *Decoración Corona:* ${selectedDecoration}
🎭 *Temática del Evento:* ${theme.trim() || 'Clásico de Catálogo'}

📌 *DATOS DEL HOMENAJEADO:*
• *Nombre en Pastel:* ${celebratedName.trim() ? `"${celebratedName.toUpperCase()}"` : 'Ninguno'}
• *Edad a Cumplir:* ${customerAge ? `${customerAge} años` : 'No especificada'}
• *Mensaje manuscrito:* ${message.trim() ? `"${message}"` : 'Sin mensaje'}

🚚 *DETALLES DE LOGÍSTICA:*
• *Fecha de Entrega:* ${deliveryDate}
• *Hora Estimada:* ${deliveryTime}
• *Tipo:* ${deliveryType === 'recojo' ? 'Recojo en Sede (Sullana)' : 'Delivery a Domicilio'}
${deliveryType === 'domicilio' ? `• *Dirección de Envío:* ${deliveryAddress.trim()}` : ''}

👤 *INFORMACIÓN CLIENTE:*
• *Nombre Completo:* ${customerName.trim()}
• *WhatsApp:* ${customerPhone.trim()}
• *Correo Obligatorio:* ${customerEmail.trim().toLowerCase()}

--------------------------------------------------
💰 *PRESUPUESTO TOTAL ESTIMADO:* S/. ${totalPrice}
🎫 *CÓDIGO DE SEGUIMIENTO WEB:* ${trackingCode}
--------------------------------------------------
Por favor confirmen disponibilidad de agenda para realizar mi depósito bancario o Yape. ¡Gracias!`;

      // Formulate Order object
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        size: `${size.name} (${size.diameter})`,
        flavor: `${selectedFlavor} con relleno de ${selectedFilling.name}`,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        deliveryDate: deliveryDate,
        deliveryTime: deliveryTime,
        deliveryType: deliveryType,
        deliveryAddress: deliveryType === 'domicilio' ? deliveryAddress.trim() : undefined,
        theme: theme.trim() || 'No especificada',
        specialNotes: specialNotes.trim() || 'Ninguna',
        trackingCode: trackingCode,
        celebratedName: celebratedName.trim() || undefined,
        customerAge: customerAge ? customerAge : undefined,
        message: message.trim() || undefined,
        selectedDecoration: selectedDecoration,
        customColor: customColor.name,
        totalPrice: totalPrice,
        status: 'Pendiente',
        date: new Date().toISOString().split('T')[0],
        whatsappMessage: formattedMessage
      };

      // Register order via Firestore / server API
      await dbService.addOrder(newOrder);

      // Save order info locally to display the success wizard tab
      setSuccessOrder(newOrder);

      // Trigger Confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });

    } catch (error) {
      console.error('Error registering order:', error);
      setValidationError('Ocurrió un error inesperado al registrar el pedido en el servidor. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Switch to parent tracking view directly
  const handleOpenTracking = () => {
    onClose();
    // Use URL params and trigger scroll tracking
    const trackingUrl = `${window.location.origin}${window.location.pathname}?code=${successOrder?.trackingCode}`;
    window.history.pushState({}, '', trackingUrl);
    // Dispatch popstate event to let App.tsx update its state and render the tracking view smoothly
    window.dispatchEvent(new Event('popstate'));
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="rounded-[32px] overflow-y-auto lg:overflow-hidden w-full max-w-5xl max-h-[96vh] lg:max-h-[88vh] flex flex-col lg:flex-row bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_rgba(0,0,0,0.3)]"
        id="customizer-modal"
      >
        {successOrder ? (
          /* POST-ORDER SUCCESS SCREEN INSIDE WIZARD */
          <div className="w-full p-8 sm:p-12 text-center bg-[#FFF9F5] dark:bg-zinc-950 flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 mb-2">
              <Check className="h-8 w-8 stroke-[3px]" />
            </div>

            <div className="max-w-xl space-y-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-secondary">
                ¡TU PEDIDO HA SIDO REGISTRADO!
              </span>
              <h3 className="font-serif text-3xl font-bold text-zinc-900 dark:text-white">
                ¡Maison Rosas lo tiene Agendado!
              </h3>
              <p className="text-xs text-zinc-500 font-sans leading-relaxed">
                Hemos recibido tu diseño técnico de pastel personalizado. Edwin y Carol han guardado tu orden con el estatus <strong className="text-amber-600 font-mono">Pendiente</strong> en su panel administrativo. 
                <br />Se ha enviado un correo de confirmación automatizado a <strong className="text-zinc-700 dark:text-zinc-300 font-medium">{successOrder.customerEmail}</strong>.
              </p>
            </div>

            {/* TRACKING CODE BOX */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-5 rounded-2xl max-w-md w-full shadow-sm text-center space-y-3">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                Tu Código de Seguimiento Web
              </span>
              <div className="flex items-center justify-center space-x-2">
                <span className="font-mono text-3xl font-black text-brand-700 dark:text-brand-300 tracking-wider">
                  {successOrder.trackingCode}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                Usa este código en la sección de la barra de navegación para consultar la preparación de tu pastel en vivo (Horneado, Decorado, Delivery).
              </p>
            </div>

            {/* PAYMENT STEPS */}
            <div className="bg-brand-50 border border-brand-200 p-4 rounded-xl max-w-lg w-full text-left text-xs text-brand-900 flex items-start space-x-3 leading-relaxed">
              <Sparkles className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-brand-800 font-serif mb-1">Pasos Finales para Confirmación Financiera:</strong>
                <ol className="list-decimal pl-4 space-y-1.5 text-zinc-600 font-sans">
                  <li>Haz clic en el botón de abajo para enviar el diseño completo al WhatsApp oficial.</li>
                  <li>Coordina con Edwin la confirmación de fecha exacta y el envío por Yape o Plin al teléfono de la pastelería.</li>
                  <li>Realiza el abono del 50% de adelanto para separar cupo y habilitar el inicio de horneado en el taller.</li>
                </ol>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-4">
              <button
                onClick={handleOpenTracking}
                className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-colors shadow-sm"
              >
                Ver Estado En Vivo
              </button>
              
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(successOrder.whatsappMessage || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-mono font-bold uppercase tracking-widest text-center flex items-center justify-center space-x-1 transition-colors shadow-sm"
              >
                <Send className="h-4 w-4 shrink-0" />
                <span>Enviar por WhatsApp</span>
              </a>
            </div>

            <button
              onClick={onClose}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors pt-2"
            >
              Cerrar y seguir navegando
            </button>
          </div>
        ) : (
          /* ACTIVE WIZARD CONFIGURATOR */
          <>
            {/* Left Side: Live visual Interactive Mockup Preview */}
            <div className="lg:w-[45%] bg-gradient-to-b from-zinc-50 to-zinc-100/50 dark:from-zinc-900/40 dark:to-zinc-950/60 p-4 sm:p-5 lg:p-6 flex flex-col justify-between items-center border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 relative min-h-0 lg:min-h-0 shrink-0">
              {/* Header row in preview panel */}
              <div className="w-full flex justify-between items-center z-10 pb-2 lg:pb-0 border-b lg:border-b-0 border-zinc-150 dark:border-zinc-800/60">
                <div>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-brand-secondary dark:text-brand-400 font-mono font-bold block">
                    DISEÑO EN VIVO
                  </span>
                  <h4 className="text-xs sm:text-sm font-serif font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    Personalización del Pastel
                  </h4>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 block uppercase font-mono tracking-widest">Monto Estimado</span>
                  <span className="text-base sm:text-lg font-mono font-bold text-brand-primary dark:text-brand-300">
                    S/. {totalPrice}
                  </span>
                </div>
              </div>

              {/* Flex Row Container for mobile/tablet, Stacked for desktop */}
              <div className="flex flex-row lg:flex-col items-stretch lg:items-center gap-3 sm:gap-4 lg:gap-0 w-full my-3 lg:my-0 flex-1 lg:flex-initial">
                {/* Real Cake Image Display Card */}
                <div className="relative w-[110px] h-[110px] sm:w-[160px] sm:h-[160px] lg:w-full lg:max-w-[320px] lg:h-[300px] select-none rounded-[20px] lg:rounded-[24px] overflow-hidden shadow-[0_8px_16px_rgba(0,0,0,0.1)] lg:shadow-[0_16px_32px_rgba(0,0,0,0.12)] border border-zinc-200/60 dark:border-zinc-800/80 shrink-0 lg:my-5 group">
                  <img 
                    src={product.images && product.images[0] ? product.images[0] : ''} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/20 to-zinc-950/10 pointer-events-none" />

                  {/* Desktop overlay panel details */}
                  <div className="hidden lg:flex absolute bottom-3 inset-x-3 p-3 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border border-white/20 dark:border-zinc-800 flex-col space-y-1">
                    <span className="text-[9px] font-mono font-bold tracking-wider text-brand-secondary uppercase block">
                      Detalles del Encargo
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[10px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block shrink-0" style={{ backgroundColor: customColor.value }} />
                        <span className="truncate max-w-[70px]">{customColor.name.split(' ')[0]}</span>
                      </div>
                      <div className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-[10px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50 truncate max-w-[120px]">
                        ✨ {selectedDecoration}
                      </div>
                      {celebratedName && (
                        <div className="bg-brand-500/10 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-md text-[10px] font-bold border border-brand-500/20 truncate max-w-[90px]">
                          ✍️ {celebratedName.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-0.5 lg:top-3 lg:left-3 lg:px-2.5 lg:py-1 rounded-full bg-zinc-950/50 backdrop-blur-sm text-[8px] lg:text-[9px] font-mono text-white/90 border border-white/10">
                    {product.name}
                  </div>
                </div>

                {/* Technical resumen panel */}
                <div className="flex-1 lg:w-full bg-white dark:bg-zinc-950 p-2.5 sm:p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl lg:rounded-2xl text-left shadow-sm space-y-1 lg:space-y-2 flex flex-col justify-center">
                  <h5 className="text-[9px] font-mono font-bold tracking-wider text-brand-secondary dark:text-brand-400 uppercase mb-0.5 lg:mb-0">
                    Resumen del Pedido
                  </h5>
                  <div className="grid grid-cols-2 gap-y-1 lg:gap-y-1.5 gap-x-2 lg:gap-x-3 text-[10px] sm:text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                    <div>
                      <span className="text-zinc-400 block text-[8px] lg:text-[9px] font-mono uppercase">Medida / Porciones</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 font-medium truncate block">{size.name}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[8px] lg:text-[9px] font-mono uppercase">Bizcocho</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 font-medium truncate block">{selectedFlavor}</strong>
                    </div>
                    <div className="col-span-2 border-t border-zinc-100 dark:border-zinc-900 pt-1 lg:pt-1.5">
                      <span className="text-zinc-400 block text-[8px] lg:text-[9px] font-mono uppercase">Relleno Gourmet</span>
                      <strong className="text-zinc-800 dark:text-zinc-100 font-medium flex justify-between items-center text-[10px] sm:text-[11px] truncate">
                        <span className="truncate pr-1">{selectedFilling.name}</span>
                        {selectedFilling.price > 0 && <span className="text-brand-primary font-bold shrink-0">+S/. {selectedFilling.price}</span>}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex w-full text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-sans items-center justify-center space-x-1 border-t border-zinc-200/50 dark:border-zinc-900 pt-3">
                <Info className="h-3 w-3 text-brand-500 shrink-0" />
                <span>Pastelería de Autor. Pedidos con mínimo 48 horas de anticipación.</span>
              </div>
            </div>

            {/* Right Side: Form Controls (Wizard Layout) */}
            <div className="lg:w-[55%] p-6 flex flex-col justify-between overflow-y-auto lg:overflow-y-auto max-h-none lg:max-h-none flex-1">
              {/* Top Header of Form */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>                      <span className="text-[10px] font-mono font-bold tracking-widest text-brand-secondary dark:text-brand-400 uppercase">
                      Pastelería de Autor
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-light text-zinc-900 dark:text-white mt-0.5">
                      Ficha de Personalización
                    </h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    id="customizer-close-btn"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Wizard Stepper Tabs */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6 pb-2 overflow-x-auto gap-4 no-scrollbar">
                  {[
                    { step: 1, label: 'Medidas', icon: Sliders },
                    { step: 2, label: 'Personalización', icon: Layers },
                    { step: 3, label: 'Logística & Contacto', icon: FileText },
                    { step: 4, label: 'Confirmación', icon: CheckCircle2 }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isSelected = activeStep === tab.step;
                    const isDone = activeStep > tab.step;
                    return (
                      <button
                        key={tab.step}
                        type="button"
                        onClick={() => {
                          if (tab.step < activeStep) {
                            setActiveStep(tab.step);
                          } else if (tab.step === 3 && activeStep < 3) {
                            setActiveStep(3);
                          }
                        }}
                        className={`flex items-center space-x-2 pb-1.5 border-b-2 transition-all text-xs font-mono font-bold tracking-wider cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected 
                            ? 'border-brand-primary text-brand-primary dark:text-brand-300' 
                            : isDone
                              ? 'border-transparent text-emerald-600 dark:text-emerald-400'
                              : 'border-transparent text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{tab.step}. {tab.label}</span>
                        {isDone && <Check className="h-3 w-3 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ERROR ALERT DISPLAY */}
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Form Content body depending on step */}
              <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col justify-between space-y-6">
                
                <div className="space-y-5">
                  <AnimatePresence mode="wait">
                    
                    {/* STEP 1: DIMENSIONES Y ALTURAS */}
                    {activeStep === 1 && (
                      <motion.div
                        key="step-1"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                      >
                        <div>
                          <h4 className="text-xs font-mono font-bold uppercase text-zinc-400 tracking-wider mb-1">
                            Dimensiones de Molde & Rendimiento Real
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mb-3">
                            Selecciona la escala perfecta para tu lista de invitados. Todos nuestros moldes son altos para lucir una silueta estilizada de gala.
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {SIZES.map((sz) => (
                              <button
                                key={sz.name}
                                type="button"
                                onClick={() => setSize(sz)}
                                className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                                  size.name === sz.name
                                    ? 'border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10 text-brand-primary dark:text-brand-300'
                                    : 'border-zinc-200 dark:border-zinc-800 hover:border-brand-secondary bg-transparent hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30'
                                }`}
                                id={`size-btn-${sz.name.split(' ')[0]}`}
                              >
                                <div className="flex justify-between items-start w-full">
                                  <span className="text-xs font-serif font-bold text-zinc-900 dark:text-white">
                                    {sz.name}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded">
                                    {sz.diameter}
                                  </span>
                                </div>
                                
                                <div className="mt-3 flex justify-between items-end w-full">
                                  <div className="text-[10px] text-zinc-500">
                                    <p className="leading-tight">Estructura: {sz.height}</p>
                                  </div>
                                  <span className="text-[11px] font-mono font-bold text-brand-secondary dark:text-brand-400">
                                    {sz.label}
                                  </span>
                                </div>

                                {size.name === sz.name && (
                                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-primary" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed flex items-start space-x-2">
                          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <p>
                            <strong>¿Necesitas más pisos o un diseño gigante?</strong> Carol y Edwin pueden diseñar pasteles de bodas o corporativos de hasta 5 pisos en la coordinación directa de WhatsApp.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 2: PERSONALIZACIÓN (FLAVORS, FILLINGS, COLORS, DECORATIONS, THEME, NOTES) */}
                    {activeStep === 2 && (
                      <motion.div
                        key="step-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                      >
                        {/* Sponge & Fillings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Bizcocho de Autor</label>
                            <select
                              value={selectedFlavor}
                              onChange={(e) => setSelectedFlavor(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white focus:ring-1 focus:ring-brand-primary focus:outline-none"
                            >
                              {(product.flavors || ['Vainilla Francesa', 'Chocolate Belga Intenso', 'Red Velvet Premium', 'Zanahoria & Nueces']).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Relleno Doble</label>
                            <select
                              value={selectedFilling.name}
                              onChange={(e) => {
                                const found = PREMIUM_FILLINGS.find(pf => pf.name === e.target.value);
                                if (found) setSelectedFilling(found);
                              }}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white focus:ring-1 focus:ring-brand-primary focus:outline-none"
                            >
                              {PREMIUM_FILLINGS.map(pf => (
                                <option key={pf.name} value={pf.name}>{pf.name} {pf.price > 0 ? `(+S/. ${pf.price})` : '(Incluido)'}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Cobertura base & Corona */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Cobertura (Color Base)</label>
                            <select
                              value={customColor.name}
                              onChange={(e) => {
                                const found = COLOR_PALETTE.find(cp => cp.name === e.target.value);
                                if (found) setCustomColor(found);
                              }}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white focus:ring-1 focus:ring-brand-primary focus:outline-none"
                            >
                              {COLOR_PALETTE.map(cp => (
                                <option key={cp.name} value={cp.name}>{cp.name} ({cp.texture})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1.5 font-bold">Decoración Superior</label>
                            <select
                              value={selectedDecoration}
                              onChange={(e) => setSelectedDecoration(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-white focus:ring-1 focus:ring-brand-primary focus:outline-none"
                            >
                              {(product.decorations || ['Flores de Estación', 'Corona de Macarons', 'Láminas de Oro 24k']).map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Theme & Observations */}
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">
                              Temática del Diseño (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: Princesas Disney, Rústico Vintage, Safari Infantil, Minimalista Chic"
                              value={theme}
                              onChange={(e) => setTheme(e.target.value)}
                              className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">
                              Observaciones Especiales & Detalles de Decoración
                            </label>
                            <textarea
                              rows={2}
                              placeholder="Describe detalles adicionales de diseño, combinaciones de colores que deseas o alguna intolerancia alimentaria..."
                              value={specialNotes}
                              onChange={(e) => setSpecialNotes(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white resize-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3: DATOS DE ENTREGA Y CONTACTO (CLIENT & CELEBRATION DETAILS) */}
                    {activeStep === 3 && (
                      <motion.div
                        key="step-3"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                      >
                        <h4 className="text-xs font-mono font-bold uppercase text-brand-secondary tracking-wider mb-2">
                          Ficha Logística y Datos Personales
                        </h4>

                        {/* Contact Data */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Nombre Completo *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ingresa tu nombre completo"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">WhatsApp *</label>
                            <input
                              type="tel"
                              required
                              placeholder="Ej: 902568187"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Correo Electrónico (Obligatorio) *</label>
                          <input
                            type="email"
                            required
                            placeholder="tucorreo@dominio.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                          />
                          <span className="text-[10px] text-zinc-400 mt-1 block">Utilizado para enviarte notificaciones automáticas y para que consultes tu seguimiento.</span>
                        </div>

                        {/* Date and Time Logistics */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Fecha de Entrega *</label>
                            <input
                              type="date"
                              required
                              value={deliveryDate}
                              onChange={(e) => setDeliveryDate(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Hora de Entrega *</label>
                            <input
                              type="time"
                              required
                              value={deliveryTime}
                              onChange={(e) => setDeliveryTime(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Delivery logistics toggle */}
                        <div className="space-y-2">
                          <label className="block text-[9px] font-mono uppercase text-zinc-400 font-bold">Modalidad de Entrega</label>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => setDeliveryType('recojo')}
                              className={`flex-1 py-2 rounded-xl text-xs font-serif font-bold border transition-all ${
                                deliveryType === 'recojo'
                                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                                  : 'bg-transparent text-zinc-600 border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              Recojo en Local (Gratis)
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeliveryType('domicilio')}
                              className={`flex-1 py-2 rounded-xl text-xs font-serif font-bold border transition-all ${
                                deliveryType === 'domicilio'
                                  ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                                  : 'bg-transparent text-zinc-600 border-zinc-200 dark:border-zinc-800'
                              }`}
                            >
                              Envío a Domicilio (Sullana)
                            </button>
                          </div>

                          {deliveryType === 'domicilio' && (
                            <div className="pt-2">
                              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Dirección Completa de Domicilio *</label>
                              <input
                                type="text"
                                required
                                placeholder="Escribe tu calle, urbanización y referencias"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                              />
                            </div>
                          )}
                        </div>

                        {/* Celebrated info (Homenajeado, edad, mensaje) */}
                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 space-y-3">
                          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 block">Personalización de Placa (Azúcar)</span>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Nombre del Homenajeado</label>
                              <input
                                type="text"
                                placeholder="Ej: Edwin, Mamá, Carol"
                                value={celebratedName}
                                onChange={(e) => setCelebratedName(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Edad a Cumplir</label>
                              <input
                                type="number"
                                placeholder="Ej: 25"
                                value={customerAge}
                                onChange={(e) => setCustomerAge(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1 font-bold">Mensaje manuscrito para el pastel (Opcional)</label>
                            <input
                              type="text"
                              maxLength={35}
                              placeholder="Ej: Feliz Cumpleaños Campeón"
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-brand-primary focus:outline-none text-zinc-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4: CONFIRMACIÓN Y RESUMEN ANTES DE MANDAR A WHATSAPP */}
                    {activeStep === 4 && (
                      <motion.div
                        key="step-4"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-4"
                      >
                        <h4 className="text-xs font-mono font-bold uppercase text-brand-secondary tracking-wider">
                          Revisión de tu Solicitud
                        </h4>

                        <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-4 text-xs leading-relaxed font-sans text-zinc-600 dark:text-zinc-400">
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-zinc-200/50 pb-3">
                            <div>
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Cliente</strong>
                              <span className="text-zinc-800 dark:text-zinc-100 font-bold">{customerName}</span>
                            </div>
                            <div>
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Contacto WhatsApp</strong>
                              <span className="text-zinc-800 dark:text-zinc-100 font-medium font-mono">{customerPhone}</span>
                            </div>
                            <div className="col-span-2 mt-1">
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Correo electrónico</strong>
                              <span className="text-zinc-800 dark:text-zinc-100 font-mono">{customerEmail}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-zinc-200/50 pb-3">
                            <div>
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Fecha programada</strong>
                              <span className="text-zinc-800 dark:text-zinc-100 font-bold">{deliveryDate}</span>
                            </div>
                            <div>
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Hora programada</strong>
                              <span className="text-zinc-800 dark:text-zinc-100 font-medium">{deliveryTime}</span>
                            </div>
                            <div className="col-span-2 mt-1">
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Lugar de entrega</strong>
                              <span className="text-brand-700 font-serif font-bold">
                                {deliveryType === 'recojo' ? 'Recojo en Local (Av. Ricardo Palma 213, Sullana)' : `Delivery a Domicilio: ${deliveryAddress}`}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Pastel de Autor</strong>
                            <p className="text-zinc-800 dark:text-zinc-100 font-serif">
                              <strong>{product.name}</strong> • Sabor {selectedFlavor} • Relleno de {selectedFilling.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Cobertura base {customColor.name} decorada con estilo {selectedDecoration}. {theme.trim() && `Temática: ${theme}`}
                            </p>
                          </div>

                          {celebratedName.trim() && (
                            <div className="pt-2 border-t border-zinc-200/50">
                              <strong className="text-zinc-400 block text-[9px] font-mono uppercase">Dedicatoria para pastel</strong>
                              <p className="text-zinc-800 dark:text-zinc-100">
                                Para <strong>{celebratedName}</strong> ({customerAge ? `${customerAge} años` : 'Edad no especificada'}). 
                                {message.trim() && <span className="italic block font-serif text-brand-secondary mt-1">"Placa: {message}"</span>}
                              </p>
                            </div>
                          )}

                        </div>

                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 text-[10px] text-emerald-800 dark:text-emerald-300 rounded-xl leading-normal">
                          ✔ Al presionar el botón verde se guardará tu pedido de forma segura en la nube. Recibirás de inmediato un correo electrónico de confirmación y pasarás a la pantalla con tu código de seguimiento e instrucciones de pago.
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Stepper Navigation Buttons and WhatsApp Submit */}
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row items-center gap-3">
                  
                  {/* Back button */}
                  {activeStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(activeStep - 1)}
                      className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Atrás</span>
                    </button>
                  )}

                  {/* Next step button or submit */}
                  {activeStep < 4 ? (
                    <button
                      key="next-step-btn"
                      type="button"
                      onClick={handleNextStep}
                      className="w-full sm:flex-1 py-3.5 rounded-xl bg-brand-primary text-white font-mono text-[10px] font-bold uppercase tracking-widest hover:bg-brand-secondary transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-brand-primary/10"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      key="submit-order-btn"
                      type="button"
                      onClick={handleOrderSubmit}
                      disabled={isSubmitting}
                      className="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase tracking-widest flex items-center justify-center space-x-2 transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-600/10"
                      id="whatsapp-submit-btn"
                    >
                      <Send className="h-4 w-4" />                        <span>{isSubmitting ? 'Registrando...' : 'Pedir por WhatsApp'}</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
