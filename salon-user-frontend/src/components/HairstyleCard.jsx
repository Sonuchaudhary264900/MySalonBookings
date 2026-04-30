import { useState } from 'react';
import { Eye, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import BeforeAfterModal from './BeforeAfterModal';
import { trackEvent, getStylistMatch } from '../services/hairstyleService';
import { useNavigate } from 'react-router-dom';

export default function HairstyleCard({ hairstyle, capturedBlobUrl, lat, lng, faceShape }) {
  const navigate  = useNavigate();
  const [saved,        setSaved]        = useState(false);
  const [expanded,     setExpanded]     = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [stylists,     setStylists]     = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  const handleSave = async () => {
    const next = !saved;
    setSaved(next);
    await trackEvent({ hairstyleId: hairstyle._id, event_type: next ? 'save' : 'unsave', faceShape });
  };

  const handleExpand = async () => {
    setExpanded(v => !v);
    if (!stylists && !loadingMatch) {
      setLoadingMatch(true);
      try {
        const r = await getStylistMatch({ suggestedService: hairstyle.suggestedService, lat, lng });
        setStylists(r.data.stylists || []);
      } catch { setStylists([]); }
      setLoadingMatch(false);
    }
    await trackEvent({ hairstyleId: hairstyle._id, event_type: 'click', faceShape });
  };

  const handleBook = (stylist) => {
    trackEvent({ hairstyleId: hairstyle._id, event_type: 'book_cta', faceShape });
    if (stylist?.salonId) {
      navigate(`/salon/${stylist.salonId}/book?service=${encodeURIComponent(hairstyle.suggestedService)}&barberId=${stylist.barberId}`);
    }
  };

  return (
    <>
      <div style={{
        background: '#1a1a1a', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #2a2a2a',
      }}>
        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img
            src={hairstyle.imageUrl}
            alt={hairstyle.name}
            style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
          />
          {/* Trending badge */}
          {hairstyle.trending && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(0,0,0,0.7)', borderRadius: 20,
              padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: '#f59e0b', fontWeight: 600,
            }}>
              <Sparkles size={12} /> Trending
            </div>
          )}
          {/* StyleScore badge */}
          {hairstyle.styleScore != null && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.8)', borderRadius: '50%',
              width: 44, height: 44, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              border: '2px solid #f59e0b',
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{hairstyle.styleScore}%</span>
            </div>
          )}
        </div>

        <div style={{ padding: '12px 14px' }}>
          {/* Reasons */}
          {hairstyle.reasons?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {hairstyle.reasons.map((r, i) => (
                <span key={i} style={{
                  fontSize: 10, background: '#2a2a2a', color: '#aaa',
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {r}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>
            {hairstyle.name}
          </div>
          {hairstyle.description && (
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>{hairstyle.description}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setShowModal(true)}
              style={{
                flex: 1, padding: '8px 0', background: '#2a2a2a',
                border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer',
                fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Eye size={14} /> Preview
            </button>
            <button
              onClick={handleSave}
              style={{
                width: 38, height: 38, background: '#2a2a2a',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {saved ? <BookmarkCheck size={16} color="#f59e0b" /> : <Bookmark size={16} color="#aaa" />}
            </button>
            <button
              onClick={handleExpand}
              style={{
                width: 38, height: 38, background: '#2a2a2a',
                border: 'none', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {expanded ? <ChevronUp size={16} color="#aaa" /> : <ChevronDown size={16} color="#aaa" />}
            </button>
          </div>

          {/* Expanded: Why it works + Stylist Match */}
          {expanded && (
            <div style={{ marginTop: 12, borderTop: '1px solid #2a2a2a', paddingTop: 10 }}>
              {hairstyle.whyItWorks && (
                <p style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>{hairstyle.whyItWorks}</p>
              )}
              {loadingMatch ? (
                <div style={{ color: '#666', fontSize: 12 }}>Finding stylists nearby...</div>
              ) : stylists?.length > 0 ? (
                <div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6, fontWeight: 600 }}>STYLISTS NEAR YOU</div>
                  {stylists.map(s => (
                    <div key={s.barberId} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 8, background: '#222', borderRadius: 10, padding: '8px 10px',
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                        background: '#333', flexShrink: 0,
                      }}>
                        {s.photo
                          ? <img src={s.photo} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 16, fontWeight: 700 }}>{s.name[0]}</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#666' }}>{s.salonName} · {s.rating.toFixed(1)}</div>
                      </div>
                      <button
                        onClick={() => handleBook(s)}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                          border: 'none', borderRadius: 8, padding: '6px 12px',
                          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              ) : stylists !== null ? (
                <div style={{ fontSize: 12, color: '#555' }}>No nearby stylists found for this style.</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <BeforeAfterModal
          capturedBlobUrl={capturedBlobUrl}
          hairstyle={hairstyle}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
