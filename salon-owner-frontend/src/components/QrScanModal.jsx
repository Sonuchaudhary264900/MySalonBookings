import { useEffect, useRef, useState } from 'react';
import { X, ScanLine, ImageUp } from 'lucide-react';

// Pulls a UPI ID (VPA) out of any scanned QR text.
// UPI payment QRs encode "upi://pay?pa=<vpa>&pn=..."; plain QRs may hold a raw VPA.
export function extractUpiId(text) {
  if (!text) return null;
  const paMatch = text.match(/[?&]pa=([^&]+)/i);
  const candidate = paMatch ? decodeURIComponent(paMatch[1]) : text;
  const vpa = candidate.match(/[\w.\-]{2,256}@[a-zA-Z]{2,64}/);
  return vpa ? vpa[0] : null;
}

// Live camera QR scanner using the native BarcodeDetector API, with an
// image-upload fallback. Calls onResult(upiId) when a UPI QR is recognised.
export default function QrScanModal({ onResult, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopRef = useRef(false);
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [supported] = useState(() => typeof window !== 'undefined' && 'BarcodeDetector' in window);

  useEffect(() => {
    if (!supported) return;
    stopRef.current = false;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      setError('QR scanning is not supported on this browser. Type the UPI ID instead.');
      return;
    }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const scan = async () => {
          if (stopRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const upi = extractUpiId(codes[0]?.rawValue);
            if (upi) {
              stopRef.current = true;
              onResult(upi);
              return;
            }
            if (codes.length > 0) setError('That QR has no UPI ID. Scan a UPI payment QR.');
          } catch {
            // detector can throw while the video warms up — keep polling
          }
          setTimeout(scan, 300);
        };
        scan();
      } catch {
        setError('Camera access denied. Allow camera permission or type the UPI ID.');
      }
    })();

    return () => {
      stopRef.current = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [supported, onResult]);

  const scanImageFile = async (file) => {
    if (!file || !supported) return;
    setError('');
    try {
      const bitmap = await createImageBitmap(file);
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      const codes = await detector.detect(bitmap);
      const upi = extractUpiId(codes[0]?.rawValue);
      if (upi) onResult(upi);
      else setError(codes.length ? 'That QR has no UPI ID. Use a UPI payment QR.' : 'No QR code found in that image.');
    } catch {
      setError('Could not read that image. Try another one.');
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[600] bg-black/75 flex items-center justify-center p-4"
    >
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <ScanLine className="w-4 h-4 text-violet-600 dark:text-violet-400 mr-2" />
          <span className="flex-1 text-sm font-bold text-gray-900 dark:text-white">Scan UPI QR</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
            <X className="w-4.5 h-4.5" size={18} />
          </button>
        </div>

        {supported ? (
          <div className="relative bg-black">
            <video ref={videoRef} muted playsInline className="w-full h-[280px] object-cover block" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[190px] h-[190px] border-[2.5px] border-violet-500/90 rounded-2xl" />
            </div>
          </div>
        ) : (
          <p className="px-4 py-5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
            Live scanning is not supported on this browser. Upload a photo of the QR instead, or type the UPI ID manually.
          </p>
        )}

        <div className="px-4 py-3">
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <p className="text-[11.5px] text-gray-400 dark:text-gray-500 mb-2.5">
            Point the camera at any UPI QR (PhonePe, GPay, Paytm, bank QR). The UPI ID is read automatically.
          </p>
          {supported && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-[13px] font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ImageUp className="w-4 h-4" /> Scan from an image instead
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => scanImageFile(e.target.files?.[0])} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
