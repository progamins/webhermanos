import React, { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Review } from '../../../../shared/types';
import { dbService } from '../../../../shared/services/dbService';

interface AdminReviewsProps {
  reviews: Review[];
  onRefreshData: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
}

export default function AdminReviews({ reviews, onRefreshData, showToast }: AdminReviewsProps) {
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [reviewReplyText, setReviewReplyText] = useState('');

  const handleApproveReview = async (rev: Review) => {
    try {
      const updated = { ...rev, approved: true };
      await dbService.updateReview(updated);
      onRefreshData();
      showToast(`Opinión de "${rev.author}" aprobada para visualización pública.`, 'success', 'Opinión autorizada');
    } catch {
      showToast('Error al intentar aprobar la opinión.', 'error', 'Error');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!confirm('¿Deseas descartar o eliminar esta opinión?')) return;
    try {
      await dbService.deleteReview(id);
      onRefreshData();
      showToast('La opinión ha sido eliminada permanentemente.', 'info', 'Opinión eliminada');
    } catch {
      showToast('Error al intentar eliminar la opinión.', 'error', 'Error');
    }
  };

  const handleReplyReview = async (rev: Review) => {
    try {
      const updated = { ...rev, response: reviewReplyText };
      await dbService.updateReview(updated);
      setReplyingReviewId(null);
      setReviewReplyText('');
      onRefreshData();
      showToast('Respuesta oficial publicada correctamente.', 'success', 'Respuesta guardada');
    } catch {
      showToast('Error al guardar la respuesta.', 'error', 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-serif font-bold text-zinc-900 dark:text-white">
        Opiniones y Calificaciones de Clientes ({reviews.length} total)
      </h3>

      {reviews.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
          <p className="text-sm text-zinc-400">No hay reseñas de clientes aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4" id="admin-reviews-list">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800/80 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-serif font-bold text-zinc-950 dark:text-white">{rev.author}</h4>
                    <span className="text-[10px] text-zinc-400 font-sans">{rev.role}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-amber-400 font-mono text-xs">{'★'.repeat(rev.rating)}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{rev.date}</span>
                    <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold">Pastel: {rev.cakeModel}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!rev.approved && (
                    <button onClick={() => handleApproveReview(rev)}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-[10px] font-mono uppercase tracking-wider font-bold flex items-center space-x-1 hover:bg-emerald-600 shadow-sm cursor-pointer">
                      <Check className="h-3 w-3" />
                      <span>Aprobar</span>
                    </button>
                  )}
                  <button onClick={() => handleDeleteReview(rev.id)}
                    className="p-1.5 border border-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 cursor-pointer">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 italic mt-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-100 dark:border-zinc-900 leading-relaxed font-sans">
                "{rev.comment}"
              </p>

              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                {rev.response ? (
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-brand-600 uppercase">Respuesta de Carol & Edwin:</span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">"{rev.response}"</p>
                  </div>
                ) : replyingReviewId === rev.id ? (
                  <div className="space-y-2 mt-2">
                    <textarea placeholder="Escribe tu respuesta con amor..." value={reviewReplyText}
                      onChange={(e) => setReviewReplyText(e.target.value)}
                      className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs" rows={2} />
                    <div className="flex space-x-1 justify-end">
                      <button onClick={() => { setReplyingReviewId(null); setReviewReplyText(''); }}
                        className="px-2.5 py-1.5 border rounded-lg text-[10px] cursor-pointer">
                        Cancelar
                      </button>
                      <button onClick={() => handleReplyReview(rev)}
                        className="px-2.5 py-1.5 bg-brand-500 text-white rounded-lg text-[10px] cursor-pointer">
                        Responder
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setReplyingReviewId(rev.id)}
                    className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700 cursor-pointer">
                    + Escribir Respuesta
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
