import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquarePlus, CheckCircle2, User, Sparkles } from 'lucide-react';
import { Review } from '../types';
import { dbService } from '../dbService';

interface ReviewsProps {
  reviews: Review[];
  onRefreshReviews: () => void;
}

export default function Reviews({ reviews, onRefreshReviews }: ReviewsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cakeModel, setCakeModel] = useState('');
  
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedReviews = reviews.filter(r => r.approved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author || !comment || !cakeModel) return;
    setIsSubmitting(true);

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      author,
      role: role || 'Cliente',
      rating,
      comment,
      cakeModel,
      date: new Date().toISOString().split('T')[0],
      approved: false // Pending admin approval!
    };

    try {
      await dbService.addReview(newReview);
      setSuccess(true);
      onRefreshReviews();
      
      // Reset form
      setAuthor('');
      setRole('');
      setRating(5);
      setComment('');
      setCakeModel('');

      setTimeout(() => {
        setSuccess(false);
        setShowAddForm(false);
      }, 4000);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section 
      id="opiniones" 
      className="py-24 bg-transparent relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] tracking-[0.3em] uppercase opacity-75 text-brand-secondary dark:text-brand-300 block font-semibold">
            CONFÍA EN MAISON ROSAS
          </span>
          <h2 className="text-4xl sm:text-5xl font-serif font-light italic text-zinc-900 dark:text-white mt-3">
            Lo que Dicen Nuestros Clientes
          </h2>
          <div className="w-12 h-[1px] bg-brand-secondary/30 mx-auto mt-5" />
          <p className="text-sm font-light text-zinc-600 dark:text-zinc-400 mt-5 max-w-xl mx-auto leading-relaxed">
            La confianza de Edwin y el sabor de Carol reflejados en opiniones de familias reales. 
            Nos esforzamos diariamente para superar tus expectativas.
          </p>
        </div>

        {/* Grid of Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12" id="reviews-grid">
          {approvedReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel p-6 rounded-[24px] border border-white/30 dark:border-white/5 bg-white/40 dark:bg-zinc-950/30 backdrop-blur-md shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              id={`review-card-${review.id}`}
            >
              <div className="space-y-4">
                {/* Stars and rating */}
                <div className="flex items-center space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-4 w-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200'}`} 
                    />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-sm text-zinc-600 dark:text-zinc-300 italic font-sans leading-relaxed">
                  "{review.comment}"
                </p>
              </div>

              {/* Author & Footer info */}
              <div className="mt-6 pt-6 border-t border-zinc-200/20 dark:border-zinc-800/20">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-base font-serif font-light italic text-zinc-900 dark:text-white">
                      {review.author}
                    </h4>
                    <span className="text-[10px] text-zinc-400 font-sans">
                      {review.role || 'Cliente'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {review.date}
                  </span>
                </div>
                
                <span className="inline-block mt-3 bg-white/30 dark:bg-zinc-900/30 border border-white/40 dark:border-white/5 text-zinc-500 dark:text-zinc-400 px-2.5 py-1 rounded-none text-[9px] font-mono font-bold uppercase tracking-widest">
                  Modelo: {review.cakeModel}
                </span>

                {/* Admin response bubble */}
                {review.response && (
                  <div className="mt-4 p-3 bg-white/20 dark:bg-zinc-900/20 rounded-2xl border border-white/20 dark:border-white/5 relative">
                    <div className="absolute top-2 right-2 text-brand-500">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <span className="block text-[9px] font-mono font-bold text-brand-600 dark:text-brand-400 uppercase">
                      Respuesta de Carol & Edwin:
                    </span>
                    <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 italic">
                      "{review.response}"
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Review Trigger and Form */}
        <div className="text-center">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center space-x-2 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 rounded-none text-[10px] font-mono font-bold uppercase tracking-widest transition-all btn-glow"
            id="review-add-trigger"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>Compartir mi Experiencia</span>
          </button>
        </div>

        {/* Expandable Form Sheet */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 max-w-xl mx-auto glass-card p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800/80 shadow-lg text-left"
              id="review-form-container"
            >
              {success ? (
                <div className="text-center py-6 space-y-3">
                  <div className="inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-full text-emerald-500">
                    <CheckCircle2 className="h-8 w-8 animate-bounce" />
                  </div>
                  <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
                    ¡Gracias por tu reseña!
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Tu opinión ha sido enviada con éxito. Aparecerá en la web tan pronto como Edwin o Carol la aprueben. 
                    ¡Valoramos muchísimo tu opinión!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white mb-2">
                    Escribe tu Opinión
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Andrea Beltrán"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                        id="review-author-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Tu Rol o Evento</label>
                      <input
                        type="text"
                        placeholder="Ej: Madre de cumpleañera"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                        id="review-role-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Modelo de Pastel</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Cielo de Macarons"
                        value={cakeModel}
                        onChange={(e) => setCakeModel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white"
                        id="review-model-input"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Calificación (Estrellas)</label>
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white cursor-pointer"
                        id="review-rating-select"
                      >
                        <option value={5}>5 Estrellas (Excelente)</option>
                        <option value={4}>4 Estrellas (Muy Bueno)</option>
                        <option value={3}>3 Estrellas (Bueno)</option>
                        <option value={2}>2 Estrellas (Regular)</option>
                        <option value={1}>1 Estrella (Malo)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Tu Comentario</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Cuéntanos qué te pareció el sabor de Carol, la presentación y la coordinación con Edwin..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-zinc-800 dark:text-white resize-none"
                      id="review-comment-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider"
                    id="review-submit-btn"
                  >
                    <span>{isSubmitting ? 'Enviando...' : 'Enviar Reseña'}</span>
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
