import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FiCheck, FiX, FiEye, FiTrash2, FiStar, FiSearch, FiEdit3, FiExternalLink } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { useDebounce } from '../../hooks';
import { Avatar, Pagination, Modal, Markdown, ConfirmDialog, EmptyState, YouTubeEmbed } from '../../components/common';
import { timeAgo, cn } from '../../lib/utils';

export default function AdminBlogs() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'pending';
  const { socket } = useSocket();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 350);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [preview, setPreview] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(null);

  const load = useCallback(() => api.get('/admin/blogs', { params: { status: status === 'all' ? undefined : status, page, search: q || undefined } }).then(({ data: d }) => setData(d)), [status, page, q]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!socket) return undefined;
    socket.on('admin:pending-blog', load);
    return () => socket.off('admin:pending-blog', load);
  }, [socket, load]);

  const setStatus = async (b, s, extra = {}) => {
    try {
      await api.patch(`/admin/blogs/${b._id}/status`, { status: s, ...extra });
      toast.success(s === 'approved' ? 'Post approved & published' : s === 'rejected' ? 'Post rejected' : 'Updated');
      setPreview(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const openPreview = async (b) => {
    const { data: d } = await api.get(`/admin/blogs/${b._id}`);
    setPreview(d.blog);
  };

  const badge = { approved: 'badge--mint', pending: 'badge--warn', rejected: 'badge--danger' };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Moderation</span>
          <h1>Blog posts</h1>
        </div>
        <Link to="/blogs/new" className="btn btn--brand btn--sm">
          <FiEdit3 /> New post
        </Link>
      </div>
      <div className="toolbar" style={{ margin: 0 }}>
        <div className="tabs">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              className={status === s ? 'is-active' : ''}
              onClick={() => {
                setParams({ status: s });
                setPage(1);
              }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="input-group" style={{ flex: 1, maxWidth: 320 }}>
          <span className="input-group__icon">
            <FiSearch />
          </span>
          <input className="input" placeholder="Search titles" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {data.items.length ? (
        <div className="mod-list">
          {data.items.map((b) => (
            <article key={b._id} className="mod-item">
              <img src={b.coverImage} alt="" />
              <div className="mod-item__body">
                <div className="row" style={{ '--gap': '8px' }}>
                  <span className={cn('badge badge--dot', badge[b.status])}>{b.status}</span>
                  <span className="badge">{b.category}</span>
                  {b.featured && (
                    <span className="badge badge--accent">
                      <FiStar /> Featured
                    </span>
                  )}
                </div>
                <h3>{b.title}</h3>
                <p>{b.excerpt}</p>
                <div className="row muted" style={{ fontSize: '.82rem', '--gap': '8px' }}>
                  <Avatar src={b.author?.avatar} name={b.author?.name} size="sm" />
                  {b.author?.name} · @{b.author?.username} · submitted {timeAgo(b.createdAt)}
                  {b.status === 'approved' && ` · ${b.views} views · ${b.likesCount} likes`}
                </div>
                {b.status === 'rejected' && b.rejectionReason && <small style={{ color: 'var(--danger)' }}>Reason: {b.rejectionReason}</small>}
              </div>
              <div className="mod-item__actions">
                <button className="btn btn--soft btn--sm" onClick={() => openPreview(b)}>
                  <FiEye /> Review
                </button>
                {b.status !== 'approved' && (
                  <button className="btn btn--brand btn--sm" onClick={() => setStatus(b, 'approved')}>
                    <FiCheck /> Approve
                  </button>
                )}
                {b.status !== 'rejected' && (
                  <button className="btn btn--ghost btn--sm" onClick={() => { setReject(b); setReason(''); }}>
                    <FiX /> Reject
                  </button>
                )}
                {b.status === 'approved' && (
                  <button className="btn btn--ghost btn--sm" onClick={() => setStatus(b, undefined, { featured: !b.featured })}>
                    <FiStar /> {b.featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}
                <button className="icon-btn icon-btn--danger" onClick={() => setDel(b)} aria-label="Delete">
                  <FiTrash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<FiCheck />} title={status === 'pending' ? 'Inbox zero 🎉' : 'Nothing here'} text={status === 'pending' ? 'No posts are waiting for review. New submissions appear here in real time.' : undefined} />
      )}
      <Pagination page={data.page} pages={data.pages} total={data.total} label="posts" onChange={setPage} />

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Review post"
        width={860}
        footer={
          preview && (
            <>
              <Link to={`/blogs/${preview.slug}`} target="_blank" className="btn btn--ghost btn--sm">
                <FiExternalLink /> Open
              </Link>
              <Link to={`/blogs/edit/${preview.slug}`} className="btn btn--ghost btn--sm">
                <FiEdit3 /> Edit
              </Link>
              {preview.status !== 'rejected' && (
                <button className="btn btn--danger btn--sm" onClick={() => { setReject(preview); setReason(''); }}>
                  <FiX /> Reject
                </button>
              )}
              {preview.status !== 'approved' && (
                <button className="btn btn--brand btn--sm" onClick={() => setStatus(preview, 'approved')}>
                  <FiCheck /> Approve & publish
                </button>
              )}
            </>
          )
        }
      >
        {preview && (
          <div className="stack">
            <img src={preview.coverImage} alt="" style={{ borderRadius: 16, maxHeight: 280, objectFit: 'cover', width: '100%' }} />
            <h2 className="display" style={{ fontSize: '2.2rem' }}>
              {preview.title}
            </h2>
            {preview.youtubeUrl && <YouTubeEmbed url={preview.youtubeUrl} />}
            <Markdown>{preview.content}</Markdown>
          </div>
        )}
      </Modal>

      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title="Reject post"
        width={480}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setReject(null)}>
              Cancel
            </button>
            <button
              className="btn btn--danger btn--sm"
              onClick={async () => {
                await setStatus(reject, 'rejected', { reason });
                setReject(null);
              }}
            >
              Reject post
            </button>
          </>
        }
      >
        <div className="field">
          <label>Reason (shown to the author)</label>
          <select className="select" onChange={(e) => setReason(e.target.value)} defaultValue="">
            <option value="" disabled>
              Choose a template…
            </option>
            <option>Content is too short or lacks depth.</option>
            <option>Off-topic for a technology journal.</option>
            <option>Contains promotional or spam content.</option>
            <option>Please add sources and fix formatting issues.</option>
          </select>
          <textarea className="textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write a custom note…" />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title="Delete post permanently?"
        message={`“${del?.title}” and all of its comments and ratings will be removed.`}
        onConfirm={async () => {
          await api.delete(`/blogs/${del._id}`);
          toast.success('Post deleted');
          load();
        }}
      />
    </div>
  );
}
