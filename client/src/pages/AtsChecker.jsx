import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiUploadCloud, FiFileText, FiClipboard, FiTarget, FiCheck, FiX, FiClock, FiTrash2 } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAIStream } from '../hooks';
import { gsap, useGSAP } from '../hooks/useReveal';
import AIOutput from '../components/common/AIOutput';
import { Pagination, EmptyState } from '../components/common';
import { cn, timeAgo } from '../lib/utils';

function ScoreRing({ score }) {
  const ref = useRef(null);
  const R = 70;
  const C = 2 * Math.PI * R;
  const color = score >= 80 ? 'var(--mint)' : score >= 60 ? 'var(--warn)' : 'var(--danger)';
  useGSAP(
    () => {
      const num = { v: 0 };
      gsap.fromTo('.ring-fg', { strokeDashoffset: C }, { strokeDashoffset: C * (1 - score / 100), duration: 1.6, ease: 'power3.out' });
      gsap.to(num, { v: score, duration: 1.6, ease: 'power3.out', onUpdate: () => ref.current && (ref.current.querySelector('.ring-num').textContent = Math.round(num.v)) });
    },
    { scope: ref, dependencies: [score] }
  );
  return (
    <div className="ring" ref={ref}>
      <svg viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={R} className="ring-bg" />
        <circle cx="80" cy="80" r={R} className="ring-fg" style={{ stroke: color }} strokeDasharray={C} strokeDashoffset={C} />
      </svg>
      <div className="ring__label">
        <span className="ring-num display">0</span>
        <small>/ 100</small>
      </div>
    </div>
  );
}

export default function AtsChecker() {
  const { user, requireAuth } = useAuth();
  const [params] = useSearchParams();
  const ai = useAIStream();
  const [mode, setMode] = useState(params.get('resume') ? 'saved' : 'upload');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState(params.get('resume') || '');
  const [jd, setJd] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [drag, setDrag] = useState(false);
  const fileInput = useRef(null);

  const loadHistory = (page = 1) => user && api.get('/ats/history', { params: { page } }).then(({ data }) => setHistory(data)).catch(() => {});

  useEffect(() => {
    if (!user) return;
    api.get('/resumes', { params: { limit: 50 } }).then(({ data }) => setResumes(data.items));
    loadHistory(1);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const extract = async (f) => {
    setFile(f);
    setBusy('Reading file…');
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await api.post('/ats/extract', fd);
      setText(data.text);
      toast.success(`Extracted ${data.words} words from ${data.fileName}`);
    } catch (e) {
      toast.error(errMsg(e));
      setFile(null);
    } finally {
      setBusy('');
    }
  };

  const analyze = requireAuth(async () => {
    if (mode === 'saved' && !resumeId) return toast.error('Choose one of your résumés.');
    if (mode !== 'saved' && text.trim().length < 40) return toast.error('Upload a file or paste at least a few lines of your résumé.');
    setBusy('Scoring…');
    ai.reset();
    try {
      const { data } = await api.post('/ats/analyze', { resumeText: mode === 'saved' ? undefined : text, resumeId: mode === 'saved' ? resumeId : undefined, jobDescription: jd, jobTitle, fileName: file?.name });
      setResult(data);
      loadHistory(1);
      setTimeout(() => document.getElementById('ats-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      // Deep AI feedback streams in over WebSocket
      ai.start('ats', { reportId: data.reportId, score: data.score, matchedKeywords: data.matchedKeywords, missingKeywords: data.missingKeywords, resumeText: data.resumeText, jobDescription: jd }).catch(() => {});
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy('');
    }
  }, 'Sign in to analyse your résumé');

  const openReport = async (id) => {
    const { data } = await api.get(`/ats/${id}`);
    const r = data.report;
    setResult({ ...r, reportId: r._id, grade: r.score >= 85 ? 'Excellent' : r.score >= 70 ? 'Good' : r.score >= 55 ? 'Fair' : 'Needs work', suggestions: [] });
    ai.reset();
    if (r.aiFeedback) ai.setText(r.aiFeedback);
    document.getElementById('ats-result')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div>
      <section className="page-head container">
        <span className="eyebrow">ATS checker</span>
        <h1 className="display">
          See your résumé <em>the way the robots do.</em>
        </h1>
        <p>An instant rule-based score plus deep AI feedback — matched keywords, gaps, and rewrites tailored to the job you want.</p>
      </section>

      <section className="container ats">
        <div className="ats__input card">
          <div className="tabs" style={{ marginBottom: 18 }}>
            <button className={mode === 'upload' ? 'is-active' : ''} onClick={() => setMode('upload')}>
              <FiUploadCloud /> Upload
            </button>
            <button className={mode === 'paste' ? 'is-active' : ''} onClick={() => setMode('paste')}>
              <FiClipboard /> Paste
            </button>
            <button className={mode === 'saved' ? 'is-active' : ''} onClick={requireAuth(() => setMode('saved'), 'Sign in to use your saved résumés')}>
              <FiFileText /> My résumés
            </button>
          </div>

          {mode === 'upload' && (
            <div
              className={cn('dropzone', drag && 'is-drag', file && 'has-file')}
              onClick={requireAuth(() => fileInput.current?.click(), 'Sign in to upload your résumé')}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                requireAuth(() => e.dataTransfer.files[0] && extract(e.dataTransfer.files[0]), 'Sign in to upload your résumé')();
              }}
            >
              <FiUploadCloud />
              <strong>{file ? file.name : 'Drop your résumé here'}</strong>
              <small>{busy === 'Reading file…' ? 'Extracting text…' : file ? `${text.split(/\s+/).length} words extracted · click to replace` : 'PDF, DOCX or TXT · up to 10 MB'}</small>
              <input ref={fileInput} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => e.target.files[0] && extract(e.target.files[0])} />
            </div>
          )}
          {mode === 'paste' && <textarea className="textarea" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full text of your résumé…" onFocus={requireAuth(() => {}, 'Sign in to analyse your résumé')} />}
          {mode === 'saved' && (
            <select className="select" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
              <option value="">Choose a résumé…</option>
              {resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}

          <div className="form-grid" style={{ marginTop: 18 }}>
            <div className="field span-2">
              <label>Target job title</label>
              <input className="input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior React Developer" />
            </div>
            <div className="field span-2">
              <label>
                Job description <span className="muted">recommended</span>
              </label>
              <textarea className="textarea" rows={7} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job post to compare keywords…" />
            </div>
          </div>
          <button className="btn btn--brand btn--lg btn--block" style={{ marginTop: 18 }} onClick={analyze} disabled={!!busy}>
            {busy ? <span className="spinner" /> : <FiTarget />} {busy || 'Analyse my résumé'}
          </button>
        </div>

        <div className="ats__result" id="ats-result">
          {!result ? (
            <div className="ats__placeholder card card--flat">
              <div className="ats__ghost-ring">
                <FiTarget />
              </div>
              <h3 className="display">Your score appears here</h3>
              <p className="muted">We check keyword match, standard sections, contact details, quantified impact, action verbs and length — then an AI coach explains exactly what to fix.</p>
            </div>
          ) : (
            <div className="stack">
              <div className="card ats__score">
                <ScoreRing score={result.score} />
                <div>
                  <span className={cn('badge', result.score >= 80 ? 'badge--mint' : result.score >= 60 ? 'badge--warn' : 'badge--danger')}>{result.grade}</span>
                  <h3 style={{ margin: '10px 0 6px' }}>{result.score >= 80 ? 'Ready to send.' : result.score >= 60 ? 'Close — a few fixes away.' : 'Likely to be filtered out.'}</h3>
                  <p className="muted" style={{ fontSize: '.9rem' }}>
                    {result.stats?.wordCount} words · {result.stats?.metrics} metrics · {result.stats?.actionVerbs} action verbs
                  </p>
                </div>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: 14 }}>Breakdown</h4>
                <div className="breakdown">
                  {result.breakdown?.map((b) => (
                    <div key={b.key}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>{b.label}</strong>
                        <span className="mono">
                          {b.score}/{b.max}
                        </span>
                      </div>
                      <div className="progress">
                        <span style={{ width: `${(b.score / b.max) * 100}%`, background: b.score / b.max >= 0.75 ? 'var(--mint)' : b.score / b.max >= 0.5 ? 'var(--warn)' : 'var(--danger)' }} />
                      </div>
                      <small className="muted">{b.tip}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 style={{ marginBottom: 12 }}>Keywords</h4>
                <div className="kw">
                  {result.matchedKeywords?.map((k) => (
                    <span key={k} className="kw__ok">
                      <FiCheck /> {k}
                    </span>
                  ))}
                  {result.missingKeywords?.map((k) => (
                    <span key={k} className="kw__miss">
                      <FiX /> {k}
                    </span>
                  ))}
                </div>
              </div>

              <AIOutput stream={ai} title="AI coach feedback" placeholder="Run an analysis to get detailed feedback." onRegenerate={() => ai.start('ats', { reportId: result.reportId, score: result.score, matchedKeywords: result.matchedKeywords, missingKeywords: result.missingKeywords, resumeText: result.resumeText || text, jobDescription: jd }).catch(() => {})} />
            </div>
          )}
        </div>
      </section>

      {user && (
        <section className="container section" style={{ paddingTop: 50 }}>
          <div className="panel">
            <div className="panel__head">
              <h3>
                <FiClock /> Recent analyses
              </h3>
              <small className="muted">{history.total} total</small>
            </div>
            {history.items.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Score</th>
                      <th>Résumé</th>
                      <th>Job</th>
                      <th>When</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {history.items.map((h) => (
                      <tr key={h._id}>
                        <td>
                          <span className={cn('badge', h.score >= 80 ? 'badge--mint' : h.score >= 60 ? 'badge--warn' : 'badge--danger')}>{h.score}</span>
                        </td>
                        <td>{h.fileName}</td>
                        <td>{h.jobTitle || '—'}</td>
                        <td className="muted">{timeAgo(h.createdAt)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button className="btn btn--soft btn--sm" onClick={() => openReport(h._id)}>
                            Open
                          </button>{' '}
                          <button
                            className="icon-btn icon-btn--danger"
                            style={{ display: 'inline-flex' }}
                            onClick={async () => {
                              await api.delete(`/ats/${h._id}`);
                              loadHistory(history.page);
                            }}
                            aria-label="Delete report"
                          >
                            <FiTrash2 />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel__body">
                <EmptyState icon={<FiTarget />} title="No analyses yet" text="Your score history will appear here." />
              </div>
            )}
          </div>
          <Pagination page={history.page} pages={history.pages} onChange={loadHistory} />
        </section>
      )}
    </div>
  );
}
