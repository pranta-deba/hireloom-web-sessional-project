import { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { FiGrid, FiUsers, FiFileText, FiLayout, FiBookOpen, FiMessageSquare, FiMail, FiSettings, FiArrowLeft, FiMenu, FiSun, FiMoon, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useConfig } from '../../context/ConfigContext';
import { Avatar } from '../common';
import { Wordmark } from './Navbar';

const NAV = [
  { to: '/admin', end: true, icon: <FiGrid />, label: 'Overview' },
  { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
  { to: '/admin/blogs', icon: <FiBookOpen />, label: 'Blog moderation' },
  { to: '/admin/templates', icon: <FiLayout />, label: 'Templates' },
  { to: '/admin/resumes', icon: <FiFileText />, label: 'Résumés & CVs' },
  { to: '/admin/comments', icon: <FiMessageSquare />, label: 'Comments' },
  { to: '/admin/messages', icon: <FiMail />, label: 'Messages' },
  { to: '/admin/settings', icon: <FiSettings />, label: 'Settings & keys' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { online, connected } = useSocket();
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="admin">
      <aside className={`admin__side ${open ? 'is-open' : ''}`}>
        <Link to="/" className="admin__brand">
          <Wordmark name={config.site.name} />
          <span className="badge badge--accent">Admin</span>
        </Link>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.icon} {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin__side-foot">
          <Link to="/" className="btn btn--ghost btn--sm btn--block">
            <FiArrowLeft /> Back to site
          </Link>
        </div>
      </aside>
      {open && <div className="admin__scrim" onClick={() => setOpen(false)} />}

      <div className="admin__main">
        <header className="admin__top">
          <button className="icon-btn admin__burger" onClick={() => setOpen(true)} aria-label="Open navigation">
            <FiMenu />
          </button>
          <div className="admin__status">
            <span className="live-dot" style={{ background: connected ? undefined : 'var(--danger)' }} />
            <span>{connected ? `Live · ${online} online` : 'Offline'}</span>
          </div>
          <div className="spacer" />
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>
          <div className="admin__me">
            <Avatar src={user.avatar} name={user.name} size="sm" />
            <div>
              <strong>{user.name}</strong>
              <small>@{user.username}</small>
            </div>
          </div>
          <button className="icon-btn icon-btn--danger" onClick={logout} aria-label="Sign out" title="Sign out">
            <FiLogOut />
          </button>
        </header>
        <div className="admin__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
