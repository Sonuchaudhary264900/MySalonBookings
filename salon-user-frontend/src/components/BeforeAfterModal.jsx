import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function BeforeAfterModal({ capturedBlobUrl, hairstyle, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!hairstyle) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111', borderRadius: 16, overflow: 'hidden',
          maxWidth: 700, width: '95vw', position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} color="#fff" />
        </button>

        <div style={{ display: 'flex', height: 340 }}>
          {/* Before */}
          <div style={{ flex: 1, position: 'relative' }}>
            {capturedBlobUrl ? (
              <img
                src={capturedBlobUrl}
                alt="You"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ background: '#222', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                No photo
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            }}>
              You
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 2, background: '#333' }} />

          {/* After */}
          <div style={{ flex: 1, position: 'relative' }}>
            <img
              src={hairstyle.imageUrl}
              alt={hairstyle.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              padding: '4px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            }}>
              {hairstyle.name}
            </div>
          </div>
        </div>

        {/* Why it works */}
        {hairstyle.whyItWorks && (
          <div style={{ padding: '12px 16px', color: '#ccc', fontSize: 13, borderTop: '1px solid #222' }}>
            {hairstyle.whyItWorks}
          </div>
        )}
      </div>
    </div>
  );
}
