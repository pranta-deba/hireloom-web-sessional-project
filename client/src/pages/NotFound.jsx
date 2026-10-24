import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="container notfound">
      <span className="eyebrow">Error 404</span>
      <h1 className="display">
        This page took a <em>career break.</em>
      </h1>
      <p className="muted">The link may be broken, or the page may have moved.</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link to="/" className="btn btn--brand">
          Back home
        </Link>
        <Link to="/templates" className="btn btn--ghost">
          Browse templates
        </Link>
      </div>
    </section>
  );
}
