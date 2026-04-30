import { X, Sun, Camera, Glasses } from 'lucide-react';

const TIPS = [
  { Icon: Sun,     title: 'Good lighting',      desc: 'Face a window or bright light — avoid backlight' },
  { Icon: Camera,  title: 'Face forward',        desc: 'Look straight at the camera, head level' },
  { Icon: Glasses, title: 'Remove accessories',  desc: 'Take off glasses, hats, or anything covering your face' },
];

export default function ScanTipsModal({ onContinue, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#111', border: '1px solid #2a2a2a', borderRadius: 24,
        padding: '32px 28px', maxWidth: 400, width: '100%', position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: '#1e1e1e', border: 'none', borderRadius: '50%',
          width: 32, height: 32, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#888',
        }}>
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px',
            background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(236,72,153,0.15))',
            border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={26} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
            For best results
          </div>
          <div style={{ fontSize: 13, color: '#666' }}>
            A clear photo gives you more accurate recommendations
          </div>
        </div>

        {/* Tips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {TIPS.map(({ Icon, title, desc }) => (
            <div key={title} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: '#1a1a1a', borderRadius: 14, padding: '14px 16px',
              border: '1px solid #242424',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(236,72,153,0.12))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={18} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#eee', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={onContinue} style={{
          width: '100%', padding: '15px 0',
          background: 'linear-gradient(135deg,#f59e0b,#ec4899)',
          border: 'none', borderRadius: 14, color: '#fff',
          fontSize: 15, fontWeight: 800, cursor: 'pointer',
          letterSpacing: '-0.01em',
        }}>
          Got it — scan my face
        </button>
      </div>
    </div>
  );
}
