import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { createDiscountRequest } from '../services/supabaseService';

interface DiscountRequestModalProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
  inquiryId?: string;
  onSuccess?: () => void;
}

const DiscountRequestModal: React.FC<DiscountRequestModalProps> = ({
  contactId,
  isOpen,
  onClose,
  inquiryId,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    discountPercentage: 5,
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.reason.trim()) {
      setError('Please provide a reason for the discount request');
      return;
    }

    if (formData.discountPercentage <= 0 || formData.discountPercentage > 100) {
      setError('Discount percentage must be between 1 and 100');
      return;
    }

    try {
      setSubmitting(true);
      await createDiscountRequest({
        contact_id: contactId,
        inquiry_id: inquiryId || null,
        request_date: new Date().toISOString().split('T')[0],
        discount_percentage: formData.discountPercentage,
        reason: formData.reason,
        status: 'pending'
      });

      onSuccess?.();
      onClose();
      setFormData({ discountPercentage: 5, reason: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit discount request');
      console.error('Error submitting discount request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            Request Discount
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
            </div>
          )}

          {/* Discount Percentage */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Discount Percentage
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white focus:border-brand-blue outline-none"
              />
              <span className="text-lg font-bold text-slate-600 dark:text-slate-400">%</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter discount percentage from 1 to 100
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Reason for Discount
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Explain why this discount is being requested..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:border-brand-blue outline-none resize-none"
              rows={4}
            />
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              This discount request will be submitted for manager approval. Approval status will be updated once reviewed.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountRequestModal;
