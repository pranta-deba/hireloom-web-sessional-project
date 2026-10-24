import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiMapPin, FiGlobe, FiCalendar, FiUser } from 'react-icons/fi';
import { api, errMsg } from '../lib/api';
import { Avatar, PageLoader, EmptyState } from '../components/common';
import { fmtDate } from '../lib/utils';

export default function PublicProfile() {
  const { username } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api
      .get(`/users/${username}`)
      .then(({ data }) => setState({ loading: false, ...data }))
      .catch((e) => setState({ loading: false, error: errMsg(e) }));
  }, [username]);

  if (state.loading) return <PageLoader />;
  if (state.error) return <div className="container section"><EmptyState icon={<FiUser />} title="Profile not found" text={state.error} /></div>;
  const { user, posts } = state;

  return (
    <div className="container profile">
      <div className="profile__cover" style={{ backgroundImage: `url(${user.coverImage || `https://picsum.photos/seed/${user.username}/1400/400`})` }} />
      <div className="profile__head">
        <Avatar src={user.avatar} name={user.name} size="xl" />
        <div>
          <h1 className="display">{user.name}</h1>
          <p className="muted">
            @{user.username} {user.headline && `· ${user.headline}`}
          </p>
          <div className="row muted" style={{ fontSize: '.85rem', marginTop: 8 }}>
            {(user.location?.city || user.location?.country) && (
              <span>
                <FiMapPin /> {[user.location.city, user.location.country].filter(Boolean).join(', ')}
              </span>
            )}
            {user.website && (
              <a href={user.website.startsWith('http') ? user.website : `https://${user.website}`} target="_blank" rel="noreferrer">
                <FiGlobe /> {user.website}
              </a>
            )}
            <span>
              <FiCalendar /> Joined {fmtDate(user.createdAt, { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
      {user.bio && <p className="profile__bio">{user.bio}</p>}
      {user.skills?.length > 0 && (
        <div className="row" style={{ marginBottom: 32 }}>
          {user.skills.map((s) => (
            <span key={s} className="badge badge--brand">
              {s}
            </span>
          ))}
        </div>
      )}
      <h3 style={{ marginBottom: 16 }}>Published posts</h3>
      {posts.length ? (
        <div className="grid-3">
          {posts.map((p) => (
            <Link key={p._id} to={`/blogs/${p.slug}`} className="related">
              <img src={p.coverImage} alt="" loading="lazy" />
              <span className="badge">{p.category}</span>
              <strong>{p.title}</strong>
              <small className="muted">
                {fmtDate(p.publishedAt)} · {p.readTime} min
              </small>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">No published posts yet.</p>
      )}
    </div>
  );
}
