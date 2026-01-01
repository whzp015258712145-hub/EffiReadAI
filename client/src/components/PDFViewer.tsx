import { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2, BookOpen, Square } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  file: File;
  onPageChange: (pageNumber: number) => void;
  onSummarize: (pageNumber: number, count: number) => void;
  onStop: () => void;
  isSummarizing: boolean;
  onDocumentLoad: (pdfDocument: any) => void;
}

export function PDFViewer({ file, onPageChange, onSummarize, onStop, isSummarizing, onDocumentLoad }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pagesPerView, setPagesPerView] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(700);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Leave some padding for the container
        setContainerWidth(entries[0].contentRect.width - 64);
      }
    });
    
    const container = document.getElementById('pdf-container');
    if (container) observer.observe(container);
    
    return () => observer.disconnect();
  }, []);

  const onDocumentLoadSuccess = (pdf: any) => {
    if (!pdf) return;
    setNumPages(pdf.numPages);
    setPageNumber(1);
    onPageChange(1);
    onDocumentLoad(pdf);
  };

  const changePage = useCallback((offset: number) => {
    setPageNumber(prev => {
      const newPage = prev + offset;
      const clampedPage = Math.min(Math.max(1, newPage), numPages || 1);
      if (clampedPage !== prev) {
        onPageChange(clampedPage);
      }
      return clampedPage;
    });
  }, [numPages, onPageChange]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft') {
        changePage(-pagesPerView);
      } else if (e.key === 'ArrowRight') {
        changePage(pagesPerView);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changePage, pagesPerView]);

  // Safe generation of visible pages
  const visiblePages = numPages > 0 
    ? Array.from({ length: pagesPerView }, (_, i) => pageNumber + i).filter(p => p <= numPages)
    : [];

  return (
    <div className="flex flex-col items-center w-full h-full bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="w-full flex items-center justify-center gap-4 bg-white p-2 border-b shadow-sm z-20">
        <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          <BookOpen className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-600 font-medium">Pages:</span>
          <input
            type="number"
            min={1}
            max={10}
            value={pagesPerView}
            onChange={(e) => setPagesPerView(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-10 bg-transparent text-sm font-bold focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={pageNumber <= 1}
            onClick={() => changePage(-pagesPerView)}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-1 min-w-[100px] justify-center">
            <span className="text-sm font-semibold text-gray-700">
              {visiblePages.length > 1 
                ? `${pageNumber}-${visiblePages[visiblePages.length-1]}` 
                : pageNumber}
            </span>
            <span className="text-xs text-gray-400">/ {numPages}</span>
          </div>

          <button
            disabled={pageNumber + pagesPerView > numPages}
            onClick={() => changePage(pagesPerView)}
            className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-200 mx-2" />
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSummarize(pageNumber, pagesPerView)}
            disabled={isSummarizing || numPages === 0}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md font-medium text-sm"
          >
            {isSummarizing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Summarize {pagesPerView > 1 ? `${pagesPerView} Pages` : 'Page'}</span>
            )}
          </button>

          {isSummarizing && (
            <button
              onClick={onStop}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Scroller */}
      <div id="pdf-container" className="flex-1 w-full overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-4 md:gap-8 bg-gray-100 custom-scrollbar">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="p-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}
          error={<div className="p-20 text-red-500 font-medium text-center">Failed to load PDF.<br/>Check if file is valid.</div>}
        >
          {visiblePages.map(p => (
            <div key={p} className="bg-white shadow-xl rounded-sm border border-gray-200 overflow-hidden">
              <Page 
                pageNumber={p} 
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={containerWidth}
                className="max-w-full"
              />
              <div className="bg-gray-50 border-t py-1 text-center text-[10px] text-gray-400 font-mono italic">
                PAGE {p}
              </div>
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}