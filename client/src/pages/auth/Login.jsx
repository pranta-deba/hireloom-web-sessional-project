import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiSmartphone } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { errMsg } from '../../lib/api';
import { startPhoneSignIn, confirmPhoneCode, firebaseError } from '../../lib/firebase';
import { AuthShell, SocialButtons, OtpInput } from '../../components/auth/AuthParts';

export default function Login() {
  const { login, loginWithFirebaseToken } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const [mode, setMode] = useState('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('+880');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const err = params.get('error');
    if (err) toast.error(err);
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(identifier, password);
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendSms = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await startPhoneSignIn(config.firebase, phone.replace(/\s/g, ''), 'recaptcha-login');
      setConfirmation(c);
      toast.success(`SMS code sent to ${phone}`);
    } catch (err) {
      toast.error(firebaseError(err));
    } finally {
      setBusy(false);
    }
  };

  const verifySms = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const token = await confirmPhoneCode(confirmation, code);
      await loginWithFirebaseToken(token);
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err?.code ? firebaseError(err) : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in with your username, email or phone.">
      <SocialButtons next={next} onPhone={config.auth?.phone ? () => setMode(mode === 'phone' ? 'password' : 'phone') : undefined} />
      <div className="divider">or continue with</div>

      {mode === 'password' ? (
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="identifier">Username, email or phone</label>
            <div className="input-group">
              <span className="input-group__icon">
                <FiUser />
              </span>
              <input id="identifier" className="input" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="input-group">
              <span className="input-group__icon">
                <FiLock />
              </span>
              <input id="password" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <span className="input-group__suffix">
                <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <FiEyeOff /> : <FiEye />}
                </button>
              </span>
            </div>
          </div>
          <button className="btn btn--brand btn--lg btn--block" disabled={busy}>
            {busy ? <span className="spinner" /> : null} Sign in <FiArrowRight />
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={confirmation ? verifySms : sendSms}>
          {!confirmation ? (
            <div className="field">
              <label>Mobile number</label>
              <div className="input-group">
                <span className="input-group__icon">
                  <FiSmartphone />
                </span>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+8801XXXXXXXXX" autoFocus />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>Enter the 6-digit code sent to {phone}</label>
              <OtpInput value={code} onChange={setCode} autoFocus />
            </div>
          )}
          <button className="btn btn--brand btn--lg btn--block" disabled={busy || (confirmation && code.length < 6)}>
            {busy && <span className="spinner" />} {confirmation ? 'Verify & sign in' : 'Send code'}
          </button>
          <button type="button" className="link" onClick={() => setMode('password')}>
            Use password instead
          </button>
        </form>
      )}
      <div id="recaptcha-login" />

      <p className="auth__alt">
        New here?{' '}
        <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          Create an account
        </Link>
      </p>
      {import.meta.env.DEV && (
      <p className="auth__demo">
        Demo admin: <span className="kbd">admin</span> / <span className="kbd">Admin@12345</span> · demo user: <span className="kbd">nadia.rahman</span> / <span className="kbd">Demo@12345</span>
      </p>
      )}
    </AuthShell>
  );
}
