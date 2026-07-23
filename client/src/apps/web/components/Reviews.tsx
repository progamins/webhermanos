import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquarePlus, CheckCircle2, User, Sparkles, Quote } from 'lucide-react';
import { dbService } from '../../../shared/services/dbService';
import { useReducedMotion } from '../../../shared/hooks';
import Input from '../../../shared/components/ui/Input';
import Select from '../../../shared/components/ui/Select';
import Button from '../../../shared/components/ui/Button';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Skeleton from '../../../shared/components/ui/Skeleton';
import { Marquee } from '../../../shared/components/magicui/marquee';
import { MagicCard } from '../../../shared/components/magicui/magic-card';
import { ShimmerButton } from '../../../shared/components/magicui/shimmer-button';
import { cn } from '../../../shared/lib/utils';
import type { Review } from '../../../shared/types';

// Mini card component for the Marquee (extracted for performance)
function ReviewMarqueeCard({ review }: { review: Review }) {
  return (
    <div
      className="w-[320px] sm:w-[380px] p-5 rounded-2xl border backdrop-blur-sm select-none"
      style={{
        backgroundColor: 'var(--theme-surface-glass)',
        borderColor: 'var(--theme-border)',
      }}
    >
      <div className="flex items-center gap-1 mb-2" aria-label={`${review.rating} de 5 estrellas`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <p className="text-sm italic leading-relaxed line-clamp-3" style={{ color: 'var(--theme-text)' }}>
        &ldquo;{review.comment}&rdquo;
      </p>
      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
              style={{
                backgroundColor: 'var(--theme-brand-primary)',
                color: '#fff',
              }}
            >
              {review.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-serif font-medium" style={{ color: 'var(--theme-text)' }}>
                {review.author}
              </span>
              <span className="block text-[9px]" style={{ color: 'var(--theme-text-muted)' }}>
                {review.role || 'Cliente'} · {review.cakeModel}
              </span>
            </div>
          </div>
          <Quote className="h-4 w-4 opacity-30" style={{ color: 'var(--theme-brand-primary)' }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

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

  // Calculate review stats
  const avgRating = useMemo(() => {
    if (approvedReviews.length === 0) return 0;
    return approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
  }, [approvedReviews]);

  const ratingDistribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    approvedReviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    return dist;
  }, [approvedReviews]);

  // Split reviews into two marquee rows
  const midPoint = Math.ceil(approvedReviews.length / 2);
  const marqueeRow1 = approvedReviews.slice(0, midPoint);
  const marqueeRow2 = approvedReviews.slice(midPoint);

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

        {/* Review Stats Bar */}
        {approvedReviews.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'h-5 w-5',
                      star <= Math.round(avgRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-zinc-300 dark:text-zinc-600'
                    )}
                    style={star <= Math.round(avgRating) ? { filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.3))' } : undefined}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-sm font-mono font-bold" style={{ color: 'var(--theme-text)' }}>
                {avgRating.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                ({approvedReviews.length} {approvedReviews.length === 1 ? 'opinión' : 'opiniones'})
              </span>
            </div>
          </div>
        )}

        {/* Marquee de opiniones (solo si hay suficientes) */}
        {!loading && approvedReviews.length >= 2 && (
          <div className="relative mb-16 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="space-y-6">
              {/* First marquee row — scrolls left */}
              <Marquee direction="left" speed={0.8} pauseOnHover fadeEdges gap={24}>
                {marqueeRow1.map((review) => (
                  <ReviewMarqueeCard key={review.id} review={review} />
                ))}
              </Marquee>
              {/* Second marquee row — scrolls right (reversed) */}
              {marqueeRow2.length > 0 && (
                <Marquee direction="right" speed={0.6} pauseOnHover fadeEdges gap={24}>
                  {marqueeRow2.map((review) => (
                    <ReviewMarqueeCard key={review.id} review={review} />
                  ))}
                </Marquee>
              )}
            </div>
          </div>
        )}

        {/* Grid de opiniones (si hay pocas, mostrar grid en vez de marquee) */}
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
            {approvedReviews.slice(0, 6).map((review) => (
              <MagicCard
                key={review.id}
                className="p-6 flex flex-col justify-between"
                style={{ backgroundColor: 'var(--theme-surface-glass)', borderColor: 'var(--theme-border)' }}
                gradientColor="var(--color-brand-500)"
                gradientOpacity={0.06}
                gradientSize={250}
              >
                <motion.div
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="flex flex-col justify-between h-full"
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
              </MagicCard>
            ))}
          </div>
        )}

        <div className="text-center">
          <ShimmerButton
            onClick={() => setShowAddForm(!showAddForm)}
            variant="default"
            size="lg"
            id="review-add-trigger"
            aria-expanded={showAddForm}
            aria-controls="review-form-container"
          >
            <MessageSquarePlus className="h-4 w-4 mr-2" aria-hidden="true" />
            <span>Compartir mi Experiencia</span>
          </ShimmerButton>
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
