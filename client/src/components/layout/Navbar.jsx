import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiSun, FiMoon, FiChevronDown, FiFileText, FiZap, FiTarget, FiEdit3, FiCpu, FiCode, FiGrid, FiSettings, FiLogOut, FiShield, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { useConfig } from '../../context/ConfigContext';
import { useClickOutside } from '../../hooks';
import { Avatar } from '../common';
import { gsap } from '../../hooks/useReveal';

export const TOOLS = [
  { to: '/templates', icon: <FiFileText />, color: '#2F4BFF', short: 'Builder', title: 'Résumé & CV builder', text: 'Professional templates with live preview' },
  { to: '/generate', icon: <FiZap />, color: '#FF6A3D', short: 'AI Generator', title: 'AI résumé generator', text: 'A full draft from a 60-second brief' },
  { to: '/ats', icon: <FiTarget />, color: '#0F9F75', short: 'ATS Checker', title: 'ATS checker', text: 'Score, keyword gaps and fixes' },
  { to: '/cover-letter', icon: <FiEdit3 />, color: '#7C3AED', short: 'Cover Letters', title: 'Cover letter studio', text: 'Tailored letters, streamed live' },
  { to: '/ai-lab', icon: <FiCpu />, color: '#0369A1', short: 'Vision Lab', title: 'AI Vision Lab', text: 'Real-time TensorFlow Lite predictions' },
  { to: '/developers', icon: <FiCode />, color: '#15171C', short: 'Developers', title: 'Developer APIs', text: 'REST, GraphQL & SOAP playground' },
];

export function Wordmark({ name = 'HireLoom' }) {
  // Split "HireLoom" → Hire + italic Loom; any custom name renders as-is
  const m = name.match(/^([A-Z][a-z]+)([A-Z].*)$/);
  return (
    <span className="wordmark">
      {m ? (
        <>
          {m[1]}
          <i>{m[2]}</i>
        </>
      ) : (
        name
      )}
      <b>.</b>
    </span>
  );
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const { online } = useSocket();
  const { config } = useConfig();
  const [scrolled, setScrolled] = useState(false);
  const [tools, setTools] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const toolsRef = useRef(null);
  const menuRef = useRef(null);
  const sheetRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setTools(false);
    setMenu(false);
    setSheet(false);
  }, [pathname]);

  useClickOutside(toolsRef, useCallback(() => setTools(false), []));
  useClickOutside(menuRef, useCallback(() => setMenu(false), []));

  useEffect(() => {
    if (!sheet || !sheetRef.current) return undefined;
    document.body.style.overflow = 'hidden';
    const ctx = gsap.context(() => {
      gsap.from(sheetRef.current, { clipPath: 'circle(0% at 95% 4%)', duration: 0.6, ease: 'power3.inOut' });
      gsap.from('.sheet__links a', { y: 40, opacity: 0, stagger: 0.05, delay: 0.2, duration: 0.5, ease: 'power3.out' });
    }, sheetRef);
    return () => {
      document.body.style.overflow = '';
      ctx.revert();
    };
  }, [sheet]);

  const links = [
    { to: '/templates', label: 'Templates' },
    { to: '/blogs', label: 'Journal' },
    { to: '/resources', label: 'Resources' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <>
      {config.site.announcement && <div className="announce">{config.site.announcement}</div>}
      <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="nav__bar">
          <Link to="/" aria-label={`${config.site.name} home`}>
            <Wordmark name={config.site.name} />
          </Link>

          <nav className="nav__links" aria-label="Primary">
            <div ref={toolsRef} style={{ position: 'relative' }}>
              <button onClick={() => setTools((v) => !v)} aria-expanded={tools} className={TOOLS.some((t) => pathname.startsWith(t.to)) ? 'active' : ''}>
                Tools <FiChevronDown style={{ transform: tools ? 'rotate(180deg)' : 'none', transition: 'transform .3s' }} />
              </button>
              {tools && (
                <div className="mega" role="menu">
                  {TOOLS.map((t) => (
                    <Link key={t.to} to={t.to} role="menuitem">
                      <span className="mega__icon" style={{ background: t.color }}>
                        {t.icon}
                      </span>
                      <span>
                        <strong>{t.title}</strong>
                        <small>{t.text}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="nav__right">
            <span className="nav__online" title="People online right now">
              <span className="live-dot" /> {online} online
            </span>
            <button className="icon-btn" onClick={toggle} aria-label="Toggle colour theme">
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>

            {user ? (
              <div className="nav__user" ref={menuRef}>
                <button onClick={() => setMenu((v) => !v)} aria-expanded={menu}>
                  <Avatar src={user.avatar} name={user.name} size="sm" />
                  <span>{user.name.split(' ')[0]}</span>
                </button>
                {menu && (
                  <div className="menu" role="menu">
                    <div className="menu__head">
                      <strong>{user.name}</strong>
                      <small>@{user.username}</small>
                    </div>
                    <Link to="/dashboard">
                      <FiGrid /> Dashboard
                    </Link>
                    <Link to="/builder/new">
                      <FiPlus /> New résumé
                    </Link>
                    <Link to="/blogs/new">
                      <FiEdit3 /> Write a post
                    </Link>
                    <Link to="/settings">
                      <FiSettings /> Profile settings
                    </Link>
                    {isAdmin && (
                      <Link to="/admin">
                        <FiShield /> Admin dashboard
                      </Link>
                    )}
                    <hr />
                    <button onClick={logout}>
                      <FiLogOut /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav__auth">
                <Link to="/login" className="btn btn--ghost btn--sm">
                  Sign in
                </Link>
                <Link to="/register" className="btn btn--brand btn--sm">
                  Get started
                </Link>
              </div>
            )}

            <button className="icon-btn nav__burger" onClick={() => setSheet(true)} aria-label="Open menu">
              <FiMenu />
            </button>
          </div>
        </div>
      </header>

      {sheet && (
        <div className="sheet" ref={sheetRef}>
          <div className="sheet__top">
            <Wordmark name={config.site.name} />
            <button className="icon-btn" onClick={() => setSheet(false)} aria-label="Close menu">
              <FiX />
            </button>
          </div>
          <nav className="sheet__links">
            {[...TOOLS.map((t) => ({ to: t.to, label: t.short, tag: 'tool' })), ...links.map((l) => ({ ...l, tag: 'page' }))].map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label} <small>{l.tag}</small>
              </Link>
            ))}
          </nav>
          <div className="sheet__foot">
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn--brand btn--block">
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="btn btn--ghost btn--block">
                    Admin
                  </Link>
                )}
                <button className="btn btn--ghost btn--block" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn--brand btn--block btn--lg">
                  Create free account
                </Link>
                <Link to="/login" className="btn btn--ghost btn--block">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
