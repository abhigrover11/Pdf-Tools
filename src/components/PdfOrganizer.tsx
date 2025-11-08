import React, { useState, useCallback } from 'react';
import { Upload, Download, X, FileText, Loader2, Trash2, Plus } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';

interface PdfPage {
  id: string;
  pageNumber: number;
  thumbnail: string;
  originalIndex: number;
}

const PdfOrganizer: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type === 'application/pdf') {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const generateThumbnail = async (pdfDoc: PDFDocument, pageIndex: number): Promise<string> => {
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageIndex]);
    singlePagePdf.addPage(copiedPage);

    const pdfBytes = await singlePagePdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setPdfFile(file);
    setSelectedPages(new Set());

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      setPdfDoc(pdf);

      const pageCount = pdf.getPageCount();
      const pagesList: PdfPage[] = [];

      for (let i = 0; i < pageCount; i++) {
        const thumbnail = await generateThumbnail(pdf, i);
        pagesList.push({
          id: `page-${i}`,
          pageNumber: i + 1,
          thumbnail,
          originalIndex: i,
        });
      }

      setPages(pagesList);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF. Please ensure the file is a valid PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePageSelection = (id: string) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const deleteSelectedPages = () => {
    if (selectedPages.size === 0) return;
    if (pages.length === selectedPages.size) {
      alert('Cannot delete all pages. At least one page must remain.');
      return;
    }

    setPages(prev => prev.filter(page => !selectedPages.has(page.id)));
    setSelectedPages(new Set());
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;

    setPages(prev => {
      const newPages = [...prev];
      const [removed] = newPages.splice(fromIndex, 1);
      newPages.splice(toIndex, 0, removed);
      return newPages;
    });
  };

  const duplicatePage = (index: number) => {
    setPages(prev => {
      const newPages = [...prev];
      const pageToDuplicate = { ...prev[index], id: `page-${Date.now()}-${Math.random()}` };
      newPages.splice(index + 1, 0, pageToDuplicate);
      return newPages;
    });
  };

  const addPagesFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsProcessing(true);
    try {
      const file = e.target.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const newPdf = await PDFDocument.load(arrayBuffer);

      const newPages: PdfPage[] = [];
      const pageCount = newPdf.getPageCount();

      for (let i = 0; i < pageCount; i++) {
        const thumbnail = await generateThumbnail(newPdf, i);
        newPages.push({
          id: `page-${Date.now()}-${i}`,
          pageNumber: pages.length + i + 1,
          thumbnail,
          originalIndex: i,
        });
      }

      setPages(prev => [...prev, ...newPages]);
    } catch (error) {
      console.error('Error adding pages:', error);
      alert('Error adding pages from PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const savePdf = async () => {
    if (!pdfDoc || pages.length === 0) return;

    setIsProcessing(true);
    try {
      const newPdf = await PDFDocument.create();

      const arrayBuffer = await pdfFile!.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);

      for (const page of pages) {
        const pageIndex = parseInt(page.id.split('-')[1]);
        if (!isNaN(pageIndex) && pageIndex < originalPdf.getPageCount()) {
          const [copiedPage] = await newPdf.copyPages(originalPdf, [pageIndex]);
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const fileName = `organized-${pdfFile!.name}`;
      saveAs(blob, fileName);
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert('Error saving PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetOrganizer = () => {
    pages.forEach(page => URL.revokeObjectURL(page.thumbnail));
    setPdfFile(null);
    setPdfDoc(null);
    setPages([]);
    setSelectedPages(new Set());
    setDraggedPageId(null);
    setDragOverIndex(null);
  };

  const handlePageDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handlePageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (!draggedPageId) return;

    const draggedIndex = pages.findIndex(p => p.id === draggedPageId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedPageId(null);
      setDragOverIndex(null);
      return;
    }

    setPages(prev => {
      const newPages = [...prev];
      const [draggedPage] = newPages.splice(draggedIndex, 1);
      const finalIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newPages.splice(finalIndex, 0, draggedPage);
      return newPages;
    });

    setDraggedPageId(null);
    setDragOverIndex(null);
  };

  const handlePageDragLeave = () => {
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Drop your PDF file here or click to browse
          </h3>
          <p className="text-gray-500 mb-4">
            Upload a PDF to organize, delete, or add pages
          </p>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Choose PDF
          </button>
        </div>
      ) : (
        <>
          {isProcessing && pages.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading PDF pages...</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {pdfFile.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {pages.length} page{pages.length !== 1 ? 's' : ''}
                    {selectedPages.size > 0 && ` (${selectedPages.size} selected)`}
                  </p>
                </div>
                <button
                  onClick={resetOrganizer}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-6 flex-wrap">
                <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex items-center gap-2 text-sm font-medium">
                  <Plus className="w-4 h-4" />
                  Add Pages
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={addPagesFromFile}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={deleteSelectedPages}
                  disabled={selectedPages.size === 0}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected ({selectedPages.size})
                </button>

                <button
                  onClick={savePdf}
                  disabled={isProcessing || pages.length === 0}
                  className="ml-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 text-sm font-medium"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Save PDF
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {pages.map((page, index) => (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={(e) => handlePageDragStart(e, page.id)}
                    onDragOver={(e) => handlePageDragOver(e, index)}
                    onDrop={(e) => handlePageDrop(e, index)}
                    onDragLeave={handlePageDragLeave}
                    className={`relative group bg-gray-50 rounded-lg overflow-hidden border-2 transition-all duration-200 cursor-move ${
                      draggedPageId === page.id
                        ? 'opacity-50 border-gray-400'
                        : dragOverIndex === index
                        ? 'border-green-500 ring-2 ring-green-200 bg-green-50'
                        : selectedPages.has(page.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 cursor-pointer'
                    }`}
                    onClick={() => togglePageSelection(page.id)}
                  >
                    <div className="aspect-[1/1.414] bg-white flex items-center justify-center">
                      <embed
                        src={page.thumbnail}
                        type="application/pdf"
                        className="w-full h-full pointer-events-none"
                      />
                    </div>

                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded font-medium">
                      Page {index + 1}
                    </div>

                    {selectedPages.has(page.id) && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, index - 1);
                          }}
                          disabled={index === 0}
                          className="bg-white bg-opacity-90 text-gray-700 px-2 py-1 rounded text-xs hover:bg-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ←
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicatePage(index);
                          }}
                          className="bg-white bg-opacity-90 text-gray-700 px-2 py-1 rounded text-xs hover:bg-opacity-100"
                        >
                          Copy
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, index + 1);
                          }}
                          disabled={index === pages.length - 1}
                          className="bg-white bg-opacity-90 text-gray-700 px-2 py-1 rounded text-xs hover:bg-opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PdfOrganizer;
