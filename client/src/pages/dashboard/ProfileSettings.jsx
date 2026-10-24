import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import { FiSave, FiPlus, FiTrash2, FiLock, FiUser, FiLink, FiCheck, FiMail } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ImageUploader } from '../../components/common';
import { OtpInput } from '../../components/auth/AuthParts';
import { COUNTRIES, EXPERIENCE_LEVELS, SOCIAL_PLATFORMS } from '../../lib/constants';
import { passwordStrength } from '../../lib/utils';

export default function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState({
    name: user.name,
    headline: user.headline || '',
    bio: user.bio || '',
    website: user.website || '',
    avatar: user.avatar || '',
    coverImage: user.coverImage || '',
    country: user.location?.country || '',
    city: user.location?.city || '',
    dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
    gender: user.gender || '',
    experienceLevel: user.experienceLevel || '',
    skills: user.skills || [],
    socials: user.socials?.length ? user.socials : [{ platform: 'LinkedIn', url: '' }],
  });
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [email, setEmail] = useState({ value: user.email || '', sent: false, code: '' });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const cities = COUNTRIES[f.country] || [];

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.put('/users/me', {
        name: f.name,
        headline: f.headline,
        bio: f.bio,
        website: f.website,
        avatar: f.avatar,
        coverImage: f.coverImage,
        location: { country: f.country, city: f.city },
        dateOfBirth: f.dateOfBirth,
        gender: f.gender,
        experienceLevel: f.experienceLevel,
        skills: f.skills,
        socials: f.socials.filter((s) => s.url.trim()),
      });
      setUser(data.user);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const addSkill = () => {
    const s = skill.trim();
    if (s && !f.skills.includes(s)) set('skills', [...f.skills, s]);
    setSkill('');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/me/password', pw);
      toast.success('Password updated');
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const sendEmail = async () => {
    try {
      const { data } = await api.post('/auth/email/send-otp', { email: email.value, purpose: 'update' });
      setEmail((s) => ({ ...s, sent: true }));
      if (data.devCode) toast.info(`Demo code: ${data.devCode}`, { duration: 12000 });
      else toast.success(data.message);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const verifyEmail = async (code) => {
    try {
      await api.post('/auth/email/verify-otp', { email: email.value, code, purpose: 'update' });
      setUser({ ...user, email: email.value.toLowerCase(), emailVerified: true });
      setEmail((s) => ({ ...s, sent: false, code: '' }));
      toast.success('Email verified and updated');
    } catch (err) {
      toast.error(errMsg(err));
      setEmail((s) => ({ ...s, code: '' }));
    }
  };

  return (
    <div className="container settings">
      <header className="page-head" style={{ paddingBottom: 24 }}>
        <span className="eyebrow">Account</span>
        <h1 className="display">
          Profile <em>settings</em>
        </h1>
      </header>

      <form className="settings__grid" onSubmit={save}>
        <div className="stack">
          <section className="panel">
            <div className="panel__head">
              <h3>
                <FiUser /> Public profile
              </h3>
            </div>
            <div className="panel__body stack">
              <div className="settings__images">
                <ImageUploader value={f.avatar} onChange={(u) => set('avatar', u)} round label="Avatar" />
                <div style={{ flex: 1 }}>
                  <ImageUploader value={f.coverImage} onChange={(u) => set('coverImage', u)} aspect="4/1" label="Cover image" />
                </div>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Full name</label>
                  <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} required />
                </div>
                <div className="field">
                  <label>Headline</label>
                  <input className="input" value={f.headline} onChange={(e) => set('headline', e.target.value)} placeholder="Senior Backend Engineer" />
                </div>
                <div className="field span-2">
                  <label>Bio</label>
                  <textarea className="textarea" rows={4} maxLength={600} value={f.bio} onChange={(e) => set('bio', e.target.value)} />
                  <span className="field__hint">{f.bio.length}/600</span>
                </div>
                <div className="field">
                  <label>Country</label>
                  <select
                    className="select"
                    value={f.country}
                    onChange={(e) => {
                      set('country', e.target.value);
                      set('city', '');
                    }}
                  >
                    <option value="">Select country</option>
                    {Object.keys(COUNTRIES).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>City</label>
                  <select className="select" value={f.city} onChange={(e) => set('city', e.target.value)} disabled={!cities.length}>
                    <option value="">{cities.length ? 'Select city' : 'Choose a country first'}</option>
                    {cities.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Date of birth</label>
                  <DatePicker selected={f.dateOfBirth} onChange={(d) => set('dateOfBirth', d)} maxDate={new Date()} showYearDropdown showMonthDropdown dropdownMode="select" dateFormat="d MMM yyyy" placeholderText="Select date" isClearable />
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select className="select" value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Experience level</label>
                  <select className="select" value={f.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
                    <option value="">Select…</option>
                    {EXPERIENCE_LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Website</label>
                  <input className="input" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="yoursite.dev" />
                </div>
                <div className="field span-2">
                  <label>Skills</label>
                  <div className="tag-input">
                    {f.skills.map((s) => (
                      <span key={s} className="tag-input__tag">
                        {s}
                        <button type="button" onClick={() => set('skills', f.skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      value={skill}
                      onChange={(e) => setSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      onBlur={addSkill}
                      placeholder="Type a skill, press Enter"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h3>
                <FiLink /> Social links
              </h3>
              <button type="button" className="btn btn--soft btn--sm" onClick={() => set('socials', [...f.socials, { platform: 'GitHub', url: '' }])} disabled={f.socials.length >= 10}>
                <FiPlus /> Add link
              </button>
            </div>
            <div className="panel__body stack" style={{ '--gap': '10px' }}>
              {f.socials.map((s, i) => (
                <div key={i} className="social-row">
                  <select className="select" value={s.platform} onChange={(e) => set('socials', f.socials.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}>
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                  <input className="input" value={s.url} placeholder="https://" onChange={(e) => set('socials', f.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => set('socials', f.socials.filter((_, j) => j !== i))} aria-label="Remove link">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </section>
          <button className="btn btn--brand btn--lg" disabled={busy} style={{ alignSelf: 'flex-start' }}>
            {busy ? <span className="spinner" /> : <FiSave />} Save profile
          </button>
        </div>

        <aside className="stack">
          <section className="panel">
            <div className="panel__head">
              <h3>
                <FiMail /> Email
              </h3>
              {user.emailVerified && (
                <span className="badge badge--mint">
                  <FiCheck /> Verified
                </span>
              )}
            </div>
            <div className="panel__body stack" style={{ '--gap': '12px' }}>
              <input className="input" type="email" value={email.value} onChange={(e) => setEmail({ value: e.target.value, sent: false, code: '' })} />
              {email.sent ? (
                <OtpInput
                  value={email.code}
                  autoFocus
                  onChange={(code) => {
                    setEmail((s) => ({ ...s, code }));
                    if (code.length === 6) verifyEmail(code);
                  }}
                />
              ) : (
                <button type="button" className="btn btn--soft btn--sm" onClick={sendEmail} disabled={email.value === user.email && user.emailVerified}>
                  {user.email && email.value !== user.email ? 'Verify new email' : 'Send verification code'}
                </button>
              )}
              {user.phone && <small className="muted">Phone: {user.phone} {user.phoneVerified && '· verified'}</small>}
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h3>
                <FiLock /> Password
              </h3>
            </div>
            <div className="panel__body">
              <div className="stack" style={{ '--gap': '12px' }}>
                {user.providers?.local && <input className="input" type="password" placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />}
                <input className="input" type="password" placeholder={user.providers?.local ? 'New password' : 'Set a password'} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
                {pw.newPassword && (
                  <div className="strength" data-score={passwordStrength(pw.newPassword).score}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <i key={n} className={n <= passwordStrength(pw.newPassword).score ? 'on' : ''} />
                    ))}
                    <small>{passwordStrength(pw.newPassword).label}</small>
                  </div>
                )}
                <button type="button" className="btn btn--ghost btn--sm" onClick={changePassword} disabled={!pw.newPassword}>
                  Update password
                </button>
              </div>
            </div>
          </section>
        </aside>
      </form>
    </div>
  );
}
