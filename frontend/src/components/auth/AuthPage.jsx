import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './AuthPage.module.css';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        if (form.username.length < 2) { toast.error('Username must be 2+ characters'); return; }
        await register(form.username, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Ambient orbs */}
      <div className={styles.orb1} />
      <div className={styles.orb2} />
      <div className={styles.orb3} />

      <div className={styles.left}>
        <div className={styles.logoMark}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="#00FFBF" fillOpacity="0.15"/>
            <path d="M8 20 Q14 10 20 20 Q26 30 32 20" stroke="#00FFBF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="20" cy="20" r="3" fill="#00FFBF"/>
          </svg>
          <span className={styles.logoText}>Collabrix</span>
        </div>

        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Draw.<br />Create.<br />
            <span className={styles.heroAccent}>Together.</span>
          </h1>
          <p className={styles.heroSub}>
            Real-time collaborative whiteboard with drawing tools,
            sticky notes, reactions, and a built-in Skribbl game.
          </p>
        </div>

        <div className={styles.features}>
          {[
            ['🎨', 'Full drawing toolkit with shapes'],
            ['💬', 'Live chat & emoji reactions'],
            ['🎮', 'Skribbl.io game mode built-in'],
            ['📌', 'Sticky notes & canvas export'],
          ].map(([icon, text]) => (
            <div key={text} className={styles.feature}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.card}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => setMode('login')}
            >Sign In</button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => setMode('register')}
            >Create Account</button>
          </div>

          <form className={styles.form} onSubmit={submit}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="coolartist42"
                  value={form.username}
                  onChange={set('username')}
                  required
                  autoComplete="username"
                />
              </div>
            )}
            <div className={styles.field}>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>
            <div className={styles.field}>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder={mode === 'register' ? 'Min 6 characters' : '••••••••'}
                value={form.password}
                onChange={set('password')}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            <button className={`btn btn-primary ${styles.submitBtn}`} type="submit" disabled={busy}>
              {busy ? <span className="spinner" /> : mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </button>
          </form>

          <p className={styles.switchText}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button className={styles.switchBtn} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
