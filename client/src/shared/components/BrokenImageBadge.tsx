import { ImageOff } from 'lucide-react';

/**
 * 🚫 BrokenImageBadge — chip visual que se superpone a una tarjeta cuando su
 * imagen está rota o no se pudo cargar. Pensado para galerías y paneles admin.
 */
export default function BrokenImageBadge({
  label = 'Imagen rota',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 text-white text-[9px] font-mono font-bold uppercase tracking-wider shadow-md backdrop-blur-sm ${className}`}
      title={label}
    >
      <ImageOff className="h-3 w-3" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
