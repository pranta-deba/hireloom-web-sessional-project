import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight, FiTarget, FiZap, FiEdit3, FiBookOpen, FiCpu, FiCode, FiCheck, FiFileText, FiStar } from 'react-icons/fi';
import { api, gql } from '../lib/api';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import { useReveal, gsap, useGSAP } from '../hooks/useReveal';
import { ResumeRenderer, ResumeScaler } from '../components/resume/ResumeRenderer';
import TemplateCard from '../components/resume/TemplateCard';
import { Avatar, StarRating, YouTubeEmbed } from '../components/common';
import BlogCard from '../components/blog/BlogCard';
import { compact } from '../lib/utils';

function HeroTitle({ text }) {
  // Italicise the last two words for an editorial accent
  const words = (text || '').split(' ');
  const tail = words.splice(-2).join(' ');
  return (
    <h1 className="display hero__title">
      {words.map((w, i) => (
        <span key={i} className="hero__word">
          <span>{w}&nbsp;</span>
        </span>
      ))}
      <span className="hero__word">
        <em>{tail}</em>
      </span>
    </h1>
  );
}

function Hero({ samples, rating }) {
  const { config } = useConfig();
  const ref = useRef(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        tl.from('.hero__word > *', { yPercent: 110, duration: 1.1, stagger: 0.06 })
          .from('.hero__sub, .hero__cta, .hero__trust', { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.7')
          .from('.hero__chip', { scale: 0.6, opacity: 0, duration: 0.6, stagger: 0.12, ease: 'back.out(2)' }, '-=0.3');
        gsap.to('.hero__chip', { y: (i) => (i % 2 ? -10 : 10), duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: 0.4, delay: 1.5 });
        gsap.to('.hero__ring circle.fg', { strokeDashoffset: 2 * Math.PI * 34 * (1 - 0.92), duration: 2, delay: 1.2, ease: 'power2.out' });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );
  // résumé sheets arrive after the API call — animate them separately
  useGSAP(
    () => {
      if (!samples.length) return undefined;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.hero__sheet', { y: 120, opacity: 0, rotate: (i) => [-14, 8, -4][i] || 0, duration: 1.2, stagger: 0.12, ease: 'power4.out' });
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [samples.length] }
  );

  return (
    <section className="hero grain" ref={ref}>
      <div className="container hero__grid">
        <div className="hero__copy">
          <span className="eyebrow">AI career workspace · built for ATS</span>
          <HeroTitle text={config.site.heroTitle} />
          <p className="hero__sub">{config.site.heroSubtitle}</p>
          <div className="hero__cta">
            <Link to="/templates" className="btn btn--brand btn--lg">
              Build my résumé <FiArrowRight />
            </Link>
            <Link to="/ats" className="btn btn--ghost btn--lg">
              <FiTarget /> Check ATS score
            </Link>
          </div>
          <div className="hero__trust">
            <div className="hero__avatars">
              {(rating.reviews || []).slice(0, 4).map((r) => (
                <Avatar key={r._id} src={r.user?.avatar} name={r.user?.name} size="sm" />
              ))}
            </div>
            <div>
              <StarRating value={rating.average} size="0.95rem" />
              <small>
                Rated <b>{rating.average?.toFixed(1)}</b> by {rating.count} members
              </small>
            </div>
          </div>
        </div>

        <div className="hero__visual" aria-hidden>
          {samples.slice(0, 3).map((s, i) => (
            <div key={s._id} className={`hero__sheet hero__sheet--${i}`}>
              <ResumeScaler>
                <ResumeRenderer data={s.data} template={s.template} />
              </ResumeScaler>
            </div>
          ))}
          <div className="hero__chip hero__chip--ats">
            <svg className="hero__ring" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" />
              <circle className="fg" cx="40" cy="40" r="34" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34} />
            </svg>
            <div>
              <strong>92</strong>
              <small>ATS score</small>
            </div>
          </div>
          <div className="hero__chip hero__chip--letter">
            <span className="hero__chip-icon">
              <FiEdit3 />
            </span>
            <div>
              <strong>Cover letter ready</strong>
              <small>Tailored to “Senior React Dev”</small>
            </div>
          </div>
          <div className="hero__chip hero__chip--kw">
            <FiCheck /> React · TypeScript · GraphQL
          </div>
        </div>
      </div>
    </section>
  );
}

const MARQUEE = ['Software Engineer', 'Data Scientist', 'Product Designer', 'DevOps Engineer', 'Fire Safety Engineer', 'Marketing Lead', 'HVAC Specialist', 'ML Engineer', 'Project Manager', 'Security Analyst'];

function Marquee() {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const half = track.scrollWidth / 2;
    // প্রতি সেকেন্ডে 30px সরাতে চাইলে: duration = half / 30
    const pxPerSec = 30;   // এই সংখ্যাটি যত ছোট, তত ধীর
    const duration = half / pxPerSec;

    const tween = gsap.to(track, {
      x: -half,
      duration,
      ease: 'none',
      repeat: -1,
      modifiers: {
        x: gsap.utils.unitize((x) => parseFloat(x) % half),
      },
    });

    return () => tween.kill();
  }, []);

  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__track" ref={trackRef} style={{ animation: 'none' }}>
        {[...MARQUEE, ...MARQUEE].map((m, i) => (
          <span key={i}>{m} <FiStar /></span>
        ))}
      </div>
    </div>
  );
}

function Bento() {
  const typing = 'Dear Hiring Manager, I was genuinely excited to see the Senior React Developer opening…';
  const [typed, setTyped] = useState('');
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % (typing.length + 30);
      setTyped(typing.slice(0, i));
    }, 55);
    return () => clearInterval(t);
  }, []);

  const scope = useReveal();
  return (
    <section className="section" ref={scope}>
      <div className="container">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">One workspace, every step</span>
            <h2 className="display">
              Everything between <em>“I should apply”</em> and the offer.
            </h2>
          </div>
          <p>Six tools that share one profile, one set of documents and one honest feedback loop.</p>
        </div>

        <div className="bento" data-stagger>
          <Link to="/ats" className="bento__card bento__card--ats">
            <div className="bento__icon" style={{ background: '#0F9F75' }}>
              <FiTarget />
            </div>
            <h3>ATS checker</h3>
            <p>Upload a PDF or DOCX, paste the job post, get a score, missing keywords and line-by-line AI fixes.</p>
            <div className="bento__meter">
              {[
                ['Keyword match', 82],
                ['Sections', 100],
                ['Quantified impact', 64],
                ['Action verbs', 90],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <i>
                    <b style={{ width: `${v}%` }} />
                  </i>
                  <small>{v}%</small>
                </div>
              ))}
            </div>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/templates" className="bento__card bento__card--builder">
            <div className="bento__icon" style={{ background: '#2F4BFF' }}>
              <FiFileText />
            </div>
            <h3>Résumé & CV builder</h3>
            <p>Live preview, drag-free sections, date pickers, one-click template switching and pixel-perfect PDF.</p>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/cover-letter" className="bento__card bento__card--letter">
            <div className="bento__icon" style={{ background: '#7C3AED' }}>
              <FiEdit3 />
            </div>
            <h3>Cover letter studio</h3>
            <div className="bento__typing">
              {typed}
              <i />
            </div>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/generate" className="bento__card bento__card--gen">
            <div className="bento__icon" style={{ background: '#FF6A3D' }}>
              <FiZap />
            </div>
            <h3>AI résumé generator</h3>
            <p>Answer five questions — get a complete, quantified first draft in your favourite template.</p>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/blogs" className="bento__card">
            <div className="bento__icon" style={{ background: '#15171C' }}>
              <FiBookOpen />
            </div>
            <h3>Community journal</h3>
            <p>Tech articles by members, reviewed by editors. Real-time comments, reactions and ratings.</p>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/ai-lab" className="bento__card">
            <div className="bento__icon" style={{ background: '#0369A1' }}>
              <FiCpu />
            </div>
            <h3>AI Vision Lab</h3>
            <p>TensorFlow Lite running in your browser — real-time predictions, zero uploads.</p>
            <FiArrowUpRight className="bento__go" />
          </Link>

          <Link to="/developers" className="bento__card bento__card--dev">
            <div className="bento__icon" style={{ background: '#444' }}>
              <FiCode />
            </div>
            <h3>Open APIs</h3>
            <code>REST · GraphQL · SOAP</code>
            <FiArrowUpRight className="bento__go" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    gql('{ siteStats { users blogs resumes templates } }').then((d) => setStats(d.siteStats)).catch(() => {});
  }, []);
  useGSAP(
    () => {
      if (!stats) return;
      gsap.utils.toArray('.stats__num').forEach((el) => {
        const end = Number(el.dataset.value);
        const obj = { v: 0 };
        gsap.to(obj, { v: end, duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => (el.textContent = compact(Math.round(obj.v))) });
      });
    },
    { scope: ref, dependencies: [stats] }
  );
  const items = [
    ['users', 'Members building careers'],
    ['resumes', 'Résumés & CVs created'],
    ['templates', 'Professional templates'],
    ['blogs', 'Published articles'],
  ];
  return (
    <section className="stats" ref={ref}>
      <div className="container stats__grid">
        {items.map(([k, label]) => (
          <div key={k}>
            <span className="stats__num display" data-value={stats?.[k] || 0}>
              0
            </span>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function TemplateShowcase() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    api.get('/templates', { params: { limit: 6 } }).then(({ data }) => setItems(data.items)).catch(() => {});
  }, []);
  const scope = useReveal([items.length]);
  return (
    <section className="section" style={{ paddingTop: 0 }} ref={scope}>
      <div className="container">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">Templates</span>
            <h2 className="display">
              Designed by typographers. <em>Parsed by robots.</em>
            </h2>
          </div>
          <Link to="/templates" className="btn btn--ghost">
            All templates <FiArrowRight />
          </Link>
        </div>
        <div className="grid-3" data-stagger>
          {items.map((t) => (
            <TemplateCard key={t._id} template={t} onUse={() => navigate(`/builder/new?template=${t.slug}`)} onPreview={() => navigate(`/templates?preview=${t.slug}`)} badge={t.category === 'cv' ? <span className="badge badge--accent">CV</span> : null} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Journal() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    api.get('/blogs', { params: { limit: 3 } }).then(({ data }) => setPosts(data.items)).catch(() => {});
  }, []);
  const scope = useReveal([posts.length]);
  return (
    <section className="section journal-band" ref={scope} hidden={!posts.length}>
      <div className="container">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">From the journal</span>
            <h2 className="display">
              Notes from people who <em>ship.</em>
            </h2>
          </div>
          <Link to="/blogs" className="btn btn--ghost">
            Read the journal <FiArrowRight />
          </Link>
        </div>
        <div className="grid-3" data-stagger>
          {posts.map((p) => (
            <BlogCard key={p._id} post={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoSpotlight() {
  const { config } = useConfig();
  const videos = config.media?.videos || [];
  const [active, setActive] = useState(0);
  const scope = useReveal([videos.length]);
  const v = videos[active] || videos[0];
  if (!v) return null;
  return (
    <section className="section" style={{ paddingTop: 0 }} ref={scope}>
      <div className="container">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">Watch & learn</span>
            <h2 className="display">
              Ten minutes that <em>level you up.</em>
            </h2>
          </div>
          <Link to="/resources" className="btn btn--ghost">
            All resources <FiArrowRight />
          </Link>
        </div>
        <div className="spotlight" data-reveal>
          <YouTubeEmbed key={v.youtubeId} url={v.youtubeId} title={v.title} />
          <ol className="spotlight__list">
            {videos.map((x, i) => (
              <li key={x.youtubeId}>
                <button className={i === active ? 'is-active' : ''} onClick={() => setActive(i)}>
                  <span className="mono">0{i + 1}</span>
                  <span>
                    <strong>{x.title}</strong>
                    <small>{x.channel}</small>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Testimonials({ rating }) {
  const scope = useReveal([rating.reviews?.length || 0]);
  return (
    <section className="section testimonials" ref={scope} hidden={!rating.reviews?.length}>
      <div className="container">
        <div className="sec-head" data-reveal>
          <div>
            <span className="eyebrow">Members say</span>
            <h2 className="display">
              <em>{rating.average?.toFixed(1)}</em> out of five, from {rating.count} real ratings.
            </h2>
          </div>
        </div>
        <div className="quotes" data-stagger>
          {rating.reviews.slice(0, 6).map((r) => (
            <figure key={r._id} className="quote">
              <StarRating value={r.value} size="0.9rem" />
              <blockquote>“{r.review}”</blockquote>
              <figcaption>
                <Avatar src={r.user?.avatar} name={r.user?.name} size="sm" />
                <span>
                  <strong>{r.user?.name}</strong>
                  <small>{r.user?.headline}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { user } = useAuth();
  const scope = useReveal();
  return (
    <section className="section" style={{ paddingBottom: 40 }} ref={scope}>
      <div className="container">
        <div className="cta-band grain" data-reveal>
          <span className="eyebrow" style={{ color: 'rgba(255,255,255,.7)' }}>
            Free forever for job seekers
          </span>
          <h2 className="display">
            Your next role is one <em>great document</em> away.
          </h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to={user ? '/builder/new' : '/register'} className="btn btn--accent btn--lg">
              {user ? 'Start a new résumé' : 'Create my free account'} <FiArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [samples, setSamples] = useState([]);
  const [rating, setRating] = useState({ average: 0, count: 0, reviews: [] });
  useEffect(() => {
    api.get('/resumes/samples').then(({ data }) => setSamples(data.items)).catch(() => {});
    api.get('/ratings/site').then(({ data }) => setRating(data)).catch(() => {});
  }, []);

  return (
    <div>
      <Hero samples={samples} rating={rating} />
      <Marquee />
      <Bento />
      <Stats />
      <TemplateShowcase />
      <Journal />
      <VideoSpotlight />
      <Testimonials rating={rating} />
      <CTA />
    </div>
  );
}
