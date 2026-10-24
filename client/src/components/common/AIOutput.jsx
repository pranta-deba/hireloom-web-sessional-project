import { FiCopy, FiSquare, FiRefreshCw, FiCpu, FiCheck } from 'react-icons/fi';
import { useState } from 'react';
import { toast } from 'sonner';
import { Markdown } from './index';
import { cn } from '../../lib/utils';

const PROVIDERS = { openai: 'OpenAI', gemini: 'Google Gemini', 'openai-compatible': 'Custom model', local: 'Offline demo' };

/**
 * Professional AI response surface: connection state, shimmer while waiting,
 * live markdown with a typing caret, stop / regenerate / copy controls.
 */
export default function AIOutput({ stream, title = 'AI response', onRegenerate, markdown = true, placeholder, children, editable, onEdit }) {
  const { status, text, error, provider, stop } = stream;
  const [copied, setCopied] = useState(false);
  const steps = { connecting: 'Connecting to model…', streaming: 'Writing…', done: 'Complete', stopped: 'Stopped', error: 'Error', idle: 'Ready' };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className={cn('ai-out', `is-${status}`)}>
      <div className="ai-out__head">
        <div className="ai-out__title">
          <span className="ai-out__orb">
            <FiCpu />
          </span>
          <div>
            <strong>{title}</strong>
            <small>
              {status !== 'idle' && <i className="ai-out__dot" />}
              {steps[status]}
              {provider && ` · ${PROVIDERS[provider] || provider}`}
            </small>
          </div>
        </div>
        <div className="row" style={{ '--gap': '6px' }}>
          {(status === 'connecting' || status === 'streaming') && (
            <button className="btn btn--ghost btn--sm" onClick={stop}>
              <FiSquare /> Stop
            </button>
          )}
          {onRegenerate && (status === 'done' || status === 'stopped' || status === 'error') && (
            <button className="btn btn--ghost btn--sm" onClick={onRegenerate}>
              <FiRefreshCw /> Regenerate
            </button>
          )}
          {text && status !== 'streaming' && (
            <button className="btn btn--soft btn--sm" onClick={copy}>
              {copied ? <FiCheck /> : <FiCopy />} {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      <div className="ai-out__body">
        {status === 'idle' && !text && <div className="ai-out__placeholder">{placeholder}</div>}
        {status === 'connecting' && (
          <div className="ai-out__shimmer">
            <div className="skeleton" style={{ height: 14, width: '92%' }} />
            <div className="skeleton" style={{ height: 14, width: '78%' }} />
            <div className="skeleton" style={{ height: 14, width: '85%' }} />
            <div className="skeleton" style={{ height: 14, width: '40%' }} />
          </div>
        )}
        {status === 'error' && <div className="ai-out__error">{error}</div>}
        {text &&
          (editable && status !== 'streaming' ? (
            <textarea className="ai-out__editor" value={text} onChange={(e) => onEdit?.(e.target.value)} spellCheck />
          ) : markdown ? (
            <div className={cn(status === 'streaming' && 'is-typing')}>
              <Markdown compact>{text}</Markdown>
            </div>
          ) : (
            <div className={cn('ai-out__plain', status === 'streaming' && 'is-typing')}>{text}</div>
          ))}
      </div>
      {children}
    </div>
  );
}
