'use client';

import { useEffect, useRef } from 'react';
import { Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ContextMenu({
  x,
  y,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onClose,
  canMoveUp,
  canMoveDown,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - 200);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
      >
        <Pencil className="w-4 h-4" />
        Edit
      </button>

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>

      <div className="border-t border-gray-200 my-1" />

      <button
        onClick={() => {
          onMoveUp();
          onClose();
        }}
        disabled={!canMoveUp}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:text-gray-300 disabled:hover:bg-white disabled:cursor-not-allowed"
      >
        <ArrowUp className="w-4 h-4" />
        Move Up
      </button>

      <button
        onClick={() => {
          onMoveDown();
          onClose();
        }}
        disabled={!canMoveDown}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:text-gray-300 disabled:hover:bg-white disabled:cursor-not-allowed"
      >
        <ArrowDown className="w-4 h-4" />
        Move Down
      </button>
    </div>
  );
}
