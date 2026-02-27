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

const FLOATING_EMOJIS = [
  { e: '🎨', x: '8%', y: '15%', delay: '0s', dur: '6s' },
  { e: '✏️', x: '88%', y: '12%', delay: '1s', dur: '7s' },
  { e: '🎮', x: '5%', y: '70%', delay: '2s', dur: '5s' },
  { e: '💬', x: '90%', y: '65%', delay: '0.5s', dur: '8s' },
  { e: '🖌️', x: '50%', y: '5%', delay: '1.5s', dur: '6.5s' },
  { e: '⚡', x: '75%', y: '85%', delay: '0.8s', dur: '7.5s' },
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

  // Cycle the highlight word every 2.5s
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
    <div className="relative min-h-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden font-sans">
      {/* ── Ambient Orbs ── */}
      <div className="absolute top-[-15%] left-[-15%] w-[700px] h-[700px] bg-brand-accent/15 rounded-full blur-[140px] pointer-events-none animate-[pulse_8s_infinite]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-brand-purple/20 rounded-full blur-[120px] pointer-events-none animate-[pulse_10s_infinite_2s]" />
      <div className="absolute top-[40%] right-[25%] w-[300px] h-[300px] bg-[#FF6B6B]/10 rounded-full blur-[90px] pointer-events-none animate-[pulse_12s_infinite_4s]" />

      {/* ── Floating Emojis ── */}
      {FLOATING_EMOJIS.map(({ e, x, y, delay, dur }) => (
        <div
          key={e + x}
          className="absolute text-2xl pointer-events-none select-none opacity-20"
          style={{
            left: x, top: y,
            animation: `float ${dur} ease-in-out infinite`,
            animationDelay: delay,
          }}
        >
          {e}
        </div>
      ))}

      {/* ── Left Side (Content & Form) ── */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center p-8 md:p-12 lg:p-20 z-10 min-h-screen relative overflow-y-auto custom-scrollbar shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        {/* Logo */}
        <div className="flex items-center gap-3 animate-[fadeIn_0.5s_ease-out] mb-12">
          <div className="relative w-10 h-10 flex items-center justify-center bg-brand-accent/15 rounded-xl border border-brand-accent/30 shadow-[0_0_20px_rgba(0,255,191,0.2)] hover:scale-110 transition-transform cursor-default">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#00FFBF" />
            </svg>
          </div>
          <span className="text-2xl font-display font-bold tracking-wide text-white">Collabrix</span>
        </div>

        {/* Hero */}
        <div className="max-w-lg animate-[slideInUp_0.7s_ease-out]">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-xs font-bold uppercase tracking-widest mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-[pulse_1.5s_infinite]" />
            Live & Free — No credit card needed
          </div>

          <h1 className="text-5xl md:text-6xl font-display font-black leading-tight mb-4 tracking-tight">
            Create.
            <br />
            Collaborate.
            <br />
            <span
              className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-[#00E6A8] to-brand-accent transition-all duration-400"
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

          <p className="text-base text-white/55 mb-10 leading-relaxed max-w-sm">
            The canvas where ideas become art. Draw, game, voice-chat, and react — all inside one powerful collaborative space built for creators.
          </p>

          {/* Feature Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <div
                key={title}
                className="group flex items-start gap-3 bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4 backdrop-blur-sm hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 transition-all cursor-default"
                style={{ animation: `slideInUp 0.6s ease-out ${0.1 * (i + 1)}s both` }}
              >
                <span className="text-xl mt-0.5 group-hover:scale-110 transition-transform">{icon}</span>
                <div>
                  <p className="text-sm font-bold text-white/90">{title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form Card embedded in left column */}
          <div className="w-full max-w-[480px] bg-brand-card/60 backdrop-blur-3xl border border-white/10 rounded-[28px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)] animate-[slideInUp_0.8s_ease-out]">
            {/* Tab Switcher */}
            <div className="flex bg-white/5 rounded-xl p-1 mb-8 border border-white/5">
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
                    className="w-full bg-brand-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
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
                  className="w-full bg-brand-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
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
                  className="w-full bg-brand-dark/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all hover:border-white/20"
                  type="password"
                  placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>

              <button
                className="w-full bg-brand-accent text-brand-dark font-black text-sm py-3.5 mt-1 flex items-center justify-center gap-2 rounded-xl transition-all hover:bg-brand-accentHover hover:shadow-[0_0_30px_rgba(0,255,191,0.35)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
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
          </div>

          <div className="flex flex-col items-center mt-8 gap-4">
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/GSUS2K"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-white/70 hover:text-white transition-all hover:scale-105"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GSUS2K
              </a>

              <button
                onClick={() => {
                  logEvent('Monetization', 'Click Buy Me A Coffee', 'Auth Page');
                  setShowDonationModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-brand-yellow/10 hover:bg-brand-yellow/20 border border-brand-yellow/20 rounded-full text-xs font-bold text-brand-yellow transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(255,217,61,0.2)]"
              >
                <span>🥤</span> Buy me a cold coffee (Max $5)
              </button>
            </div>

            <p className="text-center text-[11px] text-white/20">
              By continuing, you agree to our Terms of Service
            </p>
          </div>
        </div>

        {/* ── Right Side (Interactive 3D / Graphics) ── */}
        <div className="hidden lg:block absolute top-0 bottom-0 right-0 lg:left-[45%] xl:left-[40%] bg-black/20 border-l border-white/5 z-0 overflow-hidden pointer-events-none">
          {/* A beautiful interactive abstract 3D keyboard/glass scene from Spline Community */}
          <div className="absolute top-0 right-0 bottom-0 left-0 w-full h-full mix-blend-screen pointer-events-auto cursor-grab active:cursor-grabbing">
            <Spline
              scene="https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode"
              style={{ width: '100%', height: '100%' }}
            />
          </div>

          {/* Floating text hints over the 3D scene */}
          <div className="absolute bottom-12 right-12 z-10 pointer-events-none text-right">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl animate-[slideInUp_1s_ease-out]">
              <span className="text-brand-accent animate-[pulse_1s_infinite]">👆</span>
              <span className="text-white/60 text-xs font-bold tracking-widest uppercase">Drag to play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Float animation keyframes via inline style tag */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(5deg); }
          66% { transform: translateY(-8px) rotate(-3deg); }
        }
      `}</style>

      {/* Custom Global Modals */}
      <DonationModal
        isOpen={showDonationModal}
        onClose={() => setShowDonationModal(false)}
      />
    </div>
  );
}
