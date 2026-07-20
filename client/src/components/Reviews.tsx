import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquarePlus, CheckCircle2, User, Sparkles } from 'lucide-react';
import type { Review } from '../types';
import { dbService } from '../dbService';
import { useReducedMotion } from '../hooks';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import Skeleton from './ui/Skeleton';

interface ReviewsProps {
  reviews: Review[];
  onRefreshReviews: () => void;
  loading?: boolean;
}

export default function Reviews({ reviews, onRefreshReviews, loading = false }: ReviewsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cakeModel, setCakeModel] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reducedMotion = useReducedMotion();

  const approvedReviews = reviews.filter(r => r.approved);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !comment || !cakeModel) return;
    setIsSubmitting(true);

    try {
      await dbService.addReview({
        id: `rev-${Date.now()}`,
        author,
        role: role || 'Cliente',
        rating,
        comment,
        cakeModel,
        date: new Date().toISOString().split('T')[0],
        approved: false,
      });
      setSuccess(true);
      onRefreshReviews();
      setAuthor('');
      setRole('');
      setRating(5);
      setComment('');
      setCakeModel('');
      setTimeout(() => { setSuccess(false); setShowAddForm(false); }, 4000);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [author, role, rating, comment, cakeModel, onRefreshReviews]);

  return (
    <section id="opiniones" className="py-24 bg-transparent relative overflow-hidden" aria-label="Opiniones de clientes">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            CONFÍA EN MAISON ROSAS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic mt-3" style={{ color: 'var(--theme-text)' }}>
            Lo que Dicen Nuestros Clientes
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" aria-hidden="true" />
          <p className="text-sm font-light mt-5 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
            La confianza de Edwin y el sabor de Carol reflejados en opiniones de familias reales.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="rounded-[24px] p-6 border" style={{ borderColor: 'var(--theme-border)' }}>
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-3 w-full mb-2" count={3} />
                <Skeleton className="h-3 w-3/4 mt-4" />
                <Skeleton className="h-4 w-20 mt-4" />
              </div>
            ))}
          </div>
        ) : approvedReviews.length === 0 ? (
          <EmptyState
            icon={<Star className="h-5 w-5 text-zinc-400" />}
            title="Aún no hay opiniones"
            description="Sé el primero en compartir tu experiencia con Maison Rosas."
            action={{ label: 'Compartir mi Experiencia', onClick: () => setShowAddForm(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12" id="reviews-grid">
            {approvedReviews.map((review) => (
              <motion.div
                key={review.id}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30, filter: 'blur(4px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-30px' }}
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 70, damping: 14 }}
                className="p-6 rounded-[24px] border shadow-sm backdrop-blur-md transition-shadow flex flex-col justify-between"
                style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
                id={`review-card-${review.id}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-1" aria-label={`${review.rating} de 5 estrellas`}>
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : ''}`}
                        style={i < review.rating ? { filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.3))' } : { color: 'var(--theme-text-muted)' }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--theme-text)' }}>
                    &ldquo;{review.comment}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--theme-border)' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-base font-serif font-light italic" style={{ color: 'var(--theme-text)' }}>
                        {review.author}
                      </h4>
                      <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                        {review.role || 'Cliente'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--theme-text-muted)' }}>
                      {review.date}
                    </span>
                  </div>

                  <span className="inline-block mt-3 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-widest border rounded-full"
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}>
                    Modelo: {review.cakeModel}
                  </span>

                  {review.response && (
                    <div className="mt-4 p-3 rounded-2xl border relative" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                      <div className="absolute top-2 right-2" style={{ color: 'var(--theme-brand-primary)' }}>
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                      </div>
                      <span className="block text-[9px] font-mono font-bold uppercase" style={{ color: 'var(--theme-brand-primary)' }}>
                        Respuesta de Carol & Edwin:
                      </span>
                      <p className="text-[11px] mt-1 italic" style={{ color: 'var(--theme-text-secondary)' }}>
                        &ldquo;{review.response}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            id="review-add-trigger"
            aria-expanded={showAddForm}
            aria-controls="review-form-container"
          >
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            <span>Compartir mi Experiencia</span>
          </button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 max-w-xl mx-auto p-8 rounded-3xl border shadow-lg text-left"
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              id="review-form-container"
            >
              {success ? (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex p-3 rounded-full" style={{ backgroundColor: 'var(--theme-bg-alt)', color: 'var(--theme-brand-primary)' }}>
                    <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-serif font-bold" style={{ color: 'var(--theme-text)' }}>
                    ¡Gracias por tu reseña!
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>
                    Tu opinión ha sido enviada con éxito. Aparecerá en la web tan pronto como Edwin o Carol la aprueben.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formulario de reseña">
                  <h3 className="text-lg font-serif font-bold mb-2" style={{ color: 'var(--theme-text)' }}>
                    Escribe tu Opinión
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Nombre Completo" placeholder="Ej: Andrea Beltrán" value={author} onChange={(e) => setAuthor(e.target.value)} required id="review-author-input" />
                    <Input label="Tu Rol o Evento" placeholder="Ej: Madre de cumpleañera" value={role} onChange={(e) => setRole(e.target.value)} id="review-role-input" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Modelo de Pastel" placeholder="Ej: Cielo de Macarons" value={cakeModel} onChange={(e) => setCakeModel(e.target.value)} required id="review-model-input" />
                    <Select
                      label="Calificación (Estrellas)"
                      value={rating.toString()}
                      onChange={(e) => setRating(Number(e.target.value))}
                      options={[
                        { value: '5', label: '5 Estrellas (Excelente)' },
                        { value: '4', label: '4 Estrellas (Muy Bueno)' },
                        { value: '3', label: '3 Estrellas (Bueno)' },
                        { value: '2', label: '2 Estrellas (Regular)' },
                        { value: '1', label: '1 Estrella (Malo)' },
                      ]}
                      id="review-rating-select"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="review-comment-input" className="block text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>
                      Tu Comentario
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Cuéntanos qué te pareció el sabor de Carol, la presentación y la coordinación con Edwin..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border transition-all duration-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                      id="review-comment-input"
                    />
                  </div>

                  <Button type="submit" variant="primary" size="md" className="w-full" loading={isSubmitting} id="review-submit-btn">
                    {isSubmitting ? 'Enviando...' : 'Enviar Reseña'}
                  </Button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
