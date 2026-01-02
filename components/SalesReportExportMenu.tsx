import React, { useState, useRef, useEffect } from 'react';
import { Download, Printer, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface SalesReportExportMenuProps {
  onExportPDF: () => void;
  onExportExcel: () => Promise<void>;
  isExporting?: boolean;
}

const SalesReportExportMenu: React.FC<SalesReportExportMenuProps> = ({
  onExportPDF,
  onExportExcel,
  isExporting,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportPDF = () => {
    onExportPDF();
    setIsOpen(false);
  };

  const handleExportExcel = async () => {
    await onExportExcel();
    setIsOpen(false);
  };

  return (
    <div className="relative print:hidden" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print / PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>{isExporting ? 'Exporting...' : 'Export to Excel'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SalesReportExportMenu;
