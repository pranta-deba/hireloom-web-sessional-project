import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiPlus, FiFileText, FiEdit3, FiTarget, FiBookOpen, FiCopy, FiTrash2, FiEye, FiClock, FiMonitor, FiKey, FiGlobe, FiLogIn, FiZap, FiSettings } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ResumeRenderer, ResumeScaler } from '../../components/resume/ResumeRenderer';
import { Avatar, Pagination, EmptyState, ConfirmDialog } from '../../components/common';
import { timeAgo, fmtDate, cn } from '../../lib/utils';
import { useReveal } from '../../hooks/useReveal';

const METHOD = { password: 'Username & password', google: 'Google (Firebase)', github: 'GitHub OAuth', phone: 'Phone OTP (Firebase)', firebase: 'Firebase' };

function device(ua = '') {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return `${browser}${os ? ` on ${os}` : ''}`;
}

function SessionCard() {
  const { session } = useAuth();
  if (!session) return null;
  return (
    <div className="card session-card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <h4>
          <FiKey /> Current session
        </h4>
        <span className="badge badge--mint badge--dot">Active</span>
      </div>
      <dl>
        <div>
          <dt>
            <FiLogIn /> Signed in with
          </dt>
          <dd>{METHOD[session.loginMethod] || session.loginMethod}</dd>
        </div>
        <div>
          <dt>
            <FiClock /> Since
          </dt>
          <dd>
            {fmtDate(session.loginAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({timeAgo(session.loginAt)})
          </dd>
        </div>
        <div>
          <dt>
            <FiMonitor /> Device
          </dt>
          <dd>{device(session.userAgent)}</dd>
        </div>
        <div>
          <dt>
            <FiGlobe /> IP address
          </dt>
          <dd className="mono">{session.ip}</dd>
        </div>
        <div>
          <dt>
            <FiKey /> Session ID
          </dt>
          <dd className="mono">{session.id}</dd>
        </div>
        <div>
          <dt>
            <FiClock /> Expires
          </dt>
          <dd>{fmtDate(session.expiresAt, { day: 'numeric', month: 'short', year: 'numeric' })}</dd>
        </div>
      </dl>
    </div>
  );
}

function ResumesTab() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(null);
  const load = useCallback((page = 1) => {
    setLoading(true);
    api.get('/resumes', { params: { page, limit: 6 } }).then(({ data: d }) => setData(d)).finally(() => setLoading(false));
  }, []);
  useEffect(() => load(1), [load]);

  const duplicate = async (id) => {
    try {
      await api.post(`/resumes/${id}/duplicate`);
      toast.success('Duplicated');
      load(data.page);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  if (loading) return <div className="grid-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 360, borderRadius: 24 }} />)}</div>;
  return (
    <>
      <div className="grid-3">
        <button className="new-card" onClick={() => navigate('/templates')}>
          <FiPlus />
          <strong>New résumé or CV</strong>
          <small>Start from a template</small>
        </button>
        <button className="new-card new-card--ai" onClick={() => navigate('/generate')}>
          <FiZap />
          <strong>Generate with AI</strong>
          <small>Full draft in seconds</small>
        </button>
        {data.items.map((r) => (
          <article key={r._id} className="doc-card">
            <Link to={`/builder/${r._id}`} className="doc-card__preview">
              <ResumeScaler>
                <ResumeRenderer data={r.data} template={r.template} accentColor={r.accentColor} />
              </ResumeScaler>
            </Link>
            <div className="doc-card__body">
              <div style={{ minWidth: 0 }}>
                <strong>{r.title}</strong>
                <small>
                  {r.template?.name} · edited {timeAgo(r.updatedAt)} {r.isPublic && '· public'}
                </small>
              </div>
              <div className="row" style={{ '--gap': '2px', flexWrap: 'nowrap' }}>
                <Link to={`/builder/${r._id}`} className="icon-btn" title="Edit">
                  <FiEdit3 />
                </Link>
                <Link to={`/resumes/${r._id}`} className="icon-btn" title="View">
                  <FiEye />
                </Link>
                <button className="icon-btn" onClick={() => duplicate(r._id)} title="Duplicate">
                  <FiCopy />
                </button>
                <button className="icon-btn icon-btn--danger" onClick={() => setDel(r)} title="Delete">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} label="documents" onChange={load} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete this résumé?"
        message={`“${del?.title}” will be permanently removed.`}
        onConfirm={async () => {
          await api.delete(`/resumes/${del._id}`);
          toast.success('Résumé deleted');
          load(data.page);
        }}
      />
    </>
  );
}

function PostsTab() {
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [del, setDel] = useState(null);
  const load = useCallback((page = 1) => api.get('/blogs/mine', { params: { page, status: status || undefined } }).then(({ data: d }) => setData(d)), [status]);
  useEffect(() => {
    load(1);
  }, [load]);
  const badge = { approved: 'badge--mint', pending: 'badge--warn', rejected: 'badge--danger' };
  return (
    <>
      <div className="toolbar">
        <div className="tabs">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <button key={s} className={status === s ? 'is-active' : ''} onClick={() => setStatus(s)}>
              {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <Link to="/blogs/new" className="btn btn--brand btn--sm">
          <FiPlus /> Write a post
        </Link>
      </div>
      {data.items.length ? (
        <div className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Status</th>
                  <th>Stats</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className="user-cell">
                        <img src={p.coverImage} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                        <div>
                          <strong>{p.title}</strong>
                          <small>{p.category}</small>
                          {p.status === 'rejected' && p.rejectionReason && <small style={{ color: 'var(--danger)', display: 'block' }}>Reason: {p.rejectionReason}</small>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={cn('badge badge--dot', badge[p.status])}>{p.status}</span>
                    </td>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {p.views} views · {p.likesCount} likes · {p.commentCount} comments
                    </td>
                    <td className="muted">{timeAgo(p.updatedAt)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <Link to={`/blogs/${p.slug}`} className="icon-btn" style={{ display: 'inline-flex' }} title="View">
                        <FiEye />
                      </Link>
                      <Link to={`/blogs/edit/${p.slug}`} className="icon-btn" style={{ display: 'inline-flex' }} title="Edit">
                        <FiEdit3 />
                      </Link>
                      <button className="icon-btn icon-btn--danger" style={{ display: 'inline-flex' }} onClick={() => setDel(p)} title="Delete">
                        <FiTrash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={<FiBookOpen />} title="No posts here" text="Share what you know — posts go live after an editor approves them." action={<Link to="/blogs/new" className="btn btn--brand">Write your first post</Link>} />
      )}
      <Pagination page={data.page} pages={data.pages} onChange={load} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete post?"
        message={`“${del?.title}” and its comments will be removed.`}
        onConfirm={async () => {
          await api.delete(`/blogs/${del._id}`);
          toast.success('Post deleted');
          load(data.page);
        }}
      />
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'resumes';
  const [stats, setStats] = useState(null);
  const scope = useReveal([!!stats]);

  useEffect(() => {
    api.get('/users/me/stats').then(({ data }) => setStats(data));
    if (params.get('welcome') === 'github') toast.success('Signed in with GitHub');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const cards = stats
    ? [
        { icon: <FiFileText />, label: 'Résumés & CVs', value: stats.resumes, to: '?tab=resumes' },
        { icon: <FiEdit3 />, label: 'Cover letters', value: stats.letters, to: '/cover-letter' },
        { icon: <FiTarget />, label: 'Best ATS score', value: stats.bestAtsScore ?? '—', to: '/ats' },
        { icon: <FiBookOpen />, label: 'Published posts', value: stats.blogs.approved, sub: stats.blogs.pending ? `${stats.blogs.pending} pending` : null, to: '?tab=posts' },
      ]
    : [];

  return (
    <div className="container dash" ref={scope}>
      <header className="dash__head">
        <Avatar src={user.avatar} name={user.name} size="lg" />
        <div>
          <span className="eyebrow">{greet}</span>
          <h1 className="display">{user.name.split(' ')[0]}’s workspace</h1>
          <p className="muted">
            @{user.username} {user.headline && `· ${user.headline}`}
          </p>
        </div>
        <div className="spacer" />
        <Link to="/settings" className="btn btn--ghost btn--sm">
          <FiSettings /> Profile settings
        </Link>
      </header>

      <div className="dash__top">
        <div className="dash__stats" data-stagger>
          {cards.map((c) => (
            <Link key={c.label} to={c.to.startsWith('?') ? `/dashboard${c.to}` : c.to} className="stat-card">
              <span className="stat-card__icon">{c.icon}</span>
              <strong className="display">{c.value}</strong>
              <small>{c.label}</small>
              {c.sub && <span className="badge badge--warn">{c.sub}</span>}
            </Link>
          ))}
        </div>
        <SessionCard />
      </div>

      <div className="tabs" style={{ margin: '36px 0 22px' }}>
        <button className={tab === 'resumes' ? 'is-active' : ''} onClick={() => setParams({ tab: 'resumes' })}>
          <FiFileText /> Résumés & CVs
        </button>
        <button className={tab === 'posts' ? 'is-active' : ''} onClick={() => setParams({ tab: 'posts' })}>
          <FiBookOpen /> My posts
        </button>
        <Link to="/cover-letter" className="tab-link">
          <FiEdit3 /> Cover letters
        </Link>
        <Link to="/ats" className="tab-link">
          <FiTarget /> ATS history
        </Link>
      </div>
      {tab === 'posts' ? <PostsTab /> : <ResumesTab />}
    </div>
  );
}
