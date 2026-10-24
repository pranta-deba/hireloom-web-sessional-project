import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { FiUsers, FiEye, FiFileText, FiBookOpen, FiAlertCircle, FiMail, FiActivity, FiStar, FiTarget, FiEdit3, FiRadio } from 'react-icons/fi';
import { api } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { Avatar, PageLoader } from '../../components/common';
import { compact, timeAgo } from '../../lib/utils';

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey}>
          <i style={{ background: p.color }} /> {p.name}: <b>{p.value}</b>
        </div>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const [s, setS] = useState(null);
  const { online, socket } = useSocket();

  const load = () => api.get('/admin/stats').then(({ data }) => setS(data));
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on('admin:new-user', refresh);
    socket.on('admin:pending-blog', refresh);
    return () => {
      socket.off('admin:new-user', refresh);
      socket.off('admin:pending-blog', refresh);
    };
  }, [socket]);

  if (!s) return <PageLoader label="Loading analytics" />;
  const t = s.totals;
  const daily = s.daily.map((d) => ({ ...d, day: new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }));

  const cards = [
    { icon: <FiEye />, label: 'Total page views', value: t.totalVisits, sub: `${t.todayVisits} today`, tone: 'brand' },
    { icon: <FiActivity />, label: 'Unique visitors', value: t.uniqueVisitors, sub: 'distinct sessions', tone: 'mint' },
    { icon: <FiRadio />, label: 'Online now', value: online, sub: 'live WebSocket clients', tone: 'accent' },
    { icon: <FiUsers />, label: 'Members', value: t.users, sub: `${t.admins} admin · ${t.banned} banned`, tone: 'brand' },
    { icon: <FiFileText />, label: 'Résumés & CVs', value: t.resumes, sub: `${t.templates} templates`, tone: 'mint' },
    { icon: <FiEdit3 />, label: 'Cover letters', value: t.letters, sub: `${t.ats} ATS checks`, tone: 'accent' },
    { icon: <FiBookOpen />, label: 'Published posts', value: t.blogs, sub: `${t.comments} comments`, tone: 'brand' },
    { icon: <FiStar />, label: 'Site rating', value: s.siteRating.average.toFixed(1), sub: `${s.siteRating.count} ratings`, tone: 'warn' },
  ];

  return (
    <div className="stack" style={{ '--gap': '22px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h1>Platform at a glance</h1>
        </div>
        <div className="row">
          {t.pending > 0 && (
            <Link to="/admin/blogs?status=pending" className="btn btn--accent btn--sm">
              <FiAlertCircle /> {t.pending} post{t.pending > 1 ? 's' : ''} awaiting review
            </Link>
          )}
          {t.unread > 0 && (
            <Link to="/admin/messages" className="btn btn--ghost btn--sm">
              <FiMail /> {t.unread} unread
            </Link>
          )}
        </div>
      </div>

      <div className="kpis">
        {cards.map((c) => (
          <div key={c.label} className={`kpi kpi--${c.tone}`}>
            <span className="kpi__icon">{c.icon}</span>
            <small>{c.label}</small>
            <strong>{typeof c.value === 'number' ? compact(c.value) : c.value}</strong>
            <span className="kpi__sub">{c.sub}</span>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__head">
            <h3>Traffic · last 14 days</h3>
            <small className="muted">Page views & unique visitors</small>
          </div>
          <div className="panel__body" style={{ height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="views" name="Views" stroke="var(--brand)" strokeWidth={2.5} fill="url(#gv)" />
                <Area type="monotone" dataKey="visitors" name="Visitors" stroke="var(--accent)" strokeWidth={2.5} fill="url(#gu)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h3>New members</h3>
          </div>
          <div className="panel__body" style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={daily} margin={{ left: -24, right: 4, top: 8 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} cursor={{ fill: 'var(--bg-2)' }} />
                <Bar dataKey="signups" name="Sign-ups" fill="var(--mint)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__head">
            <h3>Top pages</h3>
          </div>
          <div className="panel__body stack" style={{ '--gap': '12px' }}>
            {s.topPages.length ? (
              s.topPages.map((p) => (
                <div key={p.path}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: '.85rem' }}>
                      {p.path}
                    </span>
                    <strong>{p.views}</strong>
                  </div>
                  <div className="progress">
                    <span style={{ width: `${(p.views / s.topPages[0].views) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No visits recorded yet.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h3>Latest members</h3>
            <Link to="/admin/users" className="link" style={{ fontSize: '.85rem' }}>
              Manage
            </Link>
          </div>
          <div className="panel__body stack" style={{ '--gap': '14px' }}>
            {s.recentUsers.map((u) => (
              <div key={u._id} className="user-cell">
                <Avatar src={u.avatar} name={u.name} />
                <div style={{ flex: 1 }}>
                  <strong>{u.name}</strong>
                  <small>
                    @{u.username} · {timeAgo(u.createdAt)}
                  </small>
                </div>
                <span className={`badge ${u.role === 'admin' ? 'badge--accent' : ''}`}>{u.role}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="quick">
        {[
          ['/admin/settings?tab=ai', <FiTarget key="a" />, 'Connect an AI provider'],
          ['/admin/settings?tab=firebase', <FiUsers key="b" />, 'Enable Google & phone login'],
          ['/admin/settings?tab=email', <FiMail key="c" />, 'Configure welcome emails'],
          ['/admin/templates', <FiFileText key="d" />, 'Design a new template'],
        ].map(([to, icon, label]) => (
          <Link key={to} to={to} className="quick__item">
            {icon} {label}
          </Link>
        ))}
      </section>
    </div>
  );
}
