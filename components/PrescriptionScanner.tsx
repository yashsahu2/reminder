'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { PrescriptionAnalysisResult } from '@/types/medication';
import { triggerHapticFeedback } from '@/lib/notification';

interface PrescriptionScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete: (result: PrescriptionAnalysisResult, previewUrl: string) => void;
}

const SAMPLE_PRESCRIPTION_URL = 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80';

export default function PrescriptionScanner({
  isOpen,
  onClose,
  onAnalysisComplete,
}: PrescriptionScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scanSteps = [
    'Reading doctor handwriting with Gemini 3.8 Flash...',
    'Finding medicine names and dosages...',
    'Setting up your reminder schedule...',
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setScanStepIndex((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
      }, 1100);
    } else {
      setScanStepIndex(0);
    }
    return () => clearInterval(interval);
  }, [isScanning, scanSteps.length]);

  if (!isOpen) return null;

// Client-side image compression to prevent memory bloat and upload timeouts
async function compressImageFile(file: File, maxDim = 1600, quality = 0.90): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return resolve('');

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await compressImageFile(file);
      if (compressedDataUrl) {
        setSelectedImage(compressedDataUrl);
        setErrorMsg(null);
      }
    } catch (err) {
      console.error('Error processing image:', err);
    } finally {
      // Clear value so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedImage) return;

    setIsScanning(true);
    setErrorMsg(null);
    triggerHapticFeedback();

    try {
      const response = await fetch('/api/analyze-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: selectedImage }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze prescription');
      }

      triggerHapticFeedback();
      onAnalysisComplete(data.data, selectedImage);
      onClose();
    } catch (err: unknown) {
      console.error('Scan error:', err);
      setErrorMsg((err as Error).message || 'Could not read prescription. Please take a clearer photo and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Scan Prescription
            </h2>
            <p className="text-xs text-gray-500">
              Powered by Google Gemini 3.8 Flash
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isScanning}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport / Content */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col items-center justify-center min-h-[300px]">
          {selectedImage ? (
            <div className="relative w-full aspect-[3/4] max-h-[340px] rounded-2xl overflow-hidden bg-black/5 border border-gray-200 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Prescription preview"
                className={`w-full h-full object-contain ${isScanning ? 'opacity-70' : ''}`}
              />

              {!isScanning && (
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-xs px-3 py-1.5 rounded-full flex items-center space-x-1 backdrop-blur-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-6 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Camera className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Take a Photo of Your Rx
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mb-6">
                Point your phone camera at your doctor&apos;s prescription paper. Gemini will set your reminders automatically.
              </p>

              <div className="w-full space-y-2.5">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 active:scale-98 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Open Camera</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-sm font-semibold flex items-center justify-center space-x-2 active:scale-98 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span>Upload from Photos</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedImage(SAMPLE_PRESCRIPTION_URL);
                  setErrorMsg(null);
                }}
                className="text-xs text-blue-600 hover:underline mt-4 font-medium"
              >
                Or try with a sample prescription →
              </button>
            </div>
          )}

          {/* Scanning Status */}
          {isScanning && (
            <div className="w-full mt-4 p-4 rounded-xl bg-blue-50 border border-blue-100 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-sm font-bold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
                <span>{scanSteps[scanStepIndex]}</span>
              </div>
              <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${((scanStepIndex + 1) / scanSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="w-full mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2 text-red-700 text-xs text-left">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedImage && !isScanning && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex space-x-3 pb-safe">
            <button
              onClick={() => setSelectedImage(null)}
              className="py-3 px-4 rounded-xl bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold border border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleStartAnalysis}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Read Prescription</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
