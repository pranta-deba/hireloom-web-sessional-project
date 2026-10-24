import { useRef, useState } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa6';
import { FiSmartphone } from 'react-icons/fi';
import { toast } from 'sonner';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { signInWithProvider, firebaseError } from '../../lib/firebase';
import { errMsg } from '../../lib/api';
import { Wordmark } from '../layout/Navbar';
import { gsap, useGSAP } from '../../hooks/useReveal';

/** 6-box one-time-code input with auto-advance, backspace and paste support. */
export function OtpInput({ value, onChange, length = 6, autoFocus }) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };
  return (
    <div className="otp-input">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, v);
            if (v && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            const txt = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (txt) {
              e.preventDefault();
              onChange(txt);
              refs.current[Math.min(txt.length, length - 1)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}

/** Google / GitHub buttons — visibility driven by what the admin has configured. */
export function SocialButtons({ onPhone, next = '/dashboard' }) {
  const { config } = useConfig();
  const { loginWithFirebaseToken } = useAuth();
  const [busy, setBusy] = useState('');
  const a = config.auth || {};

  const firebaseLogin = async (provider) => {
    setBusy(provider);
    try {
      const token = await signInWithProvider(config.firebase, provider);
      await loginWithFirebaseToken(token);
    } catch (e) {
      toast.error(e?.code ? firebaseError(e) : errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const github = () => {
    if (a.githubMode === 'firebase') return firebaseLogin('github');
    window.location.href = `/api/auth/github?returnTo=${encodeURIComponent(next)}`;
  };

  const notReady = (name) => toast.info(`${name} sign-in isn’t configured yet`, { description: 'An admin can enable it in Dashboard → Settings.' });

  return (
    <div className="socials">
      <button type="button" className="social-btn" onClick={() => (a.google ? firebaseLogin('google') : notReady('Google'))} disabled={!!busy}>
        {busy === 'google' ? <span className="spinner" /> : <FaGoogle style={{ color: '#EA4335' }} />} Google
      </button>
      <button type="button" className="social-btn" onClick={() => (a.github ? github() : notReady('GitHub'))} disabled={!!busy}>
        {busy === 'github' ? <span className="spinner" /> : <FaGithub />} GitHub
      </button>
      {onPhone && (
        <button type="button" className="social-btn" onClick={onPhone}>
          <FiSmartphone /> Phone
        </button>
      )}
    </div>
  );
}

/** Split-screen shell with an animated editorial panel. */
export function AuthShell({ title, subtitle, children, aside }) {
  const { config } = useConfig();
  const ref = useRef(null);
  useGSAP(
    () => {
      gsap.from('.auth__panel > *', { y: 24, opacity: 0, stagger: 0.07, duration: 0.7, ease: 'power3.out' });
      gsap.from('.auth__card', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' });
      gsap.to('.auth__orb', { x: 'random(-40, 40)', y: 'random(-40, 40)', duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 1 });
    },
    { scope: ref }
  );
  return (
    <section className="auth" ref={ref}>
      <div className="auth__panel grain">
        <i className="auth__orb auth__orb--a" />
        <i className="auth__orb auth__orb--b" />
        <Wordmark name={config.site.name} />
        <h2 className="display">{aside?.title || <>Your career, <em>woven together.</em></>}</h2>
        <ul>
          {(aside?.points || ['Professional résumé & CV templates', 'Honest ATS scoring with AI coaching', 'Cover letters streamed in seconds', 'A community journal for builders']).map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <div className="auth__main">
        <div className="auth__card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
      </div>
    </section>
  );
}
