import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FiSearch, FiArrowRight, FiEye } from 'react-icons/fi';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks';
import { useReveal } from '../hooks/useReveal';
import TemplateCard from '../components/resume/TemplateCard';
import { ResumeRenderer, ResumeScaler } from '../components/resume/ResumeRenderer';
import { SAMPLE_DATA } from '../components/resume/sampleData';
import { Modal, Pagination, EmptyState } from '../components/common';
import { LAYOUTS } from '../lib/constants';

export default function Templates() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const [category, setCategory] = useState(params.get('category') || '');
  const [layout, setLayout] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState([]);
  const [preview, setPreview] = useState(null);
  const q = useDebounce(search, 350);
  const scope = useReveal([samples.length]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/templates', { params: { category: category || undefined, layout: layout || undefined, search: q || undefined, page, limit: 9 } })
      .then(({ data: d }) => setData(d))
      .finally(() => setLoading(false));
  }, [category, layout, q, page]);

  useEffect(() => {
    api.get('/resumes/samples').then(({ data: d }) => setSamples(d.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const slug = params.get('preview');
    if (slug) api.get(`/templates/${slug}`).then(({ data: d }) => setPreview(d.template)).catch(() => {});
  }, [params]);

  const use = requireAuth((slug) => navigate(`/builder/new?template=${slug}`), 'Sign in to use this template');
  const useSample = requireAuth((id) => navigate(`/builder/new?sample=${id}`), 'Sign in to start from this example');

  return (
    <div ref={scope}>
      <section className="page-head container">
        <span className="eyebrow">Template library</span>
        <h1 className="display">
          Pick a look. <em>Keep your content.</em>
        </h1>
        <p>Every template is ATS-parsable and fully editable. Switch designs anytime — your words stay put.</p>
      </section>

      <section className="container">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {[
              ['', 'All'],
              ['resume', 'Résumés'],
              ['cv', 'CVs'],
            ].map(([v, l]) => (
              <button
                key={v}
                className={category === v ? 'is-active' : ''}
                onClick={() => {
                  setCategory(v);
                  setPage(1);
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <select
            className="select"
            style={{ maxWidth: 200 }}
            value={layout}
            onChange={(e) => {
              setLayout(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by layout"
          >
            <option value="">All layouts</option>
            {LAYOUTS.map((l) => (
              <option key={l} value={l}>
                {l[0].toUpperCase() + l.slice(1)}
              </option>
            ))}
          </select>
          <div className="input-group" style={{ flex: 1, minWidth: 200, maxWidth: 340 }}>
            <span className="input-group__icon">
              <FiSearch />
            </span>
            <input
              className="input"
              placeholder="Search templates"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: 420, borderRadius: 24 }} />
            ))}
          </div>
        ) : data.items.length ? (
          <div className="grid-3">
            {data.items.map((t) => (
              <TemplateCard key={t._id} template={t} onPreview={() => setPreview(t)} onUse={() => use(t.slug)} badge={t.category === 'cv' ? <span className="badge badge--accent">CV</span> : t.isFeatured ? <span className="badge badge--brand">Popular</span> : null} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<FiSearch />} title="No templates match" text="Try another layout or clear your search." />
        )}
        <Pagination page={page} pages={data.pages} total={data.total} label="templates" onChange={setPage} />
      </section>

      {samples.length > 0 && (
        <section className="section container">
          <div className="sec-head" data-reveal>
            <div>
              <span className="eyebrow">Examples</span>
              <h2 className="display">
                Start from a <em>proven</em> résumé.
              </h2>
            </div>
            <p>Real-world examples you can duplicate and make your own in one click.</p>
          </div>
          <div className="grid-4" data-stagger>
            {samples.map((s) => (
              <article key={s._id} className="sample-card">
                <Link to={`/resumes/${s._id}`} className="sample-card__preview">
                  <ResumeScaler>
                    <ResumeRenderer data={s.data} template={s.template} />
                  </ResumeScaler>
                </Link>
                <div className="sample-card__body">
                  <strong>{s.title}</strong>
                  <small>
                    {s.template?.name} · {s.views} views
                  </small>
                  <div className="row" style={{ '--gap': '6px', marginTop: 10 }}>
                    <Link to={`/resumes/${s._id}`} className="btn btn--ghost btn--sm">
                      <FiEye /> View
                    </Link>
                    <button className="btn btn--brand btn--sm" onClick={() => useSample(s._id)}>
                      Use <FiArrowRight />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={!!preview}
        onClose={() => {
          setPreview(null);
          if (params.get('preview')) setParams({});
        }}
        title={preview?.name}
        width={760}
        footer={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => setPreview(null)}>
              Close
            </button>
            <button className="btn btn--brand btn--sm" onClick={() => use(preview.slug)}>
              Use this template <FiArrowRight />
            </button>
          </>
        }
      >
        {preview && (
          <div className="preview-frame">
            <ResumeScaler>
              <ResumeRenderer data={SAMPLE_DATA} template={preview} />
            </ResumeScaler>
          </div>
        )}
      </Modal>
    </div>
  );
}
