import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FiEdit3, FiSave, FiDownload, FiTrash2, FiFileText, FiZap } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useAIStream } from '../hooks';
import AIOutput from '../components/common/AIOutput';
import { Pagination, EmptyState, ConfirmDialog } from '../components/common';
import { TONES } from '../lib/constants';
import { downloadText, timeAgo } from '../lib/utils';

const BLANK = { fullName: '', company: '', role: '', hiringManager: '', experience: '', skills: '', highlights: '', tone: 'Professional', length: 'medium', jobDescription: '' };

export default function CoverLetter() {
  const { user, requireAuth } = useAuth();
  const ai = useAIStream();
  const [f, setF] = useState({ ...BLANK, fullName: user?.name || '' });
  const [resumes, setResumes] = useState([]);
  const [saved, setSaved] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [editingId, setEditingId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const loadSaved = (page = 1) => user && api.get('/cover-letters', { params: { page } }).then(({ data }) => setSaved(data));

  useEffect(() => {
    if (!user) return;
    setF((x) => ({ ...x, fullName: x.fullName || user.name }));
    api.get('/resumes', { params: { limit: 50 } }).then(({ data }) => setResumes(data.items));
    loadSaved(1);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const fillFromResume = (id) => {
    const r = resumes.find((x) => x._id === id);
    if (!r) return;
    const d = r.data;
    const exp = d.experience?.[0];
    setF((x) => ({
      ...x,
      fullName: d.personal?.fullName || x.fullName,
      skills: (d.skills || []).map((s) => s.name).join(', '),
      experience: exp ? `${exp.role} at ${exp.company}` : x.experience,
      highlights: (exp?.description || '').split('\n').slice(0, 2).join(' ').replace(/•/g, ''),
    }));
    toast.success('Filled from your résumé');
  };

  const generate = requireAuth(async (e) => {
    e?.preventDefault();
    if (!f.company.trim() || !f.role.trim()) return toast.error('Company and role are required.');
    setEditingId(null);
    try {
      await ai.start('cover-letter', { form: f });
    } catch {
      /* shown in output */
    }
  }, 'Sign in to generate cover letters');

  const save = async () => {
    try {
      if (editingId) await api.put(`/cover-letters/${editingId}`, { content: ai.text, company: f.company, role: f.role, tone: f.tone });
      else {
        const { data } = await api.post('/cover-letters', { company: f.company, role: f.role, tone: f.tone, jobDescription: f.jobDescription, content: ai.text });
        setEditingId(data.letter._id);
      }
      toast.success('Cover letter saved');
      loadSaved(saved.page);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const open = (l) => {
    setEditingId(l._id);
    setF((x) => ({ ...x, company: l.company || '', role: l.role || '', tone: l.tone || 'Professional', jobDescription: l.jobDescription || '' }));
    ai.reset();
    ai.setText(l.content);
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  return (
    <div>
      <section className="page-head container">
        <span className="eyebrow">Cover letter studio</span>
        <h1 className="display">
          Letters that sound like you — <em>on your best day.</em>
        </h1>
        <p>Give us the role and a few facts. The AI writes a tailored letter live, then you edit, save and export.</p>
      </section>

      <section className="container studio">
        <form className="card studio__form" onSubmit={generate}>
          {user && resumes.length > 0 && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Auto-fill from a résumé</label>
              <select className="select" defaultValue="" onChange={(e) => fillFromResume(e.target.value)}>
                <option value="">Choose…</option>
                {resumes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="form-grid">
            <div className="field">
              <label>Company *</label>
              <input className="input" value={f.company} onChange={set('company')} placeholder="Acme Corp" />
            </div>
            <div className="field">
              <label>Role *</label>
              <input className="input" value={f.role} onChange={set('role')} placeholder="Frontend Engineer" />
            </div>
            <div className="field">
              <label>Your name</label>
              <input className="input" value={f.fullName} onChange={set('fullName')} />
            </div>
            <div className="field">
              <label>Hiring manager</label>
              <input className="input" value={f.hiringManager} onChange={set('hiringManager')} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Tone</label>
              <select className="select" value={f.tone} onChange={set('tone')}>
                {TONES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Length</label>
              <select className="select" value={f.length} onChange={set('length')}>
                <option value="short">Short (~200 words)</option>
                <option value="medium">Standard (~300 words)</option>
                <option value="long">Detailed (~420 words)</option>
              </select>
            </div>
            <div className="field span-2">
              <label>Relevant experience</label>
              <input className="input" value={f.experience} onChange={set('experience')} placeholder="5 years as a React developer at Pathao" />
            </div>
            <div className="field span-2">
              <label>Key skills</label>
              <input className="input" value={f.skills} onChange={set('skills')} placeholder="React, TypeScript, testing, mentoring" />
            </div>
            <div className="field span-2">
              <label>Achievements to highlight</label>
              <textarea className="textarea" rows={3} value={f.highlights} onChange={set('highlights')} />
            </div>
            <div className="field span-2">
              <label>Job description</label>
              <textarea className="textarea" rows={5} value={f.jobDescription} onChange={set('jobDescription')} placeholder="Paste the job post for a tailored letter" />
            </div>
          </div>
          <button className="btn btn--brand btn--lg btn--block" style={{ marginTop: 18 }} disabled={ai.busy}>
            {ai.busy ? <span className="spinner" /> : <FiZap />} {ai.busy ? 'Writing…' : 'Generate cover letter'}
          </button>
        </form>

        <div className="studio__out">
          <AIOutput
            stream={ai}
            title={f.company ? `Letter for ${f.role || 'role'} @ ${f.company}` : 'Your cover letter'}
            markdown={false}
            editable
            onEdit={ai.setText}
            onRegenerate={generate}
            placeholder={
              <div className="studio__ph">
                <FiEdit3 />
                <p>Fill in the form and press generate. The letter streams in here word by word — then it’s fully editable.</p>
              </div>
            }
          >
            {ai.text && !ai.busy && (
              <div className="ai-out__foot">
                <button className="btn btn--brand btn--sm" onClick={save}>
                  <FiSave /> {editingId ? 'Update' : 'Save'}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => downloadText(`Cover-Letter-${(f.company || 'company').replace(/\s+/g, '-')}.txt`, ai.text)}>
                  <FiDownload /> .txt
                </button>
              </div>
            )}
          </AIOutput>
        </div>
      </section>

      {user && (
        <section className="container section" style={{ paddingTop: 50 }}>
          <h3 style={{ marginBottom: 16 }}>Saved letters</h3>
          {saved.items.length ? (
            <div className="grid-3">
              {saved.items.map((l) => (
                <article key={l._id} className="card card--hover letter-card">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="badge badge--brand">{l.tone || 'Professional'}</span>
                    <small className="muted">{timeAgo(l.updatedAt)}</small>
                  </div>
                  <h4>{l.title}</h4>
                  <p>{l.content}</p>
                  <div className="row" style={{ '--gap': '6px' }}>
                    <button className="btn btn--soft btn--sm" onClick={() => open(l)}>
                      <FiEdit3 /> Open
                    </button>
                    <button className="icon-btn icon-btn--danger" onClick={() => setToDelete(l)} aria-label="Delete">
                      <FiTrash2 />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon={<FiFileText />} title="No saved letters" text="Generate a letter and press Save to keep it here." />
          )}
          <Pagination page={saved.page} pages={saved.pages} onChange={loadSaved} />
        </section>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Delete this cover letter?"
        message="This can’t be undone."
        onConfirm={async () => {
          await api.delete(`/cover-letters/${toDelete._id}`);
          toast.success('Deleted');
          loadSaved(saved.page);
        }}
      />
    </div>
  );
}
