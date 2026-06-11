import { useEffect, useRef } from 'react';

export default function ProgressFeed({ steps = [], status }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  if (steps.length === 0 && status === 'queued') {
    return (
      <div className="terminal-card terminal-empty">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span />
            <span />
            <span />
          </div>
          <span className="terminal-title">agent-log</span>
        </div>
        <p className="terminal-queued">Job queued. A worker will pick it up shortly.</p>
      </div>
    );
  }

  return (
    <div className="terminal-card">
      <div className="terminal-header">
        <div className="terminal-dots">
          <span />
          <span />
          <span />
        </div>
        <span className="terminal-title">optimization-log</span>
      </div>

      {steps.map((step, i) => (
        <div
          key={i}
          className={`terminal-line${i === steps.length - 1 && status === 'processing' ? ' terminal-line-active' : ''}`}
        >
          <span className="terminal-icon">{i === steps.length - 1 && status === 'done' ? '✓' : '→'}</span>
          {step}
        </div>
      ))}
      {status === 'processing' && (
        <div className="terminal-line terminal-line-processing">
          <span className="terminal-icon">◌</span>
          Processing...
        </div>
      )}
      {status === 'done' && (
        <div className="terminal-line terminal-line-success">
          <span className="terminal-icon">✓</span>
          Complete
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
