export default function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <div className="page-loader__mark">
        h<span>.</span>
      </div>
      <small className="eyebrow">{label}</small>
    </div>
  );
}
