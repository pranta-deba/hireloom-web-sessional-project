import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiThumbsUp, FiThumbsDown, FiCornerDownRight, FiEdit2, FiTrash2, FiSend, FiMessageCircle } from 'react-icons/fi';
import { toast } from 'sonner';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar, Pagination, EmptyState } from '../common';
import { timeAgo, cn } from '../../lib/utils';

function Composer({ onSubmit, placeholder = 'Write a comment…', autoFocus, initial = '', onCancel, blogId, compact }) {
  const { user, requireAuth } = useAuth();
  const { socket } = useSocket();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const typingTimer = useRef(null);
  const ta = useRef(null);

  useEffect(() => {
    if (autoFocus) ta.current?.focus();
  }, [autoFocus]);

  const signalTyping = () => {
    if (!socket || !blogId) return;
    socket.emit('comment:typing', { blogId, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('comment:typing', { blogId, typing: false }), 1800);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText('');
      socket?.emit('comment:typing', { blogId, typing: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={cn('composer', compact && 'composer--compact')} onSubmit={requireAuth(submit, 'Sign in to join the conversation')}>
      <Avatar src={user?.avatar} name={user?.name || '?'} size={compact ? 'sm' : ''} />
      <div className="composer__box">
        <textarea
          ref={ta}
          rows={compact ? 1 : 2}
          value={text}
          placeholder={user ? placeholder : 'Sign in to comment'}
          onFocus={requireAuth(() => {}, 'Sign in to join the conversation')}
          onChange={(e) => {
            setText(e.target.value);
            signalTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          maxLength={2000}
        />
        <div className="composer__bar">
          <small className="muted">{text.length > 0 && `${text.length}/2000 · Ctrl+Enter to send`}</small>
          <div className="row" style={{ '--gap': '6px' }}>
            {onCancel && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button className="btn btn--brand btn--sm" disabled={busy || !text.trim()}>
              {busy ? <span className="spinner" /> : <FiSend />} {initial ? 'Save' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ c, blogId, onReply, onChange, onDelete, isReply }) {
  const { user, requireAuth } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const mine = user && c.user?._id === user._id;
  const canDelete = mine || user?.role === 'admin';

  const react = requireAuth(async (type) => {
    // optimistic update
    const prev = { likesCount: c.likesCount, dislikesCount: c.dislikesCount, myReaction: c.myReaction };
    const was = c.myReaction;
    const next = { ...prev };
    if (was === type) {
      next.myReaction = null;
      next[`${type}sCount`] -= 1;
    } else {
      next.myReaction = type;
      next[`${type}sCount`] += 1;
      if (was) next[`${was}sCount`] -= 1;
    }
    onChange(c._id, next);
    try {
      const { data } = await api.post(`/comments/${c._id}/react`, { type });
      onChange(c._id, data);
    } catch (e) {
      onChange(c._id, prev);
      toast.error(errMsg(e));
    }
  }, 'Sign in to react');

  return (
    <div className={cn('comment', isReply && 'comment--reply', c._fresh && 'is-fresh')} id={`c-${c._id}`}>
      <Link to={`/u/${c.user?.username}`}>
        <Avatar src={c.user?.avatar} name={c.user?.name} size={isReply ? 'sm' : ''} />
      </Link>
      <div className="comment__main">
        {editing ? (
          <Composer
            compact
            autoFocus
            initial={c.content}
            onCancel={() => setEditing(false)}
            onSubmit={async (text) => {
              try {
                const { data } = await api.put(`/comments/${c._id}`, { content: text });
                onChange(c._id, data.comment);
                setEditing(false);
              } catch (e) {
                toast.error(errMsg(e));
              }
            }}
          />
        ) : (
          <div className="comment__bubble">
            <div className="comment__who">
              <Link to={`/u/${c.user?.username}`}>{c.user?.name}</Link>
              {c.user?.role === 'admin' && <span className="badge badge--brand">Editor</span>}
            </div>
            <p>{c.content}</p>
          </div>
        )}
        <div className="comment__actions">
          <button className={cn(c.myReaction === 'like' && 'is-on')} onClick={() => react('like')} aria-label="Like">
            <FiThumbsUp /> {c.likesCount || 0}
          </button>
          <button className={cn(c.myReaction === 'dislike' && 'is-on-neg')} onClick={() => react('dislike')} aria-label="Dislike">
            <FiThumbsDown /> {c.dislikesCount || 0}
          </button>
          {!isReply && (
            <button onClick={requireAuth(() => setReplying((v) => !v), 'Sign in to reply')}>
              <FiCornerDownRight /> Reply
            </button>
          )}
          {mine && !editing && (
            <button onClick={() => setEditing(true)}>
              <FiEdit2 /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(c)}>
              <FiTrash2 /> Delete
            </button>
          )}
          <span className="muted">
            {timeAgo(c.createdAt)}
            {c.edited && ' · edited'}
          </span>
        </div>
        {replying && (
          <Composer
            compact
            autoFocus
            blogId={blogId}
            placeholder={`Reply to ${c.user?.name}…`}
            onCancel={() => setReplying(false)}
            onSubmit={async (text) => {
              await onReply(text, c._id);
              setReplying(false);
            }}
          />
        )}
        {c.replies?.length > 0 && (
          <div className="comment__replies">
            {c.replies.map((r) => (
              <CommentItem key={r._id} c={r} blogId={blogId} isReply onChange={onChange} onDelete={onDelete} onReply={onReply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Facebook-style live comments: new comments, edits, deletes and reactions appear without reloading. */
export default function CommentSection({ blogId, count, onCountChange }) {
  const { socket } = useSocket();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [typers, setTypers] = useState({});

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get(`/blogs/${blogId}/comments`, { params: { page, limit: 8 } });
        setItems(data.items);
        setMeta({ page: data.page, pages: data.pages, total: data.total });
      } finally {
        setLoading(false);
      }
    },
    [blogId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // ── real-time ──
  useEffect(() => {
    if (!socket) return undefined;
    const patch = (id, fn) =>
      setItems((list) =>
        list.map((c) => (c._id === id ? fn(c) : { ...c, replies: (c.replies || []).map((r) => (r._id === id ? fn(r) : r)) }))
      );
    const onNew = ({ comment, socketId }) => {
      if (socketId && socketId === socket.id) return; // our own post is already rendered
      const fresh = { ...comment, _fresh: true };
      if (comment.parent) setItems((list) => list.map((c) => (c._id === comment.parent ? { ...c, replies: [...(c.replies || []), fresh] } : c)));
      else {
        setItems((list) => [fresh, ...list]);
        setMeta((m) => ({ ...m, total: m.total + 1 }));
      }
      onCountChange?.(1);
    };
    const onUpdated = ({ comment }) => patch(comment._id, (c) => ({ ...c, content: comment.content, edited: true }));
    const onDeleted = ({ commentId, parentId, socketId }) => {
      if (socketId && socketId === socket.id) return;
      setItems((list) => (parentId ? list.map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r._id !== commentId) })) : list.filter((c) => c._id !== commentId)));
      onCountChange?.(-1);
    };
    const onReact = ({ commentId, likesCount, dislikesCount }) => patch(commentId, (c) => ({ ...c, likesCount, dislikesCount }));
    const onTyping = ({ user, typing }) =>
      setTypers((t) => {
        const n = { ...t };
        if (typing) n[user.username] = user;
        else delete n[user.username];
        return n;
      });

    socket.on('comment:new', onNew);
    socket.on('comment:updated', onUpdated);
    socket.on('comment:deleted', onDeleted);
    socket.on('comment:reactions', onReact);
    socket.on('comment:typing', onTyping);
    return () => {
      socket.off('comment:new', onNew);
      socket.off('comment:updated', onUpdated);
      socket.off('comment:deleted', onDeleted);
      socket.off('comment:reactions', onReact);
      socket.off('comment:typing', onTyping);
    };
  }, [socket, onCountChange]);

  const post = async (content, parentId) => {
    try {
      const { data } = await api.post('/comments', { blogId, content, parentId });
      const c = { ...data.comment, _fresh: true };
      if (parentId) setItems((list) => list.map((x) => (x._id === parentId || x.replies?.some((r) => r._id === parentId) ? { ...x, replies: [...(x.replies || []), c] } : x)));
      else {
        setItems((list) => [c, ...list]);
        setMeta((m) => ({ ...m, total: m.total + 1 }));
      }
      onCountChange?.(1);
    } catch (e) {
      toast.error(errMsg(e));
      throw e;
    }
  };

  const change = (id, patchObj) =>
    setItems((list) => list.map((c) => (c._id === id ? { ...c, ...patchObj } : { ...c, replies: (c.replies || []).map((r) => (r._id === id ? { ...r, ...patchObj } : r)) })));

  const remove = async (c) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/comments/${c._id}`);
      setItems((list) => (c.parent ? list.map((x) => ({ ...x, replies: (x.replies || []).filter((r) => r._id !== c._id) })) : list.filter((x) => x._id !== c._id)));
      onCountChange?.(-1);
      toast.success('Comment deleted');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const typingList = Object.values(typers);

  return (
    <section className="comments" id="comments">
      <div className="comments__head">
        <h3>
          Discussion <span className="badge">{count ?? meta.total}</span>
        </h3>
        <span className="row muted" style={{ '--gap': '6px', fontSize: '.8rem' }}>
          <span className="live-dot" /> Live
        </span>
      </div>
      <Composer blogId={blogId} onSubmit={(t) => post(t)} />
      {typingList.length > 0 && (
        <div className="comments__typing">
          <span className="chat__typing">
            <i />
            <i />
            <i />
          </span>
          {typingList.map((u) => u.name.split(' ')[0]).join(', ')} {typingList.length > 1 ? 'are' : 'is'} typing…
        </div>
      )}
      {loading ? (
        <div className="stack" style={{ marginTop: 24 }}>
          {[0, 1].map((i) => (
            <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div className="skeleton" style={{ flex: 1, height: 70 }} />
            </div>
          ))}
        </div>
      ) : items.length ? (
        <div className="comments__list">
          {items.map((c) => (
            <CommentItem key={c._id} c={c} blogId={blogId} onReply={post} onChange={change} onDelete={remove} />
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <EmptyState icon={<FiMessageCircle />} title="No comments yet" text="Start the conversation — your comment appears for every reader instantly." />
        </div>
      )}
      <Pagination page={meta.page} pages={meta.pages} total={meta.total} label="threads" onChange={(p) => load(p)} />
    </section>
  );
}
