import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { toast } from 'sonner';
import { FiBold, FiItalic, FiList, FiLink, FiCode, FiHash, FiImage, FiSend, FiEye, FiEdit3, FiX, FiYoutube, FiInfo } from 'react-icons/fi';
import { api, errMsg, uploadImage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ImageUploader, Markdown, YouTubeEmbed, PageLoader } from '../components/common';
import { BLOG_CATEGORIES } from '../lib/constants';
import { youtubeId } from '../lib/utils';

function TagInput({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const t = draft.trim().toLowerCase().replace(/^#/, '');
    if (t && !value.includes(t) && value.length < 8) onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="tag-input">
      {value.map((t) => (
        <span key={t} className="tag-input__tag">
          #{t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove ${t}`}>
            <FiX />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (['Enter', ','].includes(e.key)) {
            e.preventDefault();
            add();
          } else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length < 8 ? 'Add tag and press Enter' : 'Max 8 tags'}
      />
    </div>
  );
}

export default function WriteBlog() {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const editing = !!slug;
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('write');
  const [post, setPost] = useState({ _id: null, title: '', excerpt: '', category: BLOG_CATEGORIES[0], tags: [], coverImage: '', youtubeUrl: '', audioUrl: '', eventDate: null, content: '' });
  const ta = useRef(null);
  const set = (k, v) => setPost((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/blogs/${slug}`)
      .then(({ data }) => {
        if (!data.isOwner && !isAdmin) {
          toast.error('You can only edit your own posts.');
          navigate('/blogs');
          return;
        }
        const b = data.blog;
        setPost({ _id: b._id, title: b.title, excerpt: b.excerpt, category: b.category, tags: b.tags || [], coverImage: b.coverImage, youtubeUrl: b.youtubeUrl, audioUrl: b.audioUrl, eventDate: b.eventDate ? new Date(b.eventDate) : null, content: b.content });
      })
      .catch((e) => {
        toast.error(errMsg(e));
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [editing, slug, isAdmin, navigate]);

  const wrap = (before, after = before, placeholder = 'text') => {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set('content', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + sel.length);
    });
  };
  const linePrefix = (prefix) => {
    const el = ta.current;
    const { selectionStart: s, value } = el;
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    set('content', value.slice(0, lineStart) + prefix + value.slice(lineStart));
    requestAnimationFrame(() => el.focus());
  };
  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const t = toast.loading('Uploading image…');
      try {
        const { url } = await uploadImage(file);
        wrap(`![${file.name.replace(/\.\w+$/, '')}](`, ')', url);
        toast.success('Image inserted', { id: t });
      } catch (e) {
        toast.error(errMsg(e), { id: t });
      }
    };
    input.click();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (post.title.trim().length < 8) return toast.error('Give your post a descriptive title (8+ characters).');
    if (post.content.trim().length < 80) return toast.error('Your post needs at least 80 characters of content.');
    if (post.youtubeUrl && !youtubeId(post.youtubeUrl)) return toast.error('That YouTube link doesn’t look right.');
    setBusy(true);
    try {
      const payload = { ...post, eventDate: post.eventDate || undefined };
      const { data } = editing ? await api.put(`/blogs/${post._id}`, payload) : await api.post('/blogs', payload);
      if (data.blog.status === 'approved') {
        toast.success('Published!');
        navigate(`/blogs/${data.blog.slug}`);
      } else {
        toast.success('Submitted for review', { description: 'An editor will approve it shortly. You’ll be notified in real time.' });
        navigate('/dashboard?tab=posts');
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader />;
  const words = post.content.split(/\s+/).filter(Boolean).length;

  return (
    <form className="container writer" onSubmit={submit}>
      <div className="writer__head">
        <div>
          <span className="eyebrow">{editing ? 'Edit post' : 'New post'}</span>
          <h1 className="display">{editing ? 'Refine your story' : 'Share what you know'}</h1>
        </div>
        <button className="btn btn--brand btn--lg" disabled={busy}>
          {busy ? <span className="spinner" /> : <FiSend />} {isAdmin ? 'Publish' : 'Submit for review'}
        </button>
      </div>

      {!isAdmin && (
        <div className="notice notice--brand">
          <FiInfo />
          <div>
            <strong>Editorial review</strong>
            <p>Posts are reviewed by an admin before appearing on the journal. Edits to a published post are re-reviewed.</p>
          </div>
        </div>
      )}

      <div className="writer__grid">
        <div className="stack">
          <input className="writer__title" value={post.title} onChange={(e) => set('title', e.target.value)} placeholder="Post title" maxLength={160} />
          <textarea className="textarea" rows={2} value={post.excerpt} onChange={(e) => set('excerpt', e.target.value)} placeholder="One-sentence summary shown on cards (optional)" maxLength={300} />

          <div className="editor">
            <div className="editor__bar">
              <div className="row" style={{ '--gap': '2px' }}>
                <button type="button" className="icon-btn" onClick={() => linePrefix('## ')} title="Heading">
                  <FiHash />
                </button>
                <button type="button" className="icon-btn" onClick={() => wrap('**')} title="Bold">
                  <FiBold />
                </button>
                <button type="button" className="icon-btn" onClick={() => wrap('_')} title="Italic">
                  <FiItalic />
                </button>
                <button type="button" className="icon-btn" onClick={() => linePrefix('- ')} title="List">
                  <FiList />
                </button>
                <button type="button" className="icon-btn" onClick={() => wrap('[', '](https://)', 'link text')} title="Link">
                  <FiLink />
                </button>
                <button type="button" className="icon-btn" onClick={() => wrap('`')} title="Code">
                  <FiCode />
                </button>
                <button type="button" className="icon-btn" onClick={insertImage} title="Upload image">
                  <FiImage />
                </button>
              </div>
              <div className="tabs">
                <button type="button" className={view === 'write' ? 'is-active' : ''} onClick={() => setView('write')}>
                  <FiEdit3 /> Write
                </button>
                <button type="button" className={view === 'preview' ? 'is-active' : ''} onClick={() => setView('preview')}>
                  <FiEye /> Preview
                </button>
              </div>
            </div>
            {view === 'write' ? (
              <textarea ref={ta} className="editor__area" value={post.content} onChange={(e) => set('content', e.target.value)} placeholder={'Write in Markdown…\n\n## A heading\n\nSome **bold** insight and a list:\n- first\n- second'} />
            ) : (
              <div className="editor__preview">{post.content ? <Markdown>{post.content}</Markdown> : <p className="muted">Nothing to preview yet.</p>}</div>
            )}
            <div className="editor__foot">
              {words} words · ~{Math.max(1, Math.round(words / 220))} min read · Markdown supported
            </div>
          </div>
        </div>

        <aside className="stack writer__side">
          <div className="card stack" style={{ '--gap': '14px' }}>
            <div className="field">
              <label>Cover image</label>
              <ImageUploader value={post.coverImage} onChange={(u) => set('coverImage', u)} label="Upload cover" />
              <input className="input" value={post.coverImage} onChange={(e) => set('coverImage', e.target.value)} placeholder="…or paste an image URL" />
            </div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={post.category} onChange={(e) => set('category', e.target.value)}>
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tags</label>
              <TagInput value={post.tags} onChange={(v) => set('tags', v)} />
            </div>
          </div>
          <div className="card stack" style={{ '--gap': '14px' }}>
            <div className="field">
              <label>
                <span>
                  <FiYoutube /> YouTube video
                </span>
              </label>
              <input className="input" value={post.youtubeUrl} onChange={(e) => set('youtubeUrl', e.target.value)} placeholder="https://youtube.com/watch?v=…" />
              {youtubeId(post.youtubeUrl) && <YouTubeEmbed url={post.youtubeUrl} title="Preview" />}
            </div>
            <div className="field">
              <label>Audio URL (podcast / narration)</label>
              <input className="input" value={post.audioUrl} onChange={(e) => set('audioUrl', e.target.value)} placeholder="https://…/episode.mp3" />
            </div>
            <div className="field">
              <label>Event date (optional)</label>
              <DatePicker selected={post.eventDate} onChange={(d) => set('eventDate', d)} placeholderText="For meetups, webinars…" dateFormat="d MMM yyyy" minDate={new Date()} isClearable showPopperArrow={false} />
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
