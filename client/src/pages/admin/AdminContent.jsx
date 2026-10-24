import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FiTrash2, FiEye, FiMail, FiCheck } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { Avatar, Pagination, EmptyState, ConfirmDialog } from '../../components/common';
import { timeAgo, fmtDate, cn } from '../../lib/utils';

function usePaged(url, params = {}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const key = JSON.stringify(params);
  const load = useCallback(() => api.get(url, { params: { page, ...JSON.parse(key) } }).then(({ data: d }) => setData(d)), [url, page, key]);
  useEffect(() => {
    load();
  }, [load]);
  return { data, setData, page, setPage, load };
}

export function AdminResumes() {
  const [samples, setSamples] = useState(false);
  const { data, setPage, load } = usePaged('/admin/resumes', { samples: samples ? 1 : undefined });
  const [del, setDel] = useState(null);
  const toggle = async (r, key) => {
    try {
      await api.patch(`/admin/resumes/${r._id}`, { [key]: !r[key] });
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Documents</span>
          <h1>Résumés & CVs</h1>
        </div>
        <div className="tabs">
          <button className={!samples ? 'is-active' : ''} onClick={() => { setSamples(false); setPage(1); }}>
            All
          </button>
          <button className={samples ? 'is-active' : ''} onClick={() => { setSamples(true); setPage(1); }}>
            Gallery samples
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        Mark any public résumé as a <b>gallery sample</b> to feature it on the landing and templates pages.
      </p>
      <div className="panel">
        {data.items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Template</th>
                  <th>Public</th>
                  <th>Sample</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.title}</strong>
                      <br />
                      <small className="muted">
                        {r.kind} · {r.views} views
                      </small>
                    </td>
                    <td>
                      <div className="user-cell" style={{ minWidth: 0 }}>
                        <Avatar src={r.user?.avatar} name={r.user?.name} size="sm" /> <span>@{r.user?.username}</span>
                      </div>
                    </td>
                    <td>{r.template?.name || '—'}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={r.isPublic} onChange={() => toggle(r, 'isPublic')} />
                        <span className="switch__track" />
                      </label>
                    </td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={r.isSample} onChange={() => toggle(r, 'isSample')} />
                        <span className="switch__track" />
                      </label>
                    </td>
                    <td className="muted">{timeAgo(r.updatedAt)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <Link to={`/resumes/${r._id}`} className="icon-btn" style={{ display: 'inline-flex' }} target="_blank">
                        <FiEye />
                      </Link>
                      <button className="icon-btn icon-btn--danger" style={{ display: 'inline-flex' }} onClick={() => setDel(r)}>
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
            <EmptyState icon={<FiEye />} title="No documents" />
          </div>
        )}
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} label="documents" onChange={setPage} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} title="Delete document?" message={del?.title} onConfirm={async () => { await api.delete(`/resumes/${del._id}`); toast.success('Deleted'); load(); }} />
    </div>
  );
}

export function AdminComments() {
  const { data, setPage, load } = usePaged('/admin/comments');
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Community</span>
          <h1>Comments</h1>
        </div>
        <span className="badge badge--brand">{data.total} total</span>
      </div>
      <div className="stack" style={{ '--gap': '10px' }}>
        {data.items.length ? (
          data.items.map((c) => (
            <div key={c._id} className="card row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Avatar src={c.user?.avatar} name={c.user?.name} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row muted" style={{ fontSize: '.8rem', '--gap': '6px' }}>
                  <strong style={{ color: 'var(--ink)' }}>{c.user?.name}</strong> on
                  <Link to={`/blogs/${c.blog?.slug}#comments`} className="link">
                    {c.blog?.title}
                  </Link>
                  · {timeAgo(c.createdAt)} {c.parent && '· reply'}
                </div>
                <p style={{ marginTop: 4 }}>{c.content}</p>
              </div>
              <button
                className="icon-btn icon-btn--danger"
                onClick={async () => {
                  await api.delete(`/comments/${c._id}`);
                  toast.success('Comment removed');
                  load();
                }}
                aria-label="Delete comment"
              >
                <FiTrash2 />
              </button>
            </div>
          ))
        ) : (
          <EmptyState icon={<FiCheck />} title="No comments yet" />
        )}
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} label="comments" onChange={setPage} />
    </div>
  );
}

export function AdminMessages() {
  const { data, setData, setPage, load } = usePaged('/admin/messages');
  const [open, setOpen] = useState(null);
  const markRead = async (m, read = true) => {
    await api.patch(`/admin/messages/${m._id}`, { read });
    setData((d) => ({ ...d, items: d.items.map((x) => (x._id === m._id ? { ...x, read } : x)) }));
  };
  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Inbox</span>
          <h1>Contact messages</h1>
        </div>
      </div>
      <div className="stack" style={{ '--gap': '10px' }}>
        {data.items.length ? (
          data.items.map((m) => (
            <div
              key={m._id}
              className={cn('card msg', !m.read && 'is-unread')}
              onClick={() => {
                setOpen(open === m._id ? null : m._id);
                if (!m.read) markRead(m);
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{m.name}</strong> <span className="muted">&lt;{m.email}&gt;</span>
                  <div className="row" style={{ '--gap': '6px', marginTop: 4 }}>
                    <span className="badge">{m.topic}</span>
                    {m.preferredDate && <span className="badge badge--brand">Call: {fmtDate(m.preferredDate, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                </div>
                <small className="muted">{timeAgo(m.createdAt)}</small>
              </div>
              <p style={{ marginTop: 10, fontWeight: 600 }}>{m.subject}</p>
              <p className={open === m._id ? '' : 'msg__clip'} style={{ color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                {m.message}
              </p>
              {open === m._id && (
                <div className="row" style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <a className="btn btn--brand btn--sm" href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || m.topic}`)}`}>
                    <FiMail /> Reply
                  </a>
                  <button className="btn btn--ghost btn--sm" onClick={() => markRead(m, false)}>
                    Mark unread
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={async () => {
                      await api.delete(`/admin/messages/${m._id}`);
                      load();
                    }}
                  >
                    <FiTrash2 /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState icon={<FiMail />} title="No messages" />
        )}
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} label="messages" onChange={setPage} />
    </div>
  );
}
