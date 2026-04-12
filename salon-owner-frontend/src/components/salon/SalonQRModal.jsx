import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Download, Copy, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const CUSTOMER_URL = (import.meta.env.VITE_CUSTOMER_APP_URL || 'http://localhost:5174').replace(/\/$/, '');

const SalonQRModal = ({ salon, onClose }) => {
  const qrRef = useRef(null);
  const salonUrl = `${CUSTOMER_URL}/salon/${salon._id}`;

  const handleCopyLink = () => {
    import('../../utils/clipboard').then(({ copyToClipboard }) =>
      copyToClipboard(salonUrl)
    ).then(() => toast.success('Link copied!')).catch(() => toast.error('Copy failed'));
  };

  const buildCard = () => new Promise((resolve, reject) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return reject();
    const hiResSvg = svg.cloneNode(true);
    hiResSvg.setAttribute('width', 540);
    hiResSvg.setAttribute('height', 540);
    const blob = new Blob([new XMLSerializer().serializeToString(hiResSvg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const qrImg = new Image();
    qrImg.onload = () => {
      const W = 400, H = 560, SCALE = 3;
      const canvas = document.createElement('canvas');
      canvas.width = W * SCALE; canvas.height = H * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas not supported')); return; }
      ctx.scale(SCALE, SCALE);

      // Background & card
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(20, 20, 360, 520);

      // Header
      ctx.fillStyle = '#4f46e5'; ctx.fillRect(20, 20, 360, 74);
      ctx.fillStyle = '#ffffff'; ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"; ctx.textAlign = 'center';
      ctx.fillText('\u2702  Salon Booking', 200, 64);

      // QR code
      ctx.drawImage(qrImg, 110, 110, 180, 180);

      // Salon name
      ctx.fillStyle = '#111827'; ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText(salon?.name || 'My Salon', 200, 322);

      // Subtitle
      ctx.fillStyle = '#6b7280'; ctx.font = "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText('Scan to book your appointment', 200, 348);

      // Divider
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, 368); ctx.lineTo(340, 368); ctx.stroke();

      // Full URL with word-wrap
      ctx.fillStyle = '#9ca3af'; ctx.font = "9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      const maxUrlW = 320;
      let line = '', lines = [], chars = salonUrl.split('');
      chars.forEach(ch => {
        const test = line + ch;
        if (ctx.measureText(test).width > maxUrlW && line) { lines.push(line); line = ch; }
        else { line = test; }
      });
      if (line) lines.push(line);
      lines.forEach((l, i) => ctx.fillText(l, 200, 386 + i * 13));

      // Footer
      ctx.fillStyle = '#6b7280'; ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
      ctx.fillText('Powered by GlowLoox', 200, 500);

      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    qrImg.onerror = () => { URL.revokeObjectURL(url); reject(); };
    qrImg.src = url;
  });

  const handleDownloadImage = async () => {
    try {
      const canvas = await buildCard();
      const link = document.createElement('a');
      link.download = `${salon.name || 'salon'}-booking-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR card downloaded!');
    } catch { toast.error('Could not generate QR card'); }
  };

  const handleDownloadPDF = async () => {
    try {
      const canvas = await buildCard();
      const dataUrl = canvas.toDataURL('image/png');
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0';
      iframe.srcdoc = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{display:flex;justify-content:center;align-items:flex-start;background:#fff}img{max-width:100%;height:auto;display:block}@page{margin:10mm}@media print{body{margin:0}}</style></head><body><img src="${dataUrl}"/></body></html>`;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 3000);
      };
      toast.success('Print dialog opened — save as PDF!');
    } catch { toast.error('Could not generate PDF'); }
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
          <h2 className="font-semibold text-gray-900">My QR Code</h2>
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
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </button>
            <button
              onClick={handleDownloadImage}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 transition"
            >
              <Download className="w-4 h-4" />
              Image
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-800 rounded-lg text-sm font-medium text-white hover:bg-gray-900 transition"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalonQRModal;
