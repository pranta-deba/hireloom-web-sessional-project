import { useEffect, useRef, useState } from 'react';
import { FiMessageCircle, FiX, FiSend, FiSquare, FiTrash2, FiCpu } from 'react-icons/fi';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useAIStream } from '../../hooks';
import { Markdown, Avatar } from '../common';
import { cn } from '../../lib/utils';

/** Floating career assistant — tokens stream over WebSocket and history persists per user. */
export default function ChatWidget() {
  const { config } = useConfig();
  const { user, requireAuth } = useAuth();
  const { socket, connected } = useSocket();
  const ai = useAIStream();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const scroller = useRef(null);
  const bot = config.chatbot || {};

  useEffect(() => {
    if (!open || !user || !socket || !connected || loaded) return;
    socket.emit('chat:history', {}, (res) => {
      setMessages(res?.messages || []);
      setLoaded(true);
    });
  }, [open, user, socket, connected, loaded]);

  useEffect(() => setLoaded(false), [user?._id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, ai.text]);

  if (!bot.enabled) return null;

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || ai.busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    try {
      const full = await ai.start('chat', { message: msg });
      if (full) setMessages((m) => [...m, { role: 'assistant', content: full }]);
      ai.reset();
    } catch {
      /* error rendered from ai.error */
    }
  };

  const clear = () => socket?.emit('chat:clear', {}, () => setMessages([]));

  return (
    <>
      <button className={cn('chat-fab', open && 'is-open')} onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close assistant' : `Chat with ${bot.name}`}>
        {open ? <FiX /> : <FiMessageCircle />}
        {!open && <span className="chat-fab__label">Ask {bot.name}</span>}
      </button>

      {open && (
        <section className="chat" aria-label={`${bot.name} assistant`}>
          <header className="chat__head">
            <div className="chat__bot">
              <span className="chat__orb">
                <FiCpu />
              </span>
              <div>
                <strong>{bot.name}</strong>
                <small>
                  <span className="live-dot" style={{ background: connected ? undefined : 'var(--muted)' }} /> {connected ? (config.ai?.ready ? 'Online · live AI' : 'Online · demo mode') : 'Reconnecting…'}
                </small>
              </div>
            </div>
            {user && messages.length > 0 && (
              <button className="icon-btn" onClick={clear} title="Clear conversation" aria-label="Clear conversation">
                <FiTrash2 />
              </button>
            )}
          </header>

          <div className="chat__body" ref={scroller}>
            <div className="chat__msg chat__msg--bot">
              <Markdown compact>{bot.greeting}</Markdown>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={cn('chat__msg', m.role === 'user' ? 'chat__msg--me' : 'chat__msg--bot')}>
                {m.role === 'user' ? m.content : <Markdown compact>{m.content}</Markdown>}
              </div>
            ))}
            {ai.status === 'connecting' && (
              <div className="chat__msg chat__msg--bot chat__typing" aria-label="Assistant is typing">
                <i />
                <i />
                <i />
              </div>
            )}
            {ai.status === 'streaming' && (
              <div className="chat__msg chat__msg--bot is-typing">
                <Markdown compact>{ai.text}</Markdown>
              </div>
            )}
            {ai.status === 'error' && <div className="chat__error">{ai.error}</div>}

            {!user && (
              <div className="chat__gate">
                <Avatar name="?" />
                <p>Sign in to chat with {bot.name}. Your conversation is saved to your account.</p>
              </div>
            )}

            {user && messages.length === 0 && !ai.busy && (
              <div className="chat__suggest">
                {(bot.suggestions || []).map((s) => (
                  <button key={s} onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="chat__input"
            onSubmit={(e) => {
              e.preventDefault();
              requireAuth(() => send(), `Sign in to chat with ${bot.name}`)();
            }}
          >
            <textarea
              rows={1}
              value={input}
              placeholder={user ? `Message ${bot.name}…` : 'Sign in to start chatting'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  requireAuth(() => send(), `Sign in to chat with ${bot.name}`)();
                }
              }}
              onFocus={requireAuth(() => {}, `Sign in to chat with ${bot.name}`)}
            />
            {ai.busy ? (
              <button type="button" className="chat__send" onClick={ai.stop} aria-label="Stop generating">
                <FiSquare />
              </button>
            ) : (
              <button className="chat__send" disabled={!input.trim()} aria-label="Send">
                <FiSend />
              </button>
            )}
          </form>
        </section>
      )}
    </>
  );
}
