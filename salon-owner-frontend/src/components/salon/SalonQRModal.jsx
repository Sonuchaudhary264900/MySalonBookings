import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Copy, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const CUSTOMER_URL = import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:5174';

const SalonQRModal = ({ salon, onClose }) => {
  const qrRef = useRef(null);
  const salonUrl = `${CUSTOMER_URL}/salon/${salon._id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(salonUrl);
    toast.success('Link copied!');
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const link = document.createElement('a');
      link.download = `${salon.name || 'salon'}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — top-right corner */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-100 transition z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-700" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <QrCode className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">My Salon QR Code</h2>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-5">
          <p className="text-sm text-gray-500 text-center">
            Customers scan this to open your salon page instantly
          </p>

          {/* QR Code */}
          <div
            ref={qrRef}
            className="p-4 bg-white border-2 border-gray-200 rounded-xl"
          >
            <QRCode
              value={salonUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#1e1b4b"
              level="M"
            />
          </div>

          <p className="text-xs text-gray-400 font-mono text-center break-all px-2">
            {salonUrl}
          </p>

          {/* Actions */}
          <div className="flex gap-3 w-full">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalonQRModal;
