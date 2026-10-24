import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiDownload, FiEdit3, FiCopy, FiEye, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'sonner';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ResumeRenderer, ResumeScaler } from '../components/resume/ResumeRenderer';
import { PageLoader, EmptyState, Avatar } from '../components/common';

export default function ResumeView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requireAuth } = useAuth();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    api
      .get(`/resumes/${id}`)
      .then(({ data }) => setState({ loading: false, ...data }))
      .catch((e) => setState({ loading: false, error: errMsg(e) }));
  }, [id]);

  if (state.loading) return <PageLoader />;
  if (state.error)
    return (
      <div className="container section">
        <EmptyState icon={<FiEye />} title="Résumé unavailable" text={state.error} action={<Link to="/templates" className="btn btn--brand">Browse templates</Link>} />
      </div>
    );

  const { resume, isOwner } = state;
  const useIt = requireAuth(() => navigate(`/builder/new?sample=${resume._id}`), 'Sign in to use this example');

  return (
    <div className="container" style={{ paddingBottom: 60 }}>
      <div className="print-area">
        <ResumeRenderer data={resume.data} template={resume.template} accentColor={resume.accentColor} />
      </div>
      <div className="view-head">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Back">
          <FiArrowLeft />
        </button>
        <div>
          <span className="eyebrow">{resume.isSample ? 'Example résumé' : resume.kind === 'cv' ? 'CV' : 'Résumé'}</span>
          <h1>{resume.title}</h1>
          <div className="row muted" style={{ '--gap': '10px', fontSize: '.85rem' }}>
            {resume.user && !resume.isSample && (
              <Link to={`/u/${resume.user.username}`} className="row" style={{ '--gap': '6px' }}>
                <Avatar src={resume.user.avatar} name={resume.user.name} size="sm" /> {resume.user.name}
              </Link>
            )}
            <span>Template: {resume.template?.name}</span>
            <span>
              <FiEye /> {resume.views} views
            </span>
          </div>
        </div>
        <div className="spacer" />
        <div className="row" style={{ '--gap': '8px' }}>
          {isOwner && (
            <Link to={`/builder/${resume._id}`} className="btn btn--ghost btn--sm">
              <FiEdit3 /> Edit
            </Link>
          )}
          {resume.isSample && (
            <button className="btn btn--brand btn--sm" onClick={useIt}>
              <FiCopy /> Use this example
            </button>
          )}
          <button
            className="btn btn--soft btn--sm"
            onClick={() => {
              window.print();
              toast('Choose “Save as PDF” in the print dialog');
            }}
          >
            <FiDownload /> PDF
          </button>
        </div>
      </div>
      <div className="view-paper">
        <ResumeScaler>
          <ResumeRenderer data={resume.data} template={resume.template} accentColor={resume.accentColor} />
        </ResumeScaler>
      </div>
    </div>
  );
}
