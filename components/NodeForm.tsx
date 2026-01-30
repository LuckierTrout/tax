'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TaxonomyLevel, LEVELS_WITH_OBJECTIVE } from '@/types/taxonomy';
import { LEVEL_LABELS, LEVEL_COLORS } from '@/config/levels';
import { X } from 'lucide-react';
import clsx from 'clsx';

const NodeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  objective: z.string().max(500, 'Objective is too long (max 5 lines)').optional(),
});

type NodeFormData = z.infer<typeof NodeFormSchema>;

interface NodeFormProps {
  mode: 'create' | 'edit';
  level: TaxonomyLevel;
  parentName?: string;
  initialData?: { name: string; description?: string; objective?: string };
  onSubmit: (data: NodeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function NodeForm({
  mode,
  level,
  parentName,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: NodeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NodeFormData>({
    resolver: zodResolver(NodeFormSchema),
    defaultValues: initialData || { name: '', description: '', objective: '' },
  });

  const colors = LEVEL_COLORS[level];
  const title =
    mode === 'create'
      ? `Add New ${LEVEL_LABELS[level]}`
      : `Edit ${LEVEL_LABELS[level]}`;

  const showObjective = LEVELS_WITH_OBJECTIVE.includes(level);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className={clsx('w-3 h-3 rounded-full', colors.dot)} />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Parent info */}
          {parentName && mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent
              </label>
              <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm">
                {parentName}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Name *
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.name ? 'border-red-300' : 'border-gray-300'
              )}
              placeholder={`Enter ${LEVEL_LABELS[level].toLowerCase()} name`}
              autoFocus
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Objective - only for pillar, narrative_theme, subject */}
          {showObjective && (
            <div>
              <label
                htmlFor="objective"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Objective
              </label>
              <textarea
                id="objective"
                {...register('objective')}
                rows={5}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                  errors.objective ? 'border-red-300' : 'border-gray-300'
                )}
                placeholder="Enter objective (optional, max 5 lines)"
              />
              {errors.objective && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.objective.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Define the goal or purpose of this {LEVEL_LABELS[level].toLowerCase()}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={3}
              className={clsx(
                'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                errors.description ? 'border-red-300' : 'border-gray-300'
              )}
              placeholder="Enter description (optional)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                'px-4 py-2 text-sm font-medium text-white rounded-lg',
                'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting
                ? 'Saving...'
                : mode === 'create'
                  ? `Create ${LEVEL_LABELS[level]}`
                  : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
