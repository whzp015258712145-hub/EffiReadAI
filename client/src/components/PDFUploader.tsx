import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { clsx } from 'clsx';

interface PDFUploaderProps {
  onFileSelect: (file: File) => void;
}

export function PDFUploader({ onFileSelect }: PDFUploaderProps) {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={clsx(
        "border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-12",
        "flex flex-col items-center justify-center text-center",
        "hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
      )}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="hidden"
        id="pdf-upload"
      />
      <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
        <Upload className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Upload PDF</h3>
        <p className="text-sm text-gray-500 mt-2">Drag and drop or click to select</p>
      </label>
    </div>
  );
}
