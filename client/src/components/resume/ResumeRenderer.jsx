import { forwardRef, useEffect, useRef, useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiGlobe, FiLinkedin, FiGithub } from 'react-icons/fi';
import { fmtMonth, cn } from '../../lib/utils';

const LEVEL = { Beginner: 25, Intermediate: 50, Advanced: 75, Expert: 100 };
const range = (s, e, cur) => [fmtMonth(s), cur ? 'Present' : fmtMonth(e)].filter(Boolean).join(' – ');
const bullets = (t = '') =>
  String(t)
    .split('\n')
    .map((l) => l.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter(Boolean);

function Bullets({ text }) {
  const items = bullets(text);
  if (!items.length) return null;
  return (
    <ul className="rv-bullets">
      {items.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  );
}

function Contact({ p, stacked }) {
  const items = [
    [FiMail, p.email],
    [FiPhone, p.phone],
    [FiMapPin, p.location],
    [FiGlobe, p.website],
    [FiLinkedin, p.linkedin],
    [FiGithub, p.github],
  ].filter(([, v]) => v);
  return (
    <ul className={cn('rv-contact', stacked && 'rv-contact--stacked')}>
      {items.map(([Icon, v], i) => (
        <li key={i}>
          <Icon /> {v}
        </li>
      ))}
    </ul>
  );
}

const Section = ({ title, children, show = true }) =>
  show ? (
    <section className="rv-sec">
      <h3 className="rv-sec__title">{title}</h3>
      {children}
    </section>
  ) : null;

function Experience({ items, timeline }) {
  return items.map((e, i) => (
    <div key={i} className={cn('rv-item', timeline && 'rv-item--tl')}>
      <div className="rv-item__head">
        <div>
          <strong>{e.role}</strong>
          {e.company && <span className="rv-at"> · {e.company}</span>}
        </div>
        <span className="rv-date">{range(e.startDate, e.endDate, e.current)}</span>
      </div>
      {e.location && <div className="rv-sub">{e.location}</div>}
      <Bullets text={e.description} />
    </div>
  ));
}

function Education({ items }) {
  return items.map((e, i) => (
    <div key={i} className="rv-item">
      <div className="rv-item__head">
        <div>
          <strong>{[e.degree, e.field].filter(Boolean).join(' in ')}</strong>
        </div>
        <span className="rv-date">{range(e.startDate, e.endDate)}</span>
      </div>
      <div className="rv-sub">
        {e.school}
        {e.grade && ` · ${e.grade}`}
      </div>
    </div>
  ));
}

function Skills({ items, bars }) {
  if (bars)
    return (
      <div className="rv-bars">
        {items.map((s, i) => (
          <div key={i}>
            <span>{s.name}</span>
            <i>
              <b style={{ width: `${LEVEL[s.level] || 60}%` }} />
            </i>
          </div>
        ))}
      </div>
    );
  return (
    <div className="rv-chips">
      {items.map((s, i) => (
        <span key={i}>{s.name}</span>
      ))}
    </div>
  );
}

function Extras({ d }) {
  return (
    <>
      <Section title="Projects" show={d.projects?.length > 0}>
        {d.projects.map((p, i) => (
          <div key={i} className="rv-item">
            <div className="rv-item__head">
              <strong>{p.name}</strong>
              {p.link && <span className="rv-date">{p.link}</span>}
            </div>
            <p className="rv-p">{p.description}</p>
          </div>
        ))}
      </Section>
      <Section title="Publications" show={d.publications?.length > 0}>
        {d.publications?.map((p, i) => (
          <div key={i} className="rv-item">
            <strong>{p.title}</strong>
            <div className="rv-sub">
              {p.venue} {p.year && `· ${p.year}`}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}

function SideExtras({ d, bars }) {
  return (
    <>
      <Section title="Skills" show={d.skills?.length > 0}>
        <Skills items={d.skills} bars={bars} />
      </Section>
      <Section title="Languages" show={d.languages?.length > 0}>
        {d.languages.map((l, i) => (
          <div key={i} className="rv-kv">
            <span>{l.name}</span>
            <small>{l.proficiency}</small>
          </div>
        ))}
      </Section>
      <Section title="Certifications" show={d.certifications?.length > 0}>
        {d.certifications.map((c, i) => (
          <div key={i} className="rv-cert">
            <strong>{c.name}</strong>
            <small>
              {c.issuer} {c.date && `· ${fmtMonth(c.date)}`}
            </small>
          </div>
        ))}
      </Section>
      <Section title="Interests" show={d.interests?.filter(Boolean).length > 0}>
        <p className="rv-p">{d.interests.filter(Boolean).join(' · ')}</p>
      </Section>
    </>
  );
}

const Photo = ({ src, name }) => (src ? <img className="rv-photo" src={src} alt={name} crossOrigin="anonymous" /> : null);

/* ───────── Layouts ───────── */
function Classic({ d }) {
  const p = d.personal;
  return (
    <>
      <header className="rv-head">
        <div>
          <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
          <div className="rv-headline">{p.headline}</div>
          <Contact p={p} />
        </div>
        <Photo src={p.photo} name={p.fullName} />
      </header>
      <Section title="Profile" show={!!p.summary}>
        <p className="rv-p">{p.summary}</p>
      </Section>
      <Section title="Experience" show={d.experience?.length > 0}>
        <Experience items={d.experience} />
      </Section>
      <Section title="Education" show={d.education?.length > 0}>
        <Education items={d.education} />
      </Section>
      <Extras d={d} />
      <div className="rv-cols">
        <SideExtras d={d} />
      </div>
    </>
  );
}

function Sidebar({ d }) {
  const p = d.personal;
  return (
    <div className="rv-split">
      <aside className="rv-side">
        <Photo src={p.photo} name={p.fullName} />
        <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
        <div className="rv-headline">{p.headline}</div>
        <Section title="Contact">
          <Contact p={p} stacked />
        </Section>
        <SideExtras d={d} bars />
      </aside>
      <div className="rv-mainc">
        <Section title="Profile" show={!!p.summary}>
          <p className="rv-p">{p.summary}</p>
        </Section>
        <Section title="Experience" show={d.experience?.length > 0}>
          <Experience items={d.experience} />
        </Section>
        <Section title="Education" show={d.education?.length > 0}>
          <Education items={d.education} />
        </Section>
        <Extras d={d} />
      </div>
    </div>
  );
}

function Minimal({ d }) {
  const p = d.personal;
  return (
    <>
      <header className="rv-head rv-head--center">
        <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
        <div className="rv-headline">{p.headline}</div>
        <Contact p={p} />
      </header>
      {p.summary && <p className="rv-p rv-lead">{p.summary}</p>}
      <Section title="Experience" show={d.experience?.length > 0}>
        <Experience items={d.experience} />
      </Section>
      <Section title="Education" show={d.education?.length > 0}>
        <Education items={d.education} />
      </Section>
      <Extras d={d} />
      <div className="rv-cols">
        <SideExtras d={d} />
      </div>
    </>
  );
}

function Executive({ d }) {
  const p = d.personal;
  return (
    <>
      <header className="rv-band">
        <Photo src={p.photo} name={p.fullName} />
        <div>
          <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
          <div className="rv-headline">{p.headline}</div>
        </div>
      </header>
      <div className="rv-band-contact">
        <Contact p={p} />
      </div>
      <div className="rv-pad">
        <Section title="Executive summary" show={!!p.summary}>
          <p className="rv-p">{p.summary}</p>
        </Section>
        <Section title="Leadership experience" show={d.experience?.length > 0}>
          <Experience items={d.experience} />
        </Section>
        <div className="rv-cols">
          <div>
            <Section title="Education" show={d.education?.length > 0}>
              <Education items={d.education} />
            </Section>
            <Extras d={d} />
          </div>
          <div>
            <SideExtras d={d} bars />
          </div>
        </div>
      </div>
    </>
  );
}

function Creative({ d }) {
  const p = d.personal;
  return (
    <div className="rv-creative">
      <header className="rv-blob">
        <div>
          <span className="rv-hello">Hello, I’m</span>
          <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
          <div className="rv-headline">{p.headline}</div>
        </div>
        <Photo src={p.photo} name={p.fullName} />
      </header>
      <div className="rv-split rv-split--rev">
        <div className="rv-mainc">
          <Section title="About" show={!!p.summary}>
            <p className="rv-p">{p.summary}</p>
          </Section>
          <Section title="Experience" show={d.experience?.length > 0}>
            <Experience items={d.experience} />
          </Section>
          <Section title="Education" show={d.education?.length > 0}>
            <Education items={d.education} />
          </Section>
          <Extras d={d} />
        </div>
        <aside className="rv-side">
          <Section title="Contact">
            <Contact p={p} stacked />
          </Section>
          <SideExtras d={d} bars />
        </aside>
      </div>
    </div>
  );
}

function Timeline({ d }) {
  const p = d.personal;
  return (
    <>
      <header className="rv-head rv-head--line">
        <Photo src={p.photo} name={p.fullName} />
        <div>
          <h1 className="rv-name">{p.fullName || 'Your Name'}</h1>
          <div className="rv-headline">{p.headline}</div>
          <Contact p={p} />
        </div>
      </header>
      <Section title="Summary" show={!!p.summary}>
        <p className="rv-p">{p.summary}</p>
      </Section>
      <Section title="Career timeline" show={d.experience?.length > 0}>
        <div className="rv-tl">
          <Experience items={d.experience} timeline />
        </div>
      </Section>
      <div className="rv-cols">
        <div>
          <Section title="Education" show={d.education?.length > 0}>
            <Education items={d.education} />
          </Section>
          <Extras d={d} />
        </div>
        <div>
          <SideExtras d={d} bars />
        </div>
      </div>
    </>
  );
}

const LAYOUTS = { classic: Classic, sidebar: Sidebar, minimal: Minimal, executive: Executive, creative: Creative, timeline: Timeline };

/** A4 page (794×1123 CSS px). Theme colours/fonts come from the template, accent override from the resume. */
export const ResumeRenderer = forwardRef(function ResumeRenderer({ data, template, accentColor }, ref) {
  const theme = template?.theme || {};
  const Layout = LAYOUTS[template?.layout] || Classic;
  const d = { ...data, personal: data?.personal || {} };
  ['experience', 'education', 'skills', 'languages', 'projects', 'certifications', 'publications', 'interests'].forEach((k) => (d[k] = d[k] || []));
  return (
    <article
      ref={ref}
      className={`rv rv--${template?.layout || 'classic'}`}
      style={{
        '--rv-primary': accentColor || theme.primary || '#2F4BFF',
        '--rv-accent': theme.accent || '#FF6A3D',
        '--rv-font': `'${theme.font || 'Manrope'}', system-ui, sans-serif`,
        '--rv-head': `'${theme.headingFont || theme.font || 'Manrope'}', Georgia, serif`,
      }}
    >
      <Layout d={d} />
    </article>
  );
});

/** Scales an A4 resume to fit any container width (thumbnails, side previews). */
export function ResumeScaler({ children, maxScale = 1, className }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(Math.min(maxScale, entry.contentRect.width / 794)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxScale]);
  return (
    <div ref={box} className={cn('rv-scaler', className)} style={{ height: 1123 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 794 }}>{children}</div>
    </div>
  );
}
