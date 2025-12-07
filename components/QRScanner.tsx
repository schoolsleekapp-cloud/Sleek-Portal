import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

declare const jsQR: any; // Global from CDN

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const scanningRef = useRef(true);

  // Function to stop camera tracks
  const stopCamera = () => {
      scanningRef.current = false;
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
  };

  // Scanning loop
  const tick = useCallback(() => {
      if (!scanningRef.current) return;
      
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && code.data) {
                        stopCamera();
                        onScan(code.data);
                        return;
                    }
                }
            }
        }
      }
      requestAnimationFrame(tick);
  }, [onScan]);

  // Start Camera Logic
  const startCamera = useCallback(async () => {
      setError('');
      scanningRef.current = true;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Camera API not supported. Please use Upload.");
          return;
      }

      try {
        // First try to get the back camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "environment" } 
            });
            handleStream(stream);
        } catch (e) {
            // Fallback to any available video source (webcams, etc)
            console.log("Environment camera failed, falling back to any video source.");
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                video: true 
            });
            handleStream(fallbackStream);
        }
      } catch (err: any) {
        console.error("Camera Access Error:", err);
        stopCamera();
        setError("Camera access denied or unavailable. Please check browser permissions.");
      }
  }, [tick]);

  const handleStream = (stream: MediaStream) => {
      streamRef.current = stream;
      if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(e => console.error("Video play error:", e));
          requestAnimationFrame(tick);
      }
  };

  // Initialize on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                if (typeof jsQR !== 'undefined') {
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });
                    if (code && code.data) {
                         stopCamera();
                         onScan(code.data);
                         onClose();
                    } else {
                        setError("No QR code found in the uploaded image.");
                    }
                }
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden relative shadow-2xl">
        <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2"><Camera size={20}/> Scan QR Code</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
             {error ? (
                 <div className="text-white text-center p-6 w-full">
                     <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                         <X size={24} />
                     </div>
                     <p className="mb-6 text-red-200 text-sm leading-relaxed px-4">{error}</p>
                     <div className="flex flex-col gap-3 max-w-xs mx-auto">
                         <Button onClick={startCamera} variant="primary" className="w-full bg-indigo-600 hover:bg-indigo-700 border-none">
                             <RefreshCw size={18} /> Retry Camera
                         </Button>
                         <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full bg-white/10 text-white border-white/20 hover:bg-white/20">
                             <ImageIcon size={18} /> Upload Image Instead
                         </Button>
                     </div>
                 </div>
             ) : (
                 <>
                    <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-80" muted playsInline></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 border-2 border-white/10 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-64 h-64 border-2 border-indigo-500 rounded-lg relative animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-8 flex gap-4 z-10 pointer-events-auto">
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm">
                            <ImageIcon size={18} /> Upload QR Image
                        </Button>
                    </div>
                 </>
             )}
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
        
        <div className="p-4 bg-gray-50 text-center">
             <p className="text-sm text-gray-500">Align the QR code within the frame or upload an image.</p>
        </div>
      </div>
    </div>
  );
};