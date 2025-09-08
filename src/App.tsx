import React, { useState } from 'react';
import { Upload, FileImage, FilePlus, Download, X, AlertCircle } from 'lucide-react';
import ImageToPdf from './components/ImageToPdf';
import PdfMerger from './components/PdfMerger';

function App() {
  const [activeTab, setActiveTab] = useState<'convert' | 'merge'>('convert');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            PDF <span className="text-blue-600">Toolkit</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Convert images to PDF and merge multiple PDFs securely in your browser. 
            <span className="font-semibold text-blue-600"> 100% private</span> - your files never leave your device.
          </p>
        </div>

        {/* Security Notice */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-green-600 w-5 h-5 flex-shrink-0" />
            <p className="text-green-800 text-sm">
              <strong>Secure & Private:</strong> All processing happens locally in your browser. 
              Your files are never uploaded to any server or stored anywhere.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex bg-white rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setActiveTab('convert')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'convert'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FileImage className="w-5 h-5" />
              Image to PDF
            </button>
            <button
              onClick={() => setActiveTab('merge')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'merge'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              <FilePlus className="w-5 h-5" />
              Merge PDFs
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'convert' ? <ImageToPdf /> : <PdfMerger />}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500 text-sm">
          <p>© 2024 PDF Toolkit. Built with privacy in mind.</p>
        </div>
      </div>
    </div>
  );
}

export default App;