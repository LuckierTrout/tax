'use client';

import { ViewMode } from '@/types/taxonomy';
import { Network, Columns3 } from 'lucide-react';
import clsx from 'clsx';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onChange('tree')}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          mode === 'tree'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        <Network className="w-4 h-4" />
        Tree
      </button>
      <button
        onClick={() => onChange('column')}
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
          mode === 'column'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        <Columns3 className="w-4 h-4" />
        Columns
      </button>
    </div>
  );
}
