import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiEdit3, FiArrowUpRight, FiBookOpen } from 'react-icons/fi';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useDebounce } from '../hooks';
import { useReveal } from '../hooks/useReveal';
import BlogCard from '../components/blog/BlogCard';
import { Pagination, EmptyState, Avatar } from '../components/common';
import { fmtDate } from '../lib/utils';
import { toast } from 'sonner';

export default function Blogs() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const { socket } = useSocket();
  const [cats, setCats] = useState([]);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounce(search, 350);
  const category = params.get('category') || 'All';
  const sort = params.get('sort') || 'latest';
  const page = Number(params.get('page') || 1);
  const scope = useReveal([data.items.length]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v && v !== 'All' && !(k === 'page' && v === 1) ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  useEffect(() => {
    api.get('/blogs/categories').then(({ data: d }) => setCats(d.categories));
  }, []);

  useEffect(() => {
    if (q !== (params.get('q') || '')) update({ q, page: 1 });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoading(true);
    api
      .get('/blogs', { params: { page, category, search: params.get('q') || undefined, sort, limit: 9 } })
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, [page, category, sort, params]);

  // Newly approved posts announce themselves live
  useEffect(() => {
    if (!socket) return undefined;
    const fn = ({ title, slug }) => toast('New post published', { description: title, action: { label: 'Read', onClick: () => navigate(`/blogs/${slug}`) } });
    socket.on('blog:published', fn);
    return () => socket.off('blog:published', fn);
  }, [socket, navigate]);

  const showFeature = page === 1 && category === 'All' && !params.get('q') && sort === 'latest' && data.items.length > 3;
  const [feature, ...rest] = data.items;
  const list = showFeature ? rest : data.items;

  return (
    <div ref={scope}>
      <section className="page-head container">
        <span className="eyebrow">The HireLoom journal</span>
        <h1 className="display">
          Technology, careers & <em>craft.</em>
        </h1>
        <p>Written by members, reviewed by editors. Every post you publish goes to the admin team for approval before it appears here.</p>
        <div className="page-head__actions">
          <button className="btn btn--brand" onClick={requireAuth(() => navigate('/blogs/new'), 'Sign in to write a post')}>
            <FiEdit3 /> Write a post
          </button>
        </div>
      </section>

      <section className="container">
        <div className="toolbar">
          <div className="chips-scroll">
            <button className={`chip ${category === 'All' ? 'is-active' : ''}`} onClick={() => update({ category: 'All', page: 1 })}>
              All
            </button>
            {cats.map((c) => (
              <button key={c.name} className={`chip ${category === c.name ? 'is-active' : ''}`} onClick={() => update({ category: c.name, page: 1 })}>
                {c.name} <small>{c.count}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <div className="input-group" style={{ flex: 1, maxWidth: 420 }}>
            <span className="input-group__icon">
              <FiSearch />
            </span>
            <input className="input" placeholder="Search articles, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ maxWidth: 200 }} value={sort} onChange={(e) => update({ sort: e.target.value, page: 1 })} aria-label="Sort posts">
            <option value="latest">Latest</option>
            <option value="popular">Most viewed</option>
            <option value="rated">Top rated</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>

        {loading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 380, borderRadius: 24 }} />
            ))}
          </div>
        ) : data.items.length ? (
          <>
            {showFeature && feature && (
              <Link to={`/blogs/${feature.slug}`} className="feature-post" data-reveal>
                <img src={feature.coverImage} alt="" />
                <div className="feature-post__body">
                  <span className="badge badge--accent">Featured · {feature.category}</span>
                  <h2 className="display">{feature.title}</h2>
                  <p>{feature.excerpt}</p>
                  <div className="row" style={{ '--gap': '10px' }}>
                    <Avatar src={feature.author?.avatar} name={feature.author?.name} size="sm" />
                    <span>
                      {feature.author?.name} · {fmtDate(feature.publishedAt)} · {feature.readTime} min read
                    </span>
                    <FiArrowUpRight className="feature-post__go" />
                  </div>
                </div>
              </Link>
            )}
            <div className="grid-3" data-stagger>
              {list.map((p) => (
                <BlogCard key={p._id} post={p} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon={<FiBookOpen />} title="No posts found" text="Try a different category or search term." />
        )}
        <Pagination page={data.page} pages={data.pages} total={data.total} label="posts" onChange={(p) => update({ page: p })} />
      </section>
    </div>
  );
}
