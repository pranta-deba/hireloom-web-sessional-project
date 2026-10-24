import { useConfig } from '../context/ConfigContext';
import { useReveal } from '../hooks/useReveal';
import { YouTubeEmbed, AudioPlayer, EmptyState } from '../components/common';
import { FiVideo, FiHeadphones } from 'react-icons/fi';

export default function Resources() {
  const { config } = useConfig();
  const { videos = [], audios = [] } = config.media || {};
  const scope = useReveal([videos.length, audios.length]);

  return (
    <div ref={scope}>
      <section className="page-head container">
        <span className="eyebrow">Resources</span>
        <h1 className="display">
          Learn on the go — <em>watch or listen.</em>
        </h1>
        <p>Hand-picked talks streamed from YouTube and focus audio streamed from external hosts. Curated by the editors from the admin dashboard.</p>
      </section>

      <section className="container">
        <div className="sec-head">
          <h2 className="row" style={{ fontSize: '1.5rem' }}>
            <FiVideo /> Video library
          </h2>
        </div>
        {videos.length ? (
          <div className="grid-2" data-stagger>
            {videos.map((v) => (
              <div key={v.youtubeId} className="video-card">
                <YouTubeEmbed url={v.youtubeId} title={v.title} />
                <div>
                  <strong>{v.title}</strong>
                  <small className="muted">{v.channel}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<FiVideo />} title="No videos yet" text="Admins can add YouTube videos from Settings → Media." />
        )}
      </section>

      <section className="container section" style={{ paddingTop: 70 }}>
        <div className="sec-head">
          <h2 className="row" style={{ fontSize: '1.5rem' }}>
            <FiHeadphones /> Focus & interview-prep audio
          </h2>
        </div>
        {audios.length ? (
          <div className="stack" data-stagger>
            {audios.map((a) => (
              <AudioPlayer key={a.url} src={a.url} title={a.title} artist={a.artist} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<FiHeadphones />} title="No audio yet" text="Admins can add audio streams from Settings → Media." />
        )}
      </section>
    </div>
  );
}
