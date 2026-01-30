'use client';

import { TaxonomyNode } from '@/types/taxonomy';
import { ChevronDown, Layers } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

interface PillarSelectorProps {
  pillars: TaxonomyNode[];
  selectedPillarId: string | null;
  onChange: (pillarId: string | null) => void;
}

export function PillarSelector({
  pillars,
  selectedPillarId,
  onChange,
}: PillarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPillar = pillars.find((p) => p.id === selectedPillarId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors',
          'bg-white border-gray-300 hover:bg-gray-50',
          isOpen && 'ring-2 ring-blue-500'
        )}
      >
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-gray-900">
          {selectedPillar ? selectedPillar.name : 'All Pillars'}
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
            className={clsx(
              'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2',
              !selectedPillarId && 'bg-blue-50 text-blue-700 font-medium'
            )}
          >
            <Layers className="w-4 h-4" />
            All Pillars
          </button>

          <div className="border-t border-gray-100 my-1" />

          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              onClick={() => {
                onChange(pillar.id);
                setIsOpen(false);
              }}
              className={clsx(
                'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2',
                selectedPillarId === pillar.id &&
                  'bg-purple-50 text-purple-700 font-medium'
              )}
            >
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              {pillar.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
