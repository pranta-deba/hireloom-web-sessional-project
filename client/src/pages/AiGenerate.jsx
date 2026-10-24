import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FiZap, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useReveal } from '../hooks/useReveal';
import { cn } from '../lib/utils';
import { EXPERIENCE_LEVELS } from '../lib/constants';

const STEPS = ['Role', 'Experience', 'Skills', 'Education', 'Review'];
const LOADING_LINES = ['Reading your brief…', 'Structuring sections…', 'Writing quantified bullets…', 'Polishing the summary…', 'Applying your template…'];

export default function AiGenerate() {
  const { user, requireAuth } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const scope = useReveal();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [f, setF] = useState({ kind: 'resume', fullName: user?.name || '', email: user?.email || '', phone: user?.phone || '', location: '', targetRole: '', years: '3', level: EXPERIENCE_LEVELS[2], lastCompany: '', skills: '', school: '', degree: '', field: '', notes: '', templateSlug: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => {
    api.get('/templates', { params: { limit: 60 } }).then(({ data }) => setTemplates(data.items));
  }, []);
  useEffect(() => {
    if (!busy) return undefined;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, [busy]);

  const canNext = [f.targetRole.trim(), f.years, f.skills.trim(), true, true][step];

  const generate = requireAuth(async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/resumes/generate', f);
      toast.success('Your draft is ready', { description: 'Review and personalise every line.' });
      navigate(`/builder/${data.resume._id}`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }, 'Sign in to generate your résumé');

  return (
    <div ref={scope}>
      <section className="page-head container">
        <span className="eyebrow">AI résumé generator</span>
        <h1 className="display">
          Five answers. <em>One complete draft.</em>
        </h1>
        <p>Tell us the essentials — the AI writes structured, quantified content into a real template you can edit.{!config.ai.ready && ' (Running in offline demo mode until an AI provider is connected.)'}</p>
      </section>

      <section className="container" style={{ paddingBottom: 60 }}>
        <div className="wizard" data-reveal>
          <ol className="wizard__steps">
            {STEPS.map((s, i) => (
              <li key={s} className={cn(i === step && 'is-active', i < step && 'is-done')}>
                <span>{i < step ? <FiCheck /> : i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          {busy ? (
            <div className="wizard__busy">
              <div className="ai-orb" />
              <h3 className="display">{LOADING_LINES[line]}</h3>
              <p className="muted">This usually takes 5–20 seconds.</p>
            </div>
          ) : (
            <div className="wizard__body">
              {step === 0 && (
                <div className="form-grid">
                  <div className="field span-2">
                    <label>Document type</label>
                    <div className="tabs">
                      {[
                        ['resume', 'Résumé (1–2 pages)'],
                        ['cv', 'Academic / detailed CV'],
                      ].map(([k, l]) => (
                        <button key={k} type="button" className={f.kind === k ? 'is-active' : ''} onClick={() => setF((x) => ({ ...x, kind: k }))}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Target role *</label>
                    <input className="input" value={f.targetRole} onChange={set('targetRole')} placeholder="e.g. Backend Engineer" autoFocus />
                  </div>
                  <div className="field">
                    <label>Full name</label>
                    <input className="input" value={f.fullName} onChange={set('fullName')} />
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input className="input" value={f.email} onChange={set('email')} />
                  </div>
                  <div className="field">
                    <label>Location</label>
                    <input className="input" value={f.location} onChange={set('location')} placeholder="Dhaka, Bangladesh" />
                  </div>
                </div>
              )}
              {step === 1 && (
                <div className="form-grid">
                  <div className="field">
                    <label>Years of experience *</label>
                    <select className="select" value={f.years} onChange={set('years')}>
                      {Array.from({ length: 21 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? 'Fresh graduate' : `${i} year${i > 1 ? 's' : ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Seniority</label>
                    <select className="select" value={f.level} onChange={set('level')}>
                      {EXPERIENCE_LEVELS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field span-2">
                    <label>Most recent company</label>
                    <input className="input" value={f.lastCompany} onChange={set('lastCompany')} placeholder="Optional" />
                  </div>
                  <div className="field span-2">
                    <label>Achievements you’re proud of</label>
                    <textarea className="textarea" value={f.notes} onChange={set('notes')} placeholder="e.g. Led migration to microservices, cut costs 20%…" />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="field">
                  <label>Key skills * (comma separated)</label>
                  <textarea className="textarea" value={f.skills} onChange={set('skills')} placeholder="Node.js, MongoDB, Docker, AWS, System design" />
                  <div className="row" style={{ '--gap': '6px', marginTop: 8 }}>
                    {['React', 'Node.js', 'Python', 'SQL', 'AWS', 'Leadership', 'Figma', 'NFPA', 'AutoCAD'].map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => setF((x) => ({ ...x, skills: x.skills ? `${x.skills.replace(/,\s*$/, '')}, ${s}` : s }))}>
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="form-grid">
                  <div className="field span-2">
                    <label>University / school</label>
                    <input className="input" value={f.school} onChange={set('school')} />
                  </div>
                  <div className="field">
                    <label>Degree</label>
                    <input className="input" value={f.degree} onChange={set('degree')} placeholder="B.Sc." />
                  </div>
                  <div className="field">
                    <label>Field</label>
                    <input className="input" value={f.field} onChange={set('field')} placeholder="Computer Science" />
                  </div>
                </div>
              )}
              {step === 4 && (
                <div className="stack">
                  <div className="field">
                    <label>Template</label>
                    <select className="select" value={f.templateSlug} onChange={set('templateSlug')}>
                      <option value="">Best match automatically</option>
                      {templates
                        .filter((t) => t.category === (f.kind === 'cv' ? 'cv' : 'resume'))
                        .map((t) => (
                          <option key={t._id} value={t.slug}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <dl className="review-list">
                    <div>
                      <dt>Role</dt>
                      <dd>{f.targetRole}</dd>
                    </div>
                    <div>
                      <dt>Experience</dt>
                      <dd>
                        {f.years} yrs · {f.level}
                      </dd>
                    </div>
                    <div>
                      <dt>Skills</dt>
                      <dd>{f.skills}</dd>
                    </div>
                    <div>
                      <dt>Education</dt>
                      <dd>{[f.degree, f.field, f.school].filter(Boolean).join(', ') || '—'}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="wizard__foot">
                <button className="btn btn--ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                  <FiArrowLeft /> Back
                </button>
                {step < STEPS.length - 1 ? (
                  <button className="btn btn--brand" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                    Continue <FiArrowRight />
                  </button>
                ) : (
                  <button className="btn btn--accent btn--lg" onClick={generate}>
                    <FiZap /> Generate my {f.kind === 'cv' ? 'CV' : 'résumé'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
