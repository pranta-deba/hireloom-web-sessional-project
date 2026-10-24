import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FiArrowLeft, FiDownload, FiCheck, FiCloud, FiTarget, FiUser, FiBriefcase, FiBook, FiStar, FiGlobe, FiFolder, FiAward, FiZap, FiLock, FiCopy, FiZoomIn, FiZoomOut, FiLayout } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAIStream } from '../hooks';
import { ResumeRenderer, ResumeScaler } from '../components/resume/ResumeRenderer';
import { ListEditor } from '../components/resume/Editors';
import { SAMPLE_DATA, EMPTY_DATA } from '../components/resume/sampleData';
import { ImageUploader, PageLoader } from '../components/common';
import { SKILL_LEVELS, LANGUAGE_LEVELS } from '../lib/constants';
import { cn } from '../lib/utils';

const SECTIONS = [
  { key: 'personal', label: 'Personal', icon: <FiUser /> },
  { key: 'experience', label: 'Experience', icon: <FiBriefcase /> },
  { key: 'education', label: 'Education', icon: <FiBook /> },
  { key: 'skills', label: 'Skills', icon: <FiStar /> },
  { key: 'languages', label: 'Languages', icon: <FiGlobe /> },
  { key: 'projects', label: 'Projects', icon: <FiFolder /> },
  { key: 'certifications', label: 'Certificates', icon: <FiAward /> },
];

export default function ResumeBuilder() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, requireAuth, loading: authLoading } = useAuth();
  const [resume, setResume] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState('personal');
  const [status, setStatus] = useState('saved');
  const [zoom, setZoom] = useState(1);
  const [mobileView, setMobileView] = useState('edit');
  const dirty = useRef(false);
  const creating = useRef(false);
  const summaryAI = useAIStream();
  const demo = !user;

  /* ── load or create ── */
  useEffect(() => {
    api.get('/templates', { params: { limit: 60 } }).then(({ data }) => setTemplates(data.items));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (id === 'new') {
      if (!user) {
        // Guests can explore the editor with sample data (read-only)
        api.get('/templates', { params: { limit: 1 } }).then(({ data }) => setResume({ _id: 'demo', title: 'Example résumé', data: SAMPLE_DATA, template: data.items[0] }));
        return;
      }
      if (creating.current) return;
      creating.current = true;
      api
        .post('/resumes', { templateSlug: params.get('template') || undefined, fromSampleId: params.get('sample') || undefined, kind: params.get('kind') || undefined })
        .then(({ data }) => {
          toast.success('New résumé created', { description: 'Changes save automatically.' });
          navigate(`/builder/${data.resume._id}`, { replace: true });
        })
        .catch((e) => {
          toast.error(errMsg(e));
          navigate('/templates');
        });
      return;
    }
    api
      .get(`/resumes/${id}`)
      .then(({ data }) => {
        if (!data.isOwner) {
          navigate(`/resumes/${id}`, { replace: true });
          return;
        }
        setResume({ ...data.resume, data: { ...EMPTY_DATA, ...data.resume.data } });
      })
      .catch((e) => {
        toast.error(errMsg(e));
        navigate('/dashboard');
      });
  }, [id, user, authLoading, params, navigate]);

  /* ── autosave (debounced) ── */
  useEffect(() => {
    if (!resume || demo || !dirty.current) return undefined;
    setStatus('unsaved');
    const t = setTimeout(async () => {
      setStatus('saving');
      try {
        await api.put(`/resumes/${resume._id}`, { title: resume.title, data: resume.data, templateId: resume.template?._id, accentColor: resume.accentColor, isPublic: resume.isPublic });
        dirty.current = false;
        setStatus('saved');
      } catch (e) {
        setStatus('error');
        toast.error(errMsg(e, 'Autosave failed'));
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [resume, demo]);

  const guard = useCallback((fn) => requireAuth(fn, 'Sign in to edit and save résumés'), [requireAuth]);
  const patch = guard((fn) => {
    dirty.current = true;
    setResume((r) => fn(r));
  });
  const setData = (key, value) => patch((r) => ({ ...r, data: { ...r.data, [key]: value } }));
  const setPersonal = (key, value) => patch((r) => ({ ...r, data: { ...r.data, personal: { ...r.data.personal, [key]: value } } }));

  const improveSummary = guard(async () => {
    const d = resume.data;
    try {
      const text = await summaryAI.start('summary', { context: { headline: d.personal.headline, summary: d.personal.summary, skills: d.skills.map((s) => s.name), experience: d.experience } });
      if (text) setPersonal('summary', text.trim());
      summaryAI.reset();
      toast.success('Summary rewritten by AI');
    } catch {
      toast.error(summaryAI.error || 'AI request failed');
    }
  });

  const download = () => {
    document.title = `${resume.data.personal.fullName || 'Resume'} — ${resume.title}`;
    window.print();
  };

  const duplicate = guard(async () => {
    const { data } = await api.post(`/resumes/${resume._id}/duplicate`);
    toast.success('Duplicated');
    navigate(`/builder/${data.resume._id}`);
  });

  if (!resume) return <PageLoader label={id === 'new' ? 'Preparing your résumé' : 'Loading résumé'} />;
  const d = resume.data;
  const p = d.personal;

  return (
    <div className="builder">
      {/* print-only, unscaled copy for crisp PDF export */}
      <div className="print-area">
        <ResumeRenderer data={d} template={resume.template} accentColor={resume.accentColor} />
      </div>

      <div className="builder__top container">
        <Link to={user ? '/dashboard' : '/templates'} className="icon-btn" aria-label="Back">
          <FiArrowLeft />
        </Link>
        <input className="builder__title" value={resume.title} onChange={(e) => patch((r) => ({ ...r, title: e.target.value }))} aria-label="Résumé title" readOnly={demo} />
        <span className={cn('builder__status', `is-${status}`)}>
          {demo ? (
            <>
              <FiLock /> Preview mode
            </>
          ) : status === 'saving' ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : status === 'saved' ? (
            <>
              <FiCheck /> Saved
            </>
          ) : status === 'error' ? (
            'Not saved'
          ) : (
            <>
              <FiCloud /> Unsaved
            </>
          )}
        </span>
        <div className="spacer" />
        <div className="builder__actions">
          <label className="builder__tpl">
            <FiLayout />
            <select
              className="select"
              value={resume.template?._id || ''}
              onChange={(e) => {
                const t = templates.find((x) => x._id === e.target.value);
                patch((r) => ({ ...r, template: t, accentColor: '' }));
              }}
              aria-label="Template"
            >
              {templates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.category === 'cv' ? '(CV)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="builder__color" title="Accent colour">
            <input type="color" value={resume.accentColor || resume.template?.theme?.primary || '#2F4BFF'} onChange={(e) => patch((r) => ({ ...r, accentColor: e.target.value }))} />
          </label>
          {!demo && (
            <label className="switch" title="Anyone with the link can view">
              <input type="checkbox" checked={!!resume.isPublic} onChange={(e) => patch((r) => ({ ...r, isPublic: e.target.checked }))} />
              <span className="switch__track" /> Public
            </label>
          )}
          <button className="btn btn--ghost btn--sm" onClick={duplicate}>
            <FiCopy /> <span className="hide-sm">Duplicate</span>
          </button>
          <button className="btn btn--ghost btn--sm" onClick={guard(() => navigate(`/ats?resume=${resume._id}`))}>
            <FiTarget /> <span className="hide-sm">ATS check</span>
          </button>
          <button className="btn btn--brand btn--sm" onClick={download}>
            <FiDownload /> PDF
          </button>
        </div>
      </div>

      <div className="builder__switch container">
        <div className="tabs">
          <button className={mobileView === 'edit' ? 'is-active' : ''} onClick={() => setMobileView('edit')}>
            Edit
          </button>
          <button className={mobileView === 'preview' ? 'is-active' : ''} onClick={() => setMobileView('preview')}>
            Preview
          </button>
        </div>
      </div>

      <div className={cn('builder__grid container', `show-${mobileView}`)}>
        <div className="builder__editor">
          {demo && (
            <div className="builder__demo">
              <FiLock />
              <div>
                <strong>You’re viewing the editor in preview mode.</strong>
                <p>Create a free account to edit, autosave and export your own résumé.</p>
              </div>
              <Link to="/register?next=/builder/new" className="btn btn--brand btn--sm">
                Start free
              </Link>
            </div>
          )}
          <nav className="builder__nav">
            {SECTIONS.map((s) => (
              <button key={s.key} className={tab === s.key ? 'is-active' : ''} onClick={() => setTab(s.key)}>
                {s.icon}
                <span>{s.label}</span>
                {Array.isArray(d[s.key]) && d[s.key].length > 0 && <small>{d[s.key].length}</small>}
              </button>
            ))}
          </nav>

          <fieldset className="builder__panel" disabled={demo} onClick={demo ? guard(() => {}) : undefined}>
            {tab === 'personal' && (
              <div className="stack">
                <div className="builder__photo">
                  <ImageUploader value={p.photo} onChange={(url) => setPersonal('photo', url)} round label="Photo" disabled={demo} onBlocked={guard(() => {})} />
                  <div className="stack" style={{ flex: 1, '--gap': '12px' }}>
                    <div className="field">
                      <label>Full name</label>
                      <input className="input" value={p.fullName} onChange={(e) => setPersonal('fullName', e.target.value)} placeholder="Alex Morgan" />
                    </div>
                    <div className="field">
                      <label>Headline</label>
                      <input className="input" value={p.headline} onChange={(e) => setPersonal('headline', e.target.value)} placeholder="Senior Software Engineer" />
                    </div>
                  </div>
                </div>
                <div className="form-grid">
                  {[
                    ['email', 'Email', 'you@mail.com'],
                    ['phone', 'Phone', '+880 1…'],
                    ['location', 'Location', 'Dhaka, Bangladesh'],
                    ['website', 'Website', 'yoursite.dev'],
                    ['linkedin', 'LinkedIn', 'linkedin.com/in/you'],
                    ['github', 'GitHub', 'github.com/you'],
                  ].map(([k, l, ph]) => (
                    <div className="field" key={k}>
                      <label>{l}</label>
                      <input className="input" value={p[k] || ''} placeholder={ph} onChange={(e) => setPersonal(k, e.target.value)} />
                    </div>
                  ))}
                  <div className="field span-2">
                    <label>
                      Professional summary
                      <button type="button" className="link" onClick={improveSummary} disabled={summaryAI.busy} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        {summaryAI.busy ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <FiZap />} {summaryAI.busy ? 'Writing…' : 'Improve with AI'}
                      </button>
                    </label>
                    <textarea className={cn('textarea', summaryAI.status === 'streaming' && 'is-streaming')} rows={5} value={summaryAI.status === 'streaming' ? summaryAI.text : p.summary} onChange={(e) => setPersonal('summary', e.target.value)} placeholder="3 lines: who you are, your proof, where you’re headed." />
                    <span className="field__hint">{(p.summary || '').split(/\s+/).filter(Boolean).length} words · aim for 40–70</span>
                  </div>
                </div>
              </div>
            )}

            {tab === 'experience' && (
              <ListEditor
                items={d.experience}
                onChange={(v) => setData('experience', v)}
                addLabel="Add experience"
                titleOf={(e) => [e.role, e.company].filter(Boolean).join(' · ')}
                blank={{ company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' }}
                fields={[
                  { key: 'role', label: 'Job title', placeholder: 'Software Engineer' },
                  { key: 'company', label: 'Company', placeholder: 'Acme Ltd.' },
                  { key: 'startDate', label: 'Start', type: 'month' },
                  { key: 'endDate', label: 'End', type: 'month', disabledWhen: (it) => it.current },
                  { key: 'location', label: 'Location', placeholder: 'Remote' },
                  { key: 'current', label: 'I currently work here', type: 'checkbox' },
                  { key: 'description', label: 'Achievements (one per line)', type: 'textarea', span: true, placeholder: '• Reduced load time by 40% by…' },
                ]}
              />
            )}

            {tab === 'education' && (
              <ListEditor
                items={d.education}
                onChange={(v) => setData('education', v)}
                addLabel="Add education"
                titleOf={(e) => e.school}
                blank={{ school: '', degree: '', field: '', startDate: '', endDate: '', grade: '' }}
                fields={[
                  { key: 'school', label: 'School / University', span: true },
                  { key: 'degree', label: 'Degree', placeholder: 'B.Sc.' },
                  { key: 'field', label: 'Field of study', placeholder: 'Computer Science' },
                  { key: 'startDate', label: 'Start', type: 'month' },
                  { key: 'endDate', label: 'End', type: 'month' },
                  { key: 'grade', label: 'Grade / CGPA', span: true },
                ]}
              />
            )}

            {tab === 'skills' && (
              <ListEditor
                items={d.skills}
                onChange={(v) => setData('skills', v)}
                addLabel="Add skill"
                titleOf={(s) => s.name}
                blank={{ name: '', level: 'Intermediate' }}
                fields={[
                  { key: 'name', label: 'Skill', placeholder: 'React' },
                  { key: 'level', label: 'Level', type: 'select', options: SKILL_LEVELS },
                ]}
              />
            )}

            {tab === 'languages' && (
              <>
                <ListEditor
                  items={d.languages}
                  onChange={(v) => setData('languages', v)}
                  addLabel="Add language"
                  titleOf={(s) => s.name}
                  blank={{ name: '', proficiency: 'Professional' }}
                  fields={[
                    { key: 'name', label: 'Language', placeholder: 'English' },
                    { key: 'proficiency', label: 'Proficiency', type: 'select', options: LANGUAGE_LEVELS },
                  ]}
                />
                <div className="field" style={{ marginTop: 20 }}>
                  <label>Interests (comma separated)</label>
                  <input className="input" value={(d.interests || []).join(', ')} onChange={(e) => setData('interests', e.target.value.split(',').map((x) => x.trimStart()).filter((x, i, a) => x || i === a.length - 1))} placeholder="Open source, Chess" />
                </div>
              </>
            )}

            {tab === 'projects' && (
              <>
                <ListEditor
                  items={d.projects}
                  onChange={(v) => setData('projects', v)}
                  addLabel="Add project"
                  titleOf={(s) => s.name}
                  blank={{ name: '', link: '', description: '' }}
                  fields={[
                    { key: 'name', label: 'Project name' },
                    { key: 'link', label: 'Link', placeholder: 'github.com/…' },
                    { key: 'description', label: 'Description', type: 'textarea', span: true },
                  ]}
                />
                {resume.kind === 'cv' && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ marginBottom: 12 }}>Publications</h4>
                    <ListEditor
                      items={d.publications}
                      onChange={(v) => setData('publications', v)}
                      addLabel="Add publication"
                      titleOf={(s) => s.title}
                      blank={{ title: '', venue: '', year: '' }}
                      fields={[
                        { key: 'title', label: 'Title', span: true },
                        { key: 'venue', label: 'Journal / conference' },
                        { key: 'year', label: 'Year' },
                      ]}
                    />
                  </div>
                )}
              </>
            )}

            {tab === 'certifications' && (
              <ListEditor
                items={d.certifications}
                onChange={(v) => setData('certifications', v)}
                addLabel="Add certificate"
                titleOf={(s) => s.name}
                blank={{ name: '', issuer: '', date: '' }}
                fields={[
                  { key: 'name', label: 'Certificate', span: true },
                  { key: 'issuer', label: 'Issuer' },
                  { key: 'date', label: 'Date', type: 'month' },
                ]}
              />
            )}
          </fieldset>
        </div>

        <div className="builder__preview">
          <div className="builder__zoom">
            <button className="icon-btn" onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} aria-label="Zoom out">
              <FiZoomOut />
            </button>
            <span className="mono">{Math.round(zoom * 100)}%</span>
            <button className="icon-btn" onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))} aria-label="Zoom in">
              <FiZoomIn />
            </button>
          </div>
          <div className="builder__paper" style={{ width: `${zoom * 100}%` }}>
            <ResumeScaler maxScale={1.4}>
              <ResumeRenderer data={d} template={resume.template} accentColor={resume.accentColor} />
            </ResumeScaler>
          </div>
        </div>
      </div>
    </div>
  );
}
