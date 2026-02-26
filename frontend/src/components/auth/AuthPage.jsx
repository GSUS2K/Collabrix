import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.username.length < 2) {
          toast.error('Username must be 2+ characters');
          setBusy(false);
          return;
        }
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    setBusy(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-dark flex flex-col md:flex-row overflow-hidden font-sans">
      {/* ── Ambient Orbs ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-accent/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-brand-purple/20 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Left Side (Branding) ── */}
      <div className="flex-1 flex flex-col justify-center p-8 md:p-20 z-10">
        <div className="flex items-center gap-3 mb-12 animate-[fadeIn_0.5s_ease-out]">
          <div className="relative w-10 h-10 flex items-center justify-center bg-brand-accent/15 rounded-xl border border-brand-accent/30 shadow-[0_0_20px_rgba(0,255,191,0.2)]">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
              <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="20" cy="20" r="4" fill="#00FFBF" />
            </svg>
          </div>
          <span className="text-2xl font-display font-bold tracking-wide text-white">Collabrix</span>
        </div>

        <div className="max-w-lg animate-[slideInUp_0.6s_ease-out]">
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            Draw.<br />Create.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-[#00CC99]">
              Together.
            </span>
          </h1>
          <p className="text-lg text-white/60 mb-10 leading-relaxed max-w-md font-sans">
            A real-time collaborative whiteboard with drawing tools, sticky notes, live cursor tracking, and a built-in Skribbl game.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              ['🎨', 'Full drawing toolkit'],
              ['💬', 'Live chat & reactions'],
              ['🎮', 'Built-in Skribbl game'],
              ['📌', 'Sticky notes & exports'],
            ].map(([icon, text], i) => (
              <div
                key={text}
                className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-xl p-4 backdrop-blur-sm transition-all hover:bg-white/10"
                style={{ animation: `slideInUp 0.6s ease-out ${0.1 * (i + 1)}s both` }}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-medium text-white/80">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Side (Auth Form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-[420px] bg-brand-card/80 backdrop-blur-xl border border-white/10 rounded-[24px] p-8 shadow-2xl animate-[slideInUp_0.8s_ease-out]">

          <div className="flex bg-white/5 rounded-lg p-1 mb-8 border border-white/5">
            <button
              className={`flex-1 text-sm font-semibold py-2.5 rounded-md transition-all ${mode === 'login' ? 'bg-brand-accent text-brand-dark shadow-md' : 'text-white/50 hover:text-white'
                }`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              className={`flex-1 text-sm font-semibold py-2.5 rounded-md transition-all ${mode === 'register' ? 'bg-brand-accent text-brand-dark shadow-md' : 'text-white/50 hover:text-white'
                }`}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>

          <div className="flex justify-center mb-6 relative z-20">
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

          <div className="flex items-center mb-6 text-white/30 text-xs font-semibold tracking-widest">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-4">OR EXPLICITLY</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={submit}>
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Username</label>
                <input
                  className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
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
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Email</label>
              <input
                className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Password</label>
              <input
                className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent transition-all"
                type="password"
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={form.password}
                onChange={set('password')}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            <button
              className="w-full bg-brand-accent text-brand-dark font-bold text-[13px] py-3.5 mt-2 flex items-center justify-center gap-2 rounded-xl transition-all hover:bg-brand-accentHover hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <div className="w-5 h-5 border-2 border-brand-dark/20 border-t-brand-dark rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-[13px] text-white/50">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className="text-white hover:text-brand-accent transition-colors font-medium underline decoration-white/20 underline-offset-4"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
