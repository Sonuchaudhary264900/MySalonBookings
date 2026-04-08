import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { Scissors } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/auth/login', form);
      localStorage.setItem('admin_token', res.data.data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const outerBg = dark
    ? 'linear-gradient(135deg, #07071a 0%, #0d0d28 50%, #07071a 100%)'
    : 'linear-gradient(135deg, #e0e7ff 0%, #f0f2f8 50%, #ddd6fe 100%)';

  const cardStyle = dark
    ? {
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }
    : {
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
      };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: outerBg }}>
      <div style={{ ...cardStyle, borderRadius: 20, padding: 40, width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 14, padding: 14, marginBottom: 16, boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}>
            <Scissors size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Admin Login</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>SmartSalon Management Panel</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="admin@example.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--input-bg)',
                border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 14, outline: 'none',
                color: 'var(--text)',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Password</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: 'var(--input-bg)',
                border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 14, outline: 'none',
                color: 'var(--text)',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
