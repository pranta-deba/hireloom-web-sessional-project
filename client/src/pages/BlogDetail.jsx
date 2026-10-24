import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FiThumbsUp, FiThumbsDown, FiMessageCircle, FiShare2, FiClock, FiEye, FiEdit3, FiCalendar, FiAlertCircle } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Markdown, StarRating, Avatar, YouTubeEmbed, AudioPlayer, PageLoader, EmptyState } from '../components/common';
import CommentSection from '../components/blog/CommentSection';
import { fmtDate, cn, compact } from '../lib/utils';
import { gsap, useGSAP } from '../hooks/useReveal';
import { useRef } from 'react';

export default function BlogDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();
  const { socket } = useSocket();
  const [state, setState] = useState({ loading: true });
  const [pulse, setPulse] = useState('');
  const [progress, setProgress] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    setState({ loading: true });
    api
      .get(`/blogs/${slug}`)
      .then(({ data }) => setState({ loading: false, ...data }))
      .catch((e) => setState({ loading: false, error: errMsg(e) }));
  }, [slug, user?._id]);

  const blog = state.blog;
  const blogId = blog?._id;

  // reading progress bar
  useEffect(() => {
    const fn = () => {
      const h = document.documentElement;
      setProgress((h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100);
    };
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useGSAP(
    () => {
      if (!blogId) return;
      gsap.from('.post__hero > *', { y: 30, opacity: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out' });
      gsap.from('.post__cover', { scale: 1.06, opacity: 0, duration: 1.2, ease: 'power3.out' });
    },
    { scope: ref, dependencies: [blogId] }
  );

  // join the post's real-time room
  useEffect(() => {
    if (!socket || !blogId) return undefined;
    socket.emit('blog:join', { blogId });
    const onReact = (p) => {
      if (p.blogId !== blogId) return;
      setState((s) => ({ ...s, blog: { ...s.blog, likesCount: p.likesCount, dislikesCount: p.dislikesCount } }));
      setPulse('react');
      setTimeout(() => setPulse(''), 600);
    };
    const onRate = (p) => p.blogId === blogId && setState((s) => ({ ...s, blog: { ...s.blog, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount } }));
    socket.on('blog:reactions', onReact);
    socket.on('blog:rating', onRate);
    return () => {
      socket.emit('blog:leave', { blogId });
      socket.off('blog:reactions', onReact);
      socket.off('blog:rating', onRate);
    };
  }, [socket, blogId]);

  const onCountChange = useCallback((delta) => setState((s) => (s.blog ? { ...s, blog: { ...s.blog, commentCount: Math.max(0, (s.blog.commentCount || 0) + delta) } } : s)), []);

  if (state.loading) return <PageLoader />;
  if (state.error)
    return (
      <div className="container section">
        <EmptyState icon={<FiAlertCircle />} title="Post not found" text={state.error} action={<Link to="/blogs" className="btn btn--brand">Back to journal</Link>} />
      </div>
    );

  const approved = blog.status === 'approved';

  const react = requireAuth(async (type) => {
    const prev = { likesCount: blog.likesCount, dislikesCount: blog.dislikesCount, myReaction: blog.myReaction };
    const next = { ...prev };
    if (prev.myReaction === type) {
      next.myReaction = null;
      next[`${type}sCount`]--;
    } else {
      next.myReaction = type;
      next[`${type}sCount`]++;
      if (prev.myReaction) next[`${prev.myReaction}sCount`]--;
    }
    setState((s) => ({ ...s, blog: { ...s.blog, ...next } }));
    try {
      const { data } = await api.post(`/blogs/${blog._id}/react`, { type });
      setState((s) => ({ ...s, blog: { ...s.blog, ...data } }));
    } catch (e) {
      setState((s) => ({ ...s, blog: { ...s.blog, ...prev } }));
      toast.error(errMsg(e));
    }
  }, 'Sign in to react to posts');

  const rate = requireAuth(async (value) => {
    try {
      const { data } = await api.post(`/blogs/${blog._id}/rate`, { value });
      setState((s) => ({ ...s, blog: { ...s.blog, ...data } }));
      toast.success(`You rated this ${value} star${value > 1 ? 's' : ''}`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, 'Sign in to rate posts');

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: blog.title, url });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    }
  };

  return (
    <article className="post" ref={ref}>
      <div className="read-progress" style={{ width: `${progress}%` }} />
      {!approved && (
        <div className="container">
          <div className={cn('notice', blog.status === 'rejected' ? 'notice--danger' : 'notice--warn')}>
            <FiAlertCircle />
            <div>
              <strong>{blog.status === 'pending' ? 'Awaiting editor approval' : 'This post was not approved'}</strong>
              <p>{blog.status === 'pending' ? 'Only you and the admins can see this post until it is approved.' : blog.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}
      <header className="post__hero container">
        <Link to={`/blogs?category=${encodeURIComponent(blog.category)}`} className="badge badge--brand">
          {blog.category}
        </Link>
        <h1 className="display">{blog.title}</h1>
        <div className="post__meta">
          <Link to={`/u/${blog.author?.username}`} className="row" style={{ '--gap': '10px' }}>
            <Avatar src={blog.author?.avatar} name={blog.author?.name} />
            <span>
              <strong>{blog.author?.name}</strong>
              <small>{blog.author?.headline || `@${blog.author?.username}`}</small>
            </span>
          </Link>
          <span>
            <FiCalendar /> {fmtDate(blog.publishedAt || blog.createdAt)}
          </span>
          <span>
            <FiClock /> {blog.readTime} min read
          </span>
          <span>
            <FiEye /> {compact(blog.views)}
          </span>
          {state.isOwner && (
            <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/blogs/edit/${blog.slug}`)}>
              <FiEdit3 /> Edit
            </button>
          )}
        </div>
      </header>

      <div className="container">
        <img className="post__cover" src={blog.coverImage} alt="" />
      </div>

      <div className="container post__layout">
        <aside className="post__rail" aria-label="Reactions">
          <button className={cn('rail-btn', blog.myReaction === 'like' && 'is-on', pulse && 'is-pulse')} onClick={() => react('like')} disabled={!approved} aria-label="Like">
            <FiThumbsUp />
            <span>{blog.likesCount}</span>
          </button>
          <button className={cn('rail-btn', blog.myReaction === 'dislike' && 'is-on-neg')} onClick={() => react('dislike')} disabled={!approved} aria-label="Dislike">
            <FiThumbsDown />
            <span>{blog.dislikesCount}</span>
          </button>
          <a href="#comments" className="rail-btn" aria-label="Comments">
            <FiMessageCircle />
            <span>{blog.commentCount}</span>
          </a>
          <button className="rail-btn" onClick={share} aria-label="Share">
            <FiShare2 />
          </button>
        </aside>

        <div className="post__content">
          {blog.youtubeUrl && (
            <div style={{ marginBottom: 32 }}>
              <YouTubeEmbed url={blog.youtubeUrl} title={blog.title} />
            </div>
          )}
          {blog.audioUrl && (
            <div style={{ marginBottom: 32 }}>
              <AudioPlayer src={blog.audioUrl} title="Listen to this post" artist={blog.author?.name} />
            </div>
          )}
          {blog.eventDate && (
            <div className="notice notice--brand" style={{ marginBottom: 28 }}>
              <FiCalendar />
              <div>
                <strong>Event date</strong>
                <p>{fmtDate(blog.eventDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          )}
          <Markdown>{blog.content}</Markdown>

          {blog.tags?.length > 0 && (
            <div className="row" style={{ marginTop: 36 }}>
              {blog.tags.map((t) => (
                <Link key={t} to={`/blogs?q=${encodeURIComponent(t)}`} className="tag">
                  {t}
                </Link>
              ))}
            </div>
          )}

          {approved && (
            <div className="rate-box">
              <div>
                <h4>Was this useful?</h4>
                <p className="muted">
                  {blog.ratingCount > 0 ? `${blog.ratingAvg.toFixed(1)} average from ${blog.ratingCount} ratings — updates live.` : 'Be the first to rate this post.'}
                </p>
              </div>
              <StarRating value={blog.myRating || 0} onRate={rate} size="1.8rem" />
            </div>
          )}

          <div className="reaction-bar">
            <button className={cn('btn btn--sm', blog.myReaction === 'like' ? 'btn--brand' : 'btn--ghost')} onClick={() => react('like')} disabled={!approved}>
              <FiThumbsUp /> Like · {blog.likesCount}
            </button>
            <button className={cn('btn btn--sm', blog.myReaction === 'dislike' ? 'btn--danger' : 'btn--ghost')} onClick={() => react('dislike')} disabled={!approved}>
              <FiThumbsDown /> Dislike · {blog.dislikesCount}
            </button>
            <div className="spacer" />
            <StarRating value={blog.ratingAvg} showLabel count={blog.ratingCount} size="1rem" />
          </div>

          {approved && <CommentSection blogId={blog._id} count={blog.commentCount} onCountChange={onCountChange} />}
        </div>
      </div>

      {state.related?.length > 0 && (
        <section className="container section" style={{ paddingTop: 40 }}>
          <h3 style={{ marginBottom: 20 }}>Keep reading</h3>
          <div className="grid-3">
            {state.related.map((r) => (
              <Link key={r._id} to={`/blogs/${r.slug}`} className="related">
                <img src={r.coverImage} alt="" loading="lazy" />
                <span className="badge">{r.category}</span>
                <strong>{r.title}</strong>
                <small className="muted">
                  {fmtDate(r.publishedAt)} · {r.readTime} min
                </small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
