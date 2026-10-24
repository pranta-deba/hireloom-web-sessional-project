import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FiPlus, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import TemplateCard from '../../components/resume/TemplateCard';
import { ResumeRenderer, ResumeScaler } from '../../components/resume/ResumeRenderer';
import { SAMPLE_DATA } from '../../components/resume/sampleData';
import { Modal, ConfirmDialog, ImageUploader } from '../../components/common';
import { LAYOUTS, FONTS } from '../../lib/constants';

const BLANK = { name: '', category: 'resume', layout: 'classic', description: '', thumbnail: '', theme: { primary: '#2F4BFF', accent: '#FF6A3D', font: 'Manrope', headingFont: 'Instrument Serif' }, tags: '', isActive: true, isFeatured: false, order: 10 };

export default function AdminTemplates() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/templates', { params: { all: 1, limit: 60 } }).then(({ data }) => setItems(data.items));
  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setEdit((e) => ({ ...e, [k]: v }));
  const setTheme = (k, v) => setEdit((e) => ({ ...e, theme: { ...e.theme, [k]: v } }));

  const save = async () => {
    if (!edit.name.trim()) return toast.error('Name is required');
    setBusy(true);
    try {
      const body = { ...edit, tags: typeof edit.tags === 'string' ? edit.tags : edit.tags.join(', ') };
      if (edit._id) await api.put(`/templates/${edit._id}`, body);
      else await api.post('/templates', body);
      toast.success('Template saved');
      setEdit(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Templates</span>
          <h1>Résumé & CV templates</h1>
        </div>
        <button className="btn btn--brand btn--sm" onClick={() => setEdit({ ...BLANK, theme: { ...BLANK.theme } })}>
          <FiPlus /> New template
        </button>
      </div>
      <div className="grid-3">
        {items.map((t) => (
          <div key={t._id} style={{ position: 'relative', opacity: t.isActive ? 1 : 0.55 }}>
            <TemplateCard
              template={t}
              onPreview={() => setEdit({ ...t, tags: (t.tags || []).join(', ') })}
              badge={
                <>
                  <span className="badge">{t.layout}</span>
                  {!t.isActive && <span className="badge badge--danger">hidden</span>}
                  <span className="badge badge--brand">{t.usageCount} uses</span>
                </>
              }
            />
            <div className="row" style={{ position: 'absolute', top: 12, right: 12, '--gap': '6px' }}>
              <button className="btn btn--soft btn--sm btn--icon" onClick={() => setEdit({ ...t, tags: (t.tags || []).join(', ') })} aria-label="Edit">
                <FiEdit3 />
              </button>
              <button className="btn btn--danger btn--sm btn--icon" onClick={() => setDel(t)} aria-label="Delete">
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={edit?._id ? `Edit “${edit.name}”` : 'New template'}
        width={980}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn btn--brand btn--sm" onClick={save} disabled={busy}>
              {busy && <span className="spinner" />} Save template
            </button>
          </>
        }
      >
        {edit && (
          <div className="tpl-editor">
            <div className="stack" style={{ '--gap': '14px' }}>
              <div className="form-grid">
                <div className="field span-2">
                  <label>Name</label>
                  <input className="input" value={edit.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select className="select" value={edit.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="resume">Résumé</option>
                    <option value="cv">CV</option>
                  </select>
                </div>
                <div className="field">
                  <label>Layout</label>
                  <select className="select" value={edit.layout} onChange={(e) => set('layout', e.target.value)}>
                    {LAYOUTS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Primary colour</label>
                  <div className="color-field">
                    <input type="color" value={edit.theme.primary} onChange={(e) => setTheme('primary', e.target.value)} />
                    <input className="input mono" value={edit.theme.primary} onChange={(e) => setTheme('primary', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Accent colour</label>
                  <div className="color-field">
                    <input type="color" value={edit.theme.accent} onChange={(e) => setTheme('accent', e.target.value)} />
                    <input className="input mono" value={edit.theme.accent} onChange={(e) => setTheme('accent', e.target.value)} />
                  </div>
                </div>
                <div className="field">
                  <label>Body font</label>
                  <select className="select" value={edit.theme.font} onChange={(e) => setTheme('font', e.target.value)}>
                    {FONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Heading font</label>
                  <select className="select" value={edit.theme.headingFont} onChange={(e) => setTheme('headingFont', e.target.value)}>
                    {FONTS.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="field span-2">
                  <label>Description</label>
                  <textarea className="textarea" rows={2} value={edit.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div className="field">
                  <label>Tags (comma separated)</label>
                  <input className="input" value={edit.tags} onChange={(e) => set('tags', e.target.value)} />
                </div>
                <div className="field">
                  <label>Sort order</label>
                  <input className="input" type="number" value={edit.order} onChange={(e) => set('order', Number(e.target.value))} />
                </div>
                <div className="field span-2">
                  <label>
                    Custom thumbnail <span className="muted">optional — live preview is used otherwise</span>
                  </label>
                  <ImageUploader value={edit.thumbnail} onChange={(u) => set('thumbnail', u)} aspect="3/1" label="Upload thumbnail" />
                  {edit.thumbnail && (
                    <button type="button" className="link" style={{ alignSelf: 'flex-start' }} onClick={() => set('thumbnail', '')}>
                      Remove thumbnail
                    </button>
                  )}
                </div>
              </div>
              <div className="row">
                <label className="switch">
                  <input type="checkbox" checked={edit.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                  <span className="switch__track" /> Visible to users
                </label>
                <label className="switch">
                  <input type="checkbox" checked={edit.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
                  <span className="switch__track" /> Featured
                </label>
              </div>
            </div>
            <div className="tpl-editor__preview">
              <small className="eyebrow">Live preview</small>
              <ResumeScaler>
                <ResumeRenderer data={SAMPLE_DATA} template={edit} />
              </ResumeScaler>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete “${del?.name}”?`}
        message="Existing résumés keep their content but will fall back to the default layout."
        onConfirm={async () => {
          await api.delete(`/templates/${del._id}`);
          toast.success('Template deleted');
          load();
        }}
      />
    </div>
  );
}
