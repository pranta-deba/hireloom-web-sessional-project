import { Outlet, Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatWidget from '../chat/ChatWidget';
import { Modal } from '../common';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useLocation } from 'react-router-dom';

/** Shown whenever a guest tries an action that needs an account. */
function AuthGate() {
  const { gateOpen, setGateOpen, gateReason } = useAuth();
  const { config } = useConfig();
  const { pathname, search } = useLocation();
  const next = encodeURIComponent(pathname + search);
  return (
    <Modal open={gateOpen} onClose={() => setGateOpen(false)} width={440}>
      <div className="gate">
        <div className="gate__icon">
          <FiLock />
        </div>
        <h3>{gateReason || 'Sign in to continue'}</h3>
        <p>Browsing is free for everyone. Create a free {config.site.name} account to build, save, comment, rate and use every AI tool.</p>
        <div className="stack" style={{ '--gap': '10px' }}>
          <Link to={`/register?next=${next}`} className="btn btn--brand btn--lg btn--block" onClick={() => setGateOpen(false)}>
            Create free account
          </Link>
          <Link to={`/login?next=${next}`} className="btn btn--ghost btn--block" onClick={() => setGateOpen(false)}>
            I already have an account
          </Link>
        </div>
      </div>
    </Modal>
  );
}

export default function Layout() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
      <AuthGate />
    </>
  );
}
