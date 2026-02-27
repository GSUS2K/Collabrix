import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

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

      {/* ── Left Side (Branding) ── */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 z-10 min-h-[50vh] md:min-h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 animate-[fadeIn_0.5s_ease-out]">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        {/* Footer */}
        <footer className="text-white/30 text-xs font-medium tracking-wide mt-8 md:mt-0">
          Made with <span className="text-brand-red animate-[pulse_2s_infinite] inline-block">❤️</span> by{' '}
          <span className="font-bold text-white/50 hover:text-brand-accent transition-colors cursor-default">GSUS</span>{' '}
          using the <span className="font-bold bg-white/5 px-1.5 py-0.5 rounded text-white/40">MERN</span> stack
        </footer>
      </div>

      {/* ── Right Side (Auth Form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-[420px] animate-[slideInUp_0.8s_ease-out]">

          {/* Card */}
          <div className="bg-brand-card/80 backdrop-blur-2xl border border-white/10 rounded-[28px] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
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

          <p className="text-center mt-4 text-[11px] text-white/20">
            By continuing, you agree to our Terms of Service
          </p>
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
    </div>
  );
}
