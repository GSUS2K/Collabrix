import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import Spline from '@splinetool/react-spline';
import toast from 'react-hot-toast';
import { logEvent } from '../../utils/analytics';
import DonationModal from '../common/DonationModal';

const CYCLING_WORDS = ['Together.', 'Creatively.', 'In Real-Time.', 'Effortlessly.', 'With Friends.'];

const FEATURES = [
  { icon: '🎨', title: 'Draw & Paint', desc: 'Full brush toolkit, shapes, eraser, and fill.' },
  { icon: '🎮', title: 'Play Games', desc: 'Built-in Skribbl drawing game for your room.' },
  { icon: '📡', title: 'Live Together', desc: 'Real-time cursors, video & voice chat.' },
  { icon: '💬', title: 'Chat & React', desc: 'Emoji bursts, file attachments, live chat.' },
];

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const [showDonationModal, setShowDonationModal] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % CYCLING_WORDS.length);
        setFading(false);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.username.length < 2) { toast.error('Username must be 2+ characters'); setBusy(false); return; }
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally { setBusy(false); }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    setBusy(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden font-sans bg-brand-dark">

      {/* ── Full-Screen 3D Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-auto cursor-grab active:cursor-grabbing">
        <Spline
          scene="https://prod.spline.design/xwqDYBialmxhQV28/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* ── Dark vignette overlay so text is readable ── */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 60% 50%, transparent 0%, rgba(12,12,15,0.55) 60%, rgba(12,12,15,0.92) 100%)',
        }}
      />
      {/* extra left-side gradient for the hero text legibility */}
      <div className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(12,12,15,0.75) 0%, rgba(12,12,15,0.1) 50%, transparent 100%)',
        }}
      />

      {/* ── "Drag to play" hint ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shadow-xl animate-[slideInUp_1.5s_ease-out]">
          <span className="text-brand-accent animate-[pulse_1.5s_infinite]">👆</span>
          <span className="text-white/50 text-[11px] font-bold tracking-widest uppercase">Drag the scene</span>
        </div>
      </div>

      {/* ── Main Layout: Hero left + Form right ── */}
      <div className="relative z-20 w-full h-full flex flex-col lg:flex-row items-center justify-center lg:justify-between px-6 py-10 lg:px-16 xl:px-24 gap-10 overflow-y-auto custom-scrollbar pointer-events-none">

        {/* ── Hero Column (left on desktop) ── */}
        <div className="flex-1 max-w-xl pointer-events-none animate-[slideInUp_0.7s_ease-out]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="relative w-10 h-10 flex items-center justify-center bg-brand-accent/15 rounded-xl border border-brand-accent/30 shadow-[0_0_20px_rgba(0,255,191,0.2)]">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
                <circle cx="20" cy="20" r="4" fill="#00FFBF" />
              </svg>
            </div>
            <span className="text-2xl font-display font-bold tracking-wide text-white">Collabrix</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-bold uppercase tracking-widest mb-6">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-[pulse_1.5s_infinite]" />
            Live &amp; Free — No credit card needed
          </div>

          {/* H1 */}
          <h1 className="text-5xl md:text-6xl xl:text-7xl font-display font-black leading-[1.05] mb-5 tracking-tight drop-shadow-2xl">
            Create.<br />
            Collaborate.<br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-[#00E6A8] to-brand-accent"
              style={{
                opacity: fading ? 0 : 1,
                transform: fading ? 'translateY(10px)' : 'translateY(0)',
                display: 'inline-block',
                transition: 'opacity 0.4s, transform 0.4s',
              }}
            >
              {CYCLING_WORDS[wordIdx]}
            </span>
          </h1>

          <p className="text-base text-white/60 mb-8 leading-relaxed max-w-md drop-shadow-lg">
            The canvas where ideas become art. Draw, game, voice-chat, and react — all inside one powerful collaborative space built for creators.
          </p>

          {/* Feature pills — hidden on small screens to reduce clutter */}
          <div className="hidden md:grid grid-cols-2 gap-3 max-w-sm">
            {FEATURES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-3 bg-white/[0.06] border border-white/10 rounded-2xl p-3.5 backdrop-blur-md hover:bg-white/10 hover:-translate-y-0.5 transition-all cursor-default"
              >
                <span className="text-lg mt-0.5">{icon}</span>
                <div>
                  <p className="text-sm font-bold text-white/90">{title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Login Card (right on desktop) ── */}
        <div className="pointer-events-auto w-full max-w-[420px] bg-white/[0.06] backdrop-blur-2xl border border-white/[0.12] rounded-[28px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.6)] animate-[slideInUp_0.9s_ease-out] flex-shrink-0">

          {/* Tab Switcher */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-7 border border-white/5">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                className={`flex-1 text-sm font-bold py-2.5 rounded-lg transition-all ${mode === m ? 'bg-brand-accent text-brand-dark shadow-md' : 'text-white/40 hover:text-white'}`}
                onClick={() => setMode(m)}
              >
                {m === 'login' ? '👋 Sign In' : '✨ Create Account'}
              </button>
            ))}
          </div>

          {/* Google */}
          <div className="flex justify-center mb-5 relative z-20">
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={() => toast.error('Google login failed or was cancelled')}
              theme="filled_black"
              size="large"
              shape="pill"
              text={mode === 'login' ? 'signin_with' : 'signup_with'}
              width="320"
            />
          </div>

          {/* Divider */}
          <div className="flex items-center mb-5 text-white/25 text-[10px] font-black tracking-[0.2em]">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-4">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form className="flex flex-col gap-4" onSubmit={submit}>
            {mode === 'register' && (
              <div className="animate-[slideInUp_0.3s_ease-out]">
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Username</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
                  type="text"
                  placeholder="coolartist42"
                  value={form.username}
                  onChange={set('username')}
                  required
                  autoComplete="username"
                />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Email</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Password</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
                type="password"
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={form.password}
                onChange={set('password')}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            <button
              className="w-full bg-brand-accent text-brand-dark font-black text-sm py-3.5 mt-1 flex items-center justify-center gap-2 rounded-xl transition-all hover:bg-brand-accentHover hover:shadow-[0_0_30px_rgba(0,255,191,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <span className="group-hover:translate-x-1 transition-transform text-lg">→</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5 text-[12px] text-white/40">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="text-white/70 hover:text-brand-accent transition-colors font-bold underline decoration-white/20 underline-offset-4"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-3 mt-6 pt-5 border-t border-white/[0.07]">
            <a
              href="https://github.com/GSUS2K"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white/60 hover:text-white transition-all hover:scale-105"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GSUS2K
            </a>

            <button
              onClick={() => {
                logEvent('Monetization', 'Click Buy Me A Coffee', 'Auth Page');
                setShowDonationModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/20 rounded-full text-xs font-bold text-brand-yellow transition-all hover:scale-105"
            >
              <span>🥤</span> Cold coffee?
            </button>
          </div>

          <p className="text-center text-[10px] text-white/15 mt-3">
            By continuing, you agree to our Terms of Service
          </p>
        </div>
      </div>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(5deg); }
          66% { transform: translateY(-8px) rotate(-3deg); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </div>
  );
}
