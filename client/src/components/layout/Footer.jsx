import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiFacebook, FiLinkedin, FiGithub, FiYoutube } from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';
import { toast } from 'sonner';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api, gql, errMsg } from '../../lib/api';
import { StarRating } from '../common';
import { Wordmark } from './Navbar';

/** Site-wide rating, updated in real time over WebSocket. */
function SiteRating() {
  const { requireAuth, user } = useAuth();
  const { socket } = useSocket();
  const [data, setData] = useState({ average: 0, count: 0, mine: null });
  const [review, setReview] = useState('');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api.get('/ratings/site').then(({ data: d }) => {
      setData(d);
      setReview(d.mine?.review || '');
    }).catch(() => {});
  }, [user?._id]);

  useEffect(() => {
    if (!socket) return undefined;
    const fn = (d) => setData((p) => ({ ...p, ...d }));
    socket.on('site:rating', fn);
    return () => socket.off('site:rating', fn);
  }, [socket]);

  const submit = async (value) => {
    try {
      const { data: d } = await api.post('/ratings/site', { value, review });
      setData(d);
      setPending(0);
      toast.success('Thanks for rating us!');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="footer__rate">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong style={{ color: '#fff', fontSize: '.9rem' }}>Rate your experience</strong>
        <small style={{ color: '#8a8f99' }}>
          {data.average.toFixed(1)} ★ · {data.count} ratings
        </small>
      </div>
      <div style={{ margin: '10px 0' }}>
        <StarRating value={pending || data.mine?.value || 0} onRate={requireAuth((v) => setPending(v), 'Sign in to rate HireLoom')} size="1.5rem" />
      </div>
      {pending > 0 && (
        <div className="footer__news" style={{ marginTop: 8 }}>
          <input value={review} onChange={(e) => setReview(e.target.value)} placeholder="Add a short review (optional)" maxLength={300} />
          <button className="btn btn--brand btn--sm" style={{ height: 48 }} onClick={() => submit(pending)}>
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  const { config } = useConfig();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const s = config.site;
  const year = new Date().getFullYear();

  const subscribe = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Newsletter sign-up goes through the GraphQL API
      const data = await gql('mutation Subscribe($email: String!) { subscribe(email: $email) { ok message } }', { email });
      if (data.subscribe.ok) {
        toast.success(data.subscribe.message);
        setEmail('');
      } else toast.error(data.subscribe.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const socials = [
    ['facebook', <FiFacebook key="f" />],
    ['linkedin', <FiLinkedin key="l" />],
    ['github', <FiGithub key="g" />],
    ['x', <FaXTwitter key="x" />],
    ['youtube', <FiYoutube key="y" />],
  ].filter(([k]) => s.social?.[k]);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <Wordmark name={s.name} />
            <p>{s.description}</p>
            <form className="footer__news" onSubmit={subscribe}>
              <input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email for newsletter" />
              <button className="btn btn--brand" style={{ height: 48 }} disabled={busy} aria-label="Subscribe">
                {busy ? <span className="spinner" /> : <FiArrowRight />}
              </button>
            </form>
            <SiteRating />
          </div>
          <div>
            <h5>Build</h5>
            <ul>
              <li><Link to="/templates">Templates</Link></li>
              <li><Link to="/builder/new">Résumé builder</Link></li>
              <li><Link to="/generate">AI generator</Link></li>
              <li><Link to="/ats">ATS checker</Link></li>
              <li><Link to="/cover-letter">Cover letters</Link></li>
            </ul>
          </div>
          <div>
            <h5>Learn</h5>
            <ul>
              <li><Link to="/blogs">Tech journal</Link></li>
              <li><Link to="/blogs/new">Write for us</Link></li>
              <li><Link to="/resources">Videos & audio</Link></li>
              <li><Link to="/ai-lab">AI Vision Lab</Link></li>
              <li><Link to="/developers">Developer APIs</Link></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><Link to="/contact">Contact</Link></li>
              <li><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></li>
              <li>{s.phone}</li>
              <li style={{ color: '#7c8290' }}>{s.address}</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="footer__giant" aria-hidden>
        {s.name?.match(/^([A-Z][a-z]+)([A-Z].*)$/) ? (
          <>
            {s.name.match(/^([A-Z][a-z]+)/)[1]}
            <i>{s.name.match(/^[A-Z][a-z]+(.*)$/)[1]}</i>
          </>
        ) : (
          s.name
        )}
      </div>
      <div className="container">
        <div className="footer__bottom">
          <span>
            © {year} {s.name}. Crafted for ambitious careers.
          </span>
          <div className="footer__social">
            {socials.map(([k, icon]) => (
              <a key={k} href={s.social[k]} target="_blank" rel="noreferrer" aria-label={k}>
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
