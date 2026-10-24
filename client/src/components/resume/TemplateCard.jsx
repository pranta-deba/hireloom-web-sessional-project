import { FiEye, FiArrowRight } from 'react-icons/fi';
import { ResumeRenderer, ResumeScaler } from './ResumeRenderer';
import { SAMPLE_DATA } from './sampleData';

export default function TemplateCard({ template, data, onPreview, onUse, useLabel = 'Use template', badge }) {
  return (
    <article className="tpl-card">
      <div className="tpl-card__preview">
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} style={{ width: '100%', borderRadius: '10px 10px 0 0' }} loading="lazy" />
        ) : (
          <ResumeScaler>
            <ResumeRenderer data={data || SAMPLE_DATA} template={template} />
          </ResumeScaler>
        )}
        <div className="tpl-card__overlay">
          {onPreview && (
            <button className="btn btn--soft btn--sm" onClick={onPreview}>
              <FiEye /> Preview
            </button>
          )}
          {onUse && (
            <button className="btn btn--brand btn--sm" onClick={onUse}>
              {useLabel} <FiArrowRight />
            </button>
          )}
        </div>
      </div>
      <div className="tpl-card__body">
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ '--gap': '8px', marginBottom: 4 }}>
            <h4>{template.name}</h4>
            {badge}
          </div>
          <p>{template.description}</p>
        </div>
        <div className="tpl-card__swatch" aria-hidden>
          <i style={{ background: template.theme?.primary }} />
          <i style={{ background: template.theme?.accent }} />
        </div>
      </div>
    </article>
  );
}
