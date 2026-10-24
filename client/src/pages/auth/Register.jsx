import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import { FiCheck, FiX, FiArrowRight, FiArrowLeft, FiMail, FiSmartphone, FiEye, FiEyeOff, FiAtSign, FiShield } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useDebounce } from '../../hooks';
import { startPhoneSignIn, confirmPhoneCode, firebaseError } from '../../lib/firebase';
import { AuthShell, SocialButtons, OtpInput } from '../../components/auth/AuthParts';
import { cn, passwordStrength } from '../../lib/utils';

const STEPS = ['Name', 'Basics', 'Username', 'Email', 'Phone', 'Password'];

function UsernameStep({ value, onChange, onValid }) {
  const q = useDebounce(value.trim().toLowerCase(), 400);
  const [st, setSt] = useState({ state: 'idle' });

  useEffect(() => {
    if (!q) {
      setSt({ state: 'idle' });
      onValid(false);
      return undefined;
    }
    let live = true;
    setSt({ state: 'checking' });
    api
      .get('/auth/check-username', { params: { username: q } })
      .then(({ data }) => {
        if (!live) return;
        setSt(data.available ? { state: 'ok' } : { state: 'err', reason: data.reason, suggestions: data.suggestions });
        onValid(data.available);
      })
      .catch(() => live && setSt({ state: 'err', reason: 'Could not check right now.' }));
    return () => {
      live = false;
    };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const typing = value.trim().toLowerCase() !== q;

  return (
    <div className="field">
      <label htmlFor="username">Choose your username</label>
      <div className="input-group">
        <span className="input-group__icon">
          <FiAtSign />
        </span>
        <input
          id="username"
          className={cn('input', st.state === 'ok' && !typing && 'is-ok', st.state === 'err' && !typing && 'is-err')}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
          autoFocus
          autoComplete="off"
          maxLength={30}
        />
        <span className="input-group__suffix">{(st.state === 'checking' || typing) && value ? <span className="spinner" style={{ width: 14, height: 14 }} /> : st.state === 'ok' ? <FiCheck style={{ color: 'var(--mint)' }} /> : st.state === 'err' ? <FiX style={{ color: 'var(--danger)' }} /> : null}</span>
      </div>
      <div className={cn('field__msg', st.state === 'ok' && 'is-ok', st.state === 'err' && 'is-err', (st.state === 'idle' || st.state === 'checking') && 'is-info')}>
        {typing || st.state === 'checking' ? (value ? 'Checking availability…' : 'Letters, numbers, periods and underscores.') : st.state === 'ok' ? `@${q} is available` : st.state === 'err' ? st.reason : 'Letters, numbers, periods and underscores.'}
      </div>
      {st.suggestions?.length > 0 && !typing && (
        <div className="row" style={{ '--gap': '6px' }}>
          <small className="muted">Available:</small>
          {st.suggestions.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => onChange(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/dashboard';
  const phoneRequired = !!config.features?.requirePhoneVerification;
  const emailRequired = config.features?.requireEmailVerification !== false;
  const firebasePhone = !!config.auth?.phone;

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ first: '', last: '', dob: null, gender: '', username: '', email: '', phone: '+880', password: '', confirm: '', agree: false });
  const [usernameOk, setUsernameOk] = useState(false);
  const [emailState, setEmailState] = useState({ sent: false, verified: false, code: '', checking: false, error: '' });
  const [phoneState, setPhoneState] = useState({ sent: false, verified: false, code: '', confirmation: null, skipped: false });
  const [show, setShow] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const emailQ = useDebounce(f.email.trim().toLowerCase(), 450);
  const strength = passwordStrength(f.password);

  // real-time email availability
  useEffect(() => {
    if (!emailQ || emailState.verified) return;
    setEmailState((s) => ({ ...s, checking: true }));
    api.get('/auth/check-email', { params: { email: emailQ } }).then(({ data }) => setEmailState((s) => ({ ...s, checking: false, error: data.available ? '' : data.reason })));
  }, [emailQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const age = f.dob ? Math.floor((Date.now() - f.dob.getTime()) / 31557600000) : null;
  const canNext = [
    f.first.trim().length > 0,
    !!f.dob && age >= 13 && !!f.gender,
    usernameOk,
    !emailRequired || emailState.verified,
    !phoneRequired || phoneState.verified,
    strength.score >= 3 && /[A-Z]/.test(f.password) && /\d/.test(f.password) && f.password === f.confirm && f.agree,
  ][step];

  const sendEmailCode = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/email/send-otp', { email: f.email });
      setEmailState((s) => ({ ...s, sent: true, code: '' }));
      if (data.devCode) toast.info(`Demo mode — your code is ${data.devCode}`, { description: data.message, duration: 15000 });
      else toast.success(data.message);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyEmailCode = async (code) => {
    setBusy(true);
    try {
      await api.post('/auth/email/verify-otp', { email: f.email, code });
      setEmailState((s) => ({ ...s, verified: true }));
      toast.success('Email verified');
    } catch (e) {
      toast.error(errMsg(e));
      setEmailState((s) => ({ ...s, code: '' }));
    } finally {
      setBusy(false);
    }
  };

  const sendPhoneCode = async () => {
    setBusy(true);
    const phone = f.phone.replace(/[\s-]/g, '');
    try {
      if (firebasePhone) {
        const confirmation = await startPhoneSignIn(config.firebase, phone, 'recaptcha-register');
        setPhoneState((s) => ({ ...s, sent: true, confirmation, code: '' }));
        toast.success(`SMS sent to ${phone}`);
      } else {
        const { data } = await api.post('/auth/phone/send-otp', { phone });
        setPhoneState((s) => ({ ...s, sent: true, code: '' }));
        if (data.devCode) toast.info(`Demo SMS — your code is ${data.devCode}`, { description: data.message, duration: 15000 });
      }
    } catch (e) {
      toast.error(e?.code ? firebaseError(e) : errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyPhoneCode = async (code) => {
    setBusy(true);
    const phone = f.phone.replace(/[\s-]/g, '');
    try {
      if (firebasePhone) {
        const idToken = await confirmPhoneCode(phoneState.confirmation, code);
        await api.post('/auth/phone/verify-firebase', { idToken });
      } else await api.post('/auth/phone/verify-otp', { phone, code });
      setPhoneState((s) => ({ ...s, verified: true }));
      toast.success('Phone verified');
    } catch (e) {
      toast.error(e?.code ? firebaseError(e) : errMsg(e));
      setPhoneState((s) => ({ ...s, code: '' }));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await register({
        name: `${f.first.trim()} ${f.last.trim()}`.trim(),
        username: f.username,
        email: f.email,
        phone: phoneState.verified ? f.phone.replace(/[\s-]/g, '') : undefined,
        password: f.password,
        dateOfBirth: f.dob,
        gender: f.gender,
      });
      navigate(next, { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const go = (e) => {
    e?.preventDefault();
    if (!canNext) return;
    if (step === STEPS.length - 1) submit();
    else setStep((s) => s + 1);
  };

  return (
    <AuthShell title="Create your account" subtitle={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}>
      {step === 0 && (
        <>
          <SocialButtons next={next} />
          <div className="divider">or sign up with email</div>
        </>
      )}
      <div className="stepper" aria-hidden>
        {STEPS.map((s, i) => (
          <i key={s} className={cn(i < step && 'is-done', i === step && 'is-active')} />
        ))}
      </div>

      <form className="stack" onSubmit={go}>
        {step === 0 && (
          <div className="form-grid">
            <div className="field">
              <label>First name</label>
              <input className="input" value={f.first} onChange={(e) => set('first', e.target.value)} autoFocus autoComplete="given-name" />
            </div>
            <div className="field">
              <label>
                Last name <span className="muted">optional</span>
              </label>
              <input className="input" value={f.last} onChange={(e) => set('last', e.target.value)} autoComplete="family-name" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="form-grid">
            <div className="field span-2">
              <label>Date of birth</label>
              <DatePicker selected={f.dob} onChange={(d) => set('dob', d)} maxDate={new Date()} showYearDropdown showMonthDropdown dropdownMode="select" dateFormat="d MMMM yyyy" placeholderText="Select your birthday" />
              {f.dob && age < 13 && <div className="field__msg is-err">You must be at least 13 years old.</div>}
            </div>
            <div className="field span-2">
              <label>Gender</label>
              <select className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Rather not say / other</option>
              </select>
            </div>
          </div>
        )}

        {step === 2 && <UsernameStep value={f.username} onChange={(v) => set('username', v)} onValid={setUsernameOk} />}

        {step === 3 && (
          <div className="stack">
            <div className="field">
              <label>Email address</label>
              <div className="input-group">
                <span className="input-group__icon">
                  <FiMail />
                </span>
                <input
                  className={cn('input', emailState.verified && 'is-ok', emailState.error && 'is-err')}
                  type="email"
                  value={f.email}
                  disabled={emailState.verified}
                  onChange={(e) => {
                    set('email', e.target.value);
                    setEmailState({ sent: false, verified: false, code: '', checking: false, error: '' });
                  }}
                  autoFocus
                  autoComplete="email"
                />
                <span className="input-group__suffix">{emailState.verified ? <span className="badge badge--mint"><FiCheck /> Verified</span> : emailState.checking ? <span className="spinner" style={{ width: 14, height: 14 }} /> : null}</span>
              </div>
              {emailState.error && <div className="field__msg is-err">{emailState.error}</div>}
            </div>
            {!emailState.verified &&
              (emailState.sent ? (
                <div className="field">
                  <label>Enter the 6-digit code we emailed you</label>
                  <OtpInput
                    value={emailState.code}
                    autoFocus
                    onChange={(code) => {
                      setEmailState((s) => ({ ...s, code }));
                      if (code.length === 6) verifyEmailCode(code);
                    }}
                  />
                  <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={sendEmailCode} disabled={busy}>
                    Resend code
                  </button>
                </div>
              ) : (
                <button type="button" className="btn btn--soft" onClick={sendEmailCode} disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || !!emailState.error}>
                  {busy ? <span className="spinner" /> : <FiShield />} Send verification code
                </button>
              ))}
          </div>
        )}

        {step === 4 && (
          <div className="stack">
            <div className="field">
              <label>
                Mobile number {!phoneRequired && <span className="muted">optional</span>}
              </label>
              <div className="input-group">
                <span className="input-group__icon">
                  <FiSmartphone />
                </span>
                <input className={cn('input', phoneState.verified && 'is-ok')} value={f.phone} disabled={phoneState.verified} onChange={(e) => { set('phone', e.target.value); setPhoneState((s) => ({ ...s, sent: false })); }} placeholder="+8801XXXXXXXXX" autoFocus inputMode="tel" />
                <span className="input-group__suffix">{phoneState.verified && <span className="badge badge--mint"><FiCheck /> Verified</span>}</span>
              </div>
              <span className="field__hint">International format with country code. {firebasePhone ? 'We’ll text you a code via Firebase.' : 'Demo SMS mode — the code is shown on screen.'}</span>
            </div>
            {!phoneState.verified &&
              (phoneState.sent ? (
                <div className="field">
                  <label>Enter the 6-digit SMS code</label>
                  <OtpInput
                    value={phoneState.code}
                    autoFocus
                    onChange={(code) => {
                      setPhoneState((s) => ({ ...s, code }));
                      if (code.length === 6) verifyPhoneCode(code);
                    }}
                  />
                </div>
              ) : (
                <button type="button" className="btn btn--soft" onClick={sendPhoneCode} disabled={busy || !/^\+?[1-9]\d{7,14}$/.test(f.phone.replace(/[\s-]/g, ''))}>
                  {busy ? <span className="spinner" /> : <FiSmartphone />} Send SMS code
                </button>
              ))}
            <div id="recaptcha-register" />
          </div>
        )}

        {step === 5 && (
          <div className="stack">
            <div className="field">
              <label>Create password</label>
              <div className="input-group">
                <input className="input" style={{ paddingLeft: 16 }} type={show ? 'text' : 'password'} value={f.password} onChange={(e) => set('password', e.target.value)} autoFocus autoComplete="new-password" />
                <span className="input-group__suffix">
                  <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label="Toggle password visibility">
                    {show ? <FiEyeOff /> : <FiEye />}
                  </button>
                </span>
              </div>
              <div className="strength" data-score={strength.score}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <i key={n} className={n <= strength.score ? 'on' : ''} />
                ))}
                <small>{f.password && strength.label}</small>
              </div>
              <ul className="pw-rules">
                <li className={f.password.length >= 8 ? 'ok' : ''}>8+ characters</li>
                <li className={/[A-Z]/.test(f.password) ? 'ok' : ''}>Uppercase letter</li>
                <li className={/\d/.test(f.password) ? 'ok' : ''}>Number</li>
                <li className={/[^A-Za-z0-9]/.test(f.password) ? 'ok' : ''}>Symbol (bonus)</li>
              </ul>
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input className={cn('input', f.confirm && (f.confirm === f.password ? 'is-ok' : 'is-err'))} type={show ? 'text' : 'password'} value={f.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" />
            </div>
            <label className="switch">
              <input type="checkbox" checked={f.agree} onChange={(e) => set('agree', e.target.checked)} />
              <span className="switch__track" /> I agree to the terms & privacy policy
            </label>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
          {step > 0 ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep((s) => s - 1)}>
              <FiArrowLeft /> Back
            </button>
          ) : (
            <span />
          )}
          {step === 4 && !phoneRequired && !phoneState.verified ? (
            <button type="button" className="btn btn--ghost" onClick={() => setStep(5)}>
              Skip for now <FiArrowRight />
            </button>
          ) : (
            <button className="btn btn--brand" disabled={!canNext || busy}>
              {busy && step === 5 && <span className="spinner" />} {step === STEPS.length - 1 ? 'Create account' : 'Next'} <FiArrowRight />
            </button>
          )}
        </div>
      </form>

      <p className="auth__alt">
        Already have an account?{' '}
        <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
