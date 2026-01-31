'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileJson, FileSpreadsheet, FileImage } from 'lucide-react';
import clsx from 'clsx';

interface ExportMenuProps {
  onExport: (format: 'json' | 'csv') => void;
  onExportPDF?: () => void;
  showPdfOption?: boolean;
}

export function ExportMenu({ onExport, onExportPDF, showPdfOption = true }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleExport = (format: 'json' | 'csv') => {
    onExport(format);
    setIsOpen(false);
  };

  const handleExportPDF = () => {
    if (onExportPDF) {
      onExportPDF();
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {showPdfOption && onExportPDF && (
            <button
              onClick={handleExportPDF}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <FileImage className="w-4 h-4 text-red-500" />
              Export as PDF
            </button>
          )}
          <button
            onClick={() => handleExport('json')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <FileJson className="w-4 h-4 text-blue-500" />
            Export as JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-500" />
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
