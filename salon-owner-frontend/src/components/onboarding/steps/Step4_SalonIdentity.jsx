import React, { useState } from 'react';
import { ArrowRight, Sparkles, Lock, Scissors, Flower2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useTheme } from '../../../context/ThemeContext';
import { SALON_TYPES } from '../../../constants/salonCategories';

const S4_CSS = `
  @keyframes s4-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes s4-chip-in{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
  @keyframes s4-spin{to{transform:rotate(360deg)}}
  .s4-fu1{animation:s4-fadeup 0.45s 0s ease both}
  .s4-fu2{animation:s4-fadeup 0.45s 0.1s ease both}
  .s4-fu3{animation:s4-fadeup 0.45s 0.2s ease both}
  .s4-gender-card{transition:all 0.18s cubic-bezier(0.34,1.56,0.64,1);}
  .s4-gender-card:hover{transform:scale(1.03)!important;}
  .s4-chip{transition:all 0.15s;cursor:pointer;}
  .s4-chip:hover{transform:scale(1.05);}
  .s4-btn{transition:transform 0.15s,box-shadow 0.15s;}
  .s4-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 30px rgba(124,58,237,0.5)!important;}
`;

const AI_NAMES_BY_GENDER = {
  male:   ['The Gents Lounge', 'King\'s Cuts', 'The Barber Lab', 'Sharp & Clean', 'Studio Gents'],
  female: ['Radiance Studio', 'The Glow Room', 'Blossom Beauty', 'Luxe Femme', 'She & Style'],
  unisex: ['Glow Studio', 'The Style Collective', 'Urban Cuts', 'Luxe & Co.', 'The Glow Room'],
  '':     ['Glamour Studio', 'Radiance Salon', 'The Glow Room', 'Luxe Cuts', 'Style & Co.'],
};

const AI_NAMES_BY_BUSINESS_TYPE = {
  barbershop:    ['King\'s Cuts', 'The Barber Lab', 'Sharp & Clean', 'The Gents Room', 'Studio Cuts'],
  salon:         ['The Glow Room', 'Glamour Studio', 'Luxe Cuts', 'Style & Co.', 'Radiance Salon'],
  spa_wellness:  ['Serenity Spa', 'The Zen Garden', 'Bliss & Beyond', 'Tranquil Touch', 'Aura Wellness'],
  makeup_bridal: ['The Bridal Canvas', 'Glamour Bride Studio', 'Luxe Bridal', 'The Glow Studio', 'Radiance Bridal'],
  skin_derma:    ['ClearSkin Clinic', 'DermaCare Studio', 'Glow Derma Clinic', 'Skin & Soul Clinic', 'The Derma Lab'],
};

const AI_DESCRIPTIONS = {
  male:   (city = 'your city') => `A premium men's grooming studio offering expert haircuts, beard styling, and skin care services in the heart of ${city}. Designed for the modern man who demands the best.`,
  female: (city = 'your city') => `An exclusive women's beauty salon providing expert hair styling, skin care, and beauty treatments in ${city}. Where every visit is a luxurious self-care experience.`,
  unisex: (city = 'your city') => `A premium unisex salon offering expert haircuts, color treatments, grooming, and beauty services in ${city}. A welcoming space for everyone who loves to look their best.`,
  '':     (city = 'your city') => `A premium salon offering expert haircuts, color treatments, and beauty services in ${city}. A welcoming space for everyone who loves to look their best.`,
};

export default function Step4_SalonIdentity() {
  const { data, update, nextStep } = useOnboarding();
  const { isDark } = useTheme();

  const [name, setName]           = useState(data.salonName);
  const [gender, setGender]       = useState(data.servedGender);
  const [desc, setDesc]           = useState(data.description);
  const [typewriting, setTypewriting] = useState(false);
  const [errors, setErrors]       = useState({});

  // If a salon type with autoGender was selected in the previous step, lock gender
  const businessTypeDef  = SALON_TYPES.find(t => t.key === data.businessType);
  const lockedGender  = businessTypeDef?.autoGender || null;  // 'male' | 'female' | 'unisex' | null

  const NAME_CONFIG = {
    barbershop:    { label: 'Barbershop Name', placeholder: 'e.g. The Classic Cuts',       title: "What's your barbershop called?" },
    salon:         { label: 'Salon Name',       placeholder: 'e.g. The Glow Room',          title: "What's your salon called?" },
    spa_wellness:  { label: 'Spa Name',         placeholder: 'e.g. Serene Bliss Spa',       title: "What's your spa called? 🧘" },
    makeup_bridal: { label: 'Studio Name',      placeholder: 'e.g. The Bridal Glow Studio', title: "What's your studio called? 💄" },
    skin_derma:    { label: 'Clinic Name',      placeholder: 'e.g. ClearSkin Derma Clinic', title: "What's your clinic called? 🏥" },
  };
  const nameConfig = NAME_CONFIG[data.businessType] || NAME_CONFIG.salon;

  const suggestions = AI_NAMES_BY_BUSINESS_TYPE[data.businessType] || AI_NAMES_BY_GENDER[gender] || AI_NAMES_BY_GENDER[''];

  const typewrite = (text, setter) => {
    setTypewriting(true);
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        i++;
        setter(text.slice(0, i));
        setTimeout(tick, 22);
      } else {
        setTypewriting(false);
      }
    };
    tick();
  };

  const handleAiDesc = () => {
    const city = data.city || data.district || undefined;
    const desc = AI_DESCRIPTIONS[gender] ? AI_DESCRIPTIONS[gender](city) : AI_DESCRIPTIONS[''](city);
    typewrite(desc, setDesc);
  };

  const handleNext = () => {
    const effectiveGender = lockedGender || gender;
    const e = {};
    if (!name.trim())        e.name   = `${nameConfig.label} is required`;
    if (!effectiveGender)    e.gender = 'Please select who you serve';
    if (!desc.trim())        e.desc   = 'Add a short description';
    setErrors(e);
    if (Object.keys(e).length) return;
    update({ salonName: name.trim(), servedGender: effectiveGender, description: desc.trim() });
    toast.success(`${name.trim()} is live on GlowLoox — it's real now! 🏷️`);
    nextStep();
  };

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.1)'  : '#e5e7eb';
  const text   = isDark ? '#f1f5f9' : '#111827';
  const sub    = isDark ? '#94a3b8' : '#6b7280';
  const inpBg  = isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb';
  const inpBorderBase = isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db';

  const inpStyle = (err) => ({
    width: '100%', borderRadius: 12, padding: '13px 16px', fontSize: 15,
    border: `1.5px solid ${err ? '#f87171' : inpBorderBase}`,
    background: inpBg, color: text, outline: 'none',
    transition: 'border-color 0.2s,box-shadow 0.2s', boxSizing: 'border-box', fontFamily: 'inherit',
  });

  return (
    <>
      <style>{S4_CSS}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <div className="s4-fu1">
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, color: text, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            {nameConfig.title}
          </h1>
          <p style={{ color: sub, fontSize: 14, margin: 0, lineHeight: 1.5 }}>
            This is your brand. Make it memorable.
          </p>
        </div>

        {/* Card */}
        <div className="s4-fu2" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 24, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 22, boxShadow: isDark ? 'none' : '0 8px 40px rgba(124,58,237,0.07)' }}>

          {/* Salon name */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: sub, marginBottom: 8 }}>
              {nameConfig.label} *
            </label>
            <input
              placeholder={nameConfig.placeholder}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: '' })); }}
              style={{ ...inpStyle(errors.name), fontSize: 18, fontWeight: 700 }}
              autoFocus
            />
            {errors.name && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.name}</p>}

            {/* AI suggestion chips */}
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {suggestions.map((s, i) => (
                <button key={s} className="s4-chip"
                  onClick={() => typewrite(s, setName)}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                    border: `1.5px solid ${isDark ? 'rgba(139,92,246,0.4)' : 'rgba(124,58,237,0.25)'}`,
                    background: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(124,58,237,0.06)',
                    color: isDark ? '#c4b5fd' : '#7c3aed',
                    cursor: 'pointer', fontFamily: 'inherit',
                    animation: `s4-chip-in 0.3s ${i * 0.06}s ease both`,
                  }}>
                  ✨ {s}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub }}>
                Who do you serve? *
              </label>
              {lockedGender && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)',
                  color: '#a855f7', border: '1px solid rgba(124,58,237,0.25)',
                }}>
                  <Lock size={9} /> Auto-set by {businessTypeDef?.label}
                </span>
              )}
            </div>

            {lockedGender ? (
              /* Locked gender display */
              <div style={{
                padding: '14px 18px', borderRadius: 16,
                border: '2px solid #7c3aed',
                background: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 0 0 3px rgba(124,58,237,0.15)',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {lockedGender === 'male' ? <Scissors size={18} color="#a855f7" /> : lockedGender === 'female' ? <Flower2 size={18} color="#a855f7" /> : <Users size={18} color="#a855f7" />}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>
                    {lockedGender === 'male' ? 'Men Only' : lockedGender === 'female' ? 'Women Only' : 'Unisex'}
                  </div>
                  <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>
                    Pre-selected based on your business type. Change business type in the previous step to update.
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>✓</div>
              </div>
            ) : (
              /* Normal gender picker */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { v: 'male',   Icon: Scissors, label: 'Men Only' },
                  { v: 'female', Icon: Flower2,  label: 'Women Only' },
                  { v: 'unisex', Icon: Users,    label: 'Unisex' },
                ].map(({ v, Icon, label }) => (
                  <button key={v} className="s4-gender-card"
                    onClick={() => { setGender(v); setErrors(er => ({ ...er, gender: '' })); }}
                    style={{
                      padding: '18px 8px', borderRadius: 16, textAlign: 'center',
                      border: `2px solid ${gender === v ? '#7c3aed' : border}`,
                      background: gender === v ? (isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)') : (isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: gender === v ? '0 0 0 3px rgba(124,58,237,0.2), 0 4px 20px rgba(124,58,237,0.15)' : 'none',
                      transform: gender === v ? 'scale(1.04)' : 'scale(1)',
                      position: 'relative',
                    }}>
                    {gender === v && (
                      <div style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: gender === v ? 'rgba(124,58,237,0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={20} color={gender === v ? '#a855f7' : (isDark ? '#94a3b8' : '#6b7280')} />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: gender === v ? '#a855f7' : sub }}>{label}</div>
                  </button>
                ))}
              </div>
            )}
            {errors.gender && <p style={{ color: '#f87171', fontSize: 11, marginTop: 6 }}>{errors.gender}</p>}
          </div>

          {/* Description */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub }}>Description *</label>
              <button onClick={handleAiDesc}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                  border: '1.5px solid rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.1)',
                  color: '#a855f7', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                <Sparkles size={12} />
                Write one for me
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                placeholder="Help customers know what makes you special..."
                value={desc}
                onChange={e => { setDesc(e.target.value.slice(0, 500)); setErrors(er => ({ ...er, desc: '' })); }}
                rows={4}
                style={{
                  ...inpStyle(errors.desc),
                  resize: 'vertical', minHeight: 96, padding: '12px 14px',
                  lineHeight: 1.6, fontSize: 14,
                }}
              />
              <span style={{
                position: 'absolute', bottom: 10, right: 12,
                fontSize: 10, color: desc.length > 480 ? '#f87171' : sub,
              }}>{desc.length}/500</span>
            </div>
            {errors.desc && <p style={{ color: '#f87171', fontSize: 11, marginTop: 4 }}>{errors.desc}</p>}
          </div>

          {/* Quick Setup banner */}
          <div style={{
            background: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(124,58,237,0.05)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.25)' : 'rgba(124,58,237,0.2)'}`,
            borderRadius: 14, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#c4b5fd' : '#6d28d9', margin: '0 0 2px' }}>Quick Setup (Recommended)</p>
              <p style={{ fontSize: 12, color: sub, margin: 0, lineHeight: 1.4 }}>We'll pre-select services and suggest prices based on your business type. You can customize everything.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-flex', cursor: 'pointer' }}>
              <input type="checkbox" checked={data.quickSetup} onChange={e => update({ quickSetup: e.target.checked })} style={{ opacity: 0, width: 0 }} />
              <div style={{
                width: 40, height: 22, borderRadius: 99, transition: 'background 0.2s',
                background: data.quickSetup ? '#7c3aed' : (isDark ? 'rgba(255,255,255,0.1)' : '#d1d5db'),
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 3, left: data.quickSetup ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </label>
          </div>
        </div>

        {/* Continue */}
        <button className="s4-btn s4-fu3"
          onClick={handleNext}
          style={{
            width: '100%', padding: '15px 24px', borderRadius: 14,
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            color: '#fff', fontWeight: 700, fontSize: 16, border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
          Continue — Add Your Location <ArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
