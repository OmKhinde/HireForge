export default function ScoreRing({ score, label, tone = 'before' }) {
  const safeScore = score ?? 0;
  const scoreTone = score >= 85 ? 'excellent' : score >= 70 ? 'good' : 'attention';

  return (
    <div className={`score-card score-card-${tone}`}>
      <div className="score-card-header">
        <span className="score-label">{label}</span>
        <strong className={`score-value score-${scoreTone}`}>{score ?? '-'}</strong>
      </div>

      <div className="score-bar-track" aria-hidden="true">
        <div className={`score-bar-fill score-bar-${tone}`} style={{ width: `${safeScore}%` }} />
      </div>

      <div className="score-card-footer">
        <span className="muted">ATS match score</span>
        <span className={`score-chip score-chip-${scoreTone}`}>
          {score >= 85 ? 'Strong' : score >= 70 ? 'Competitive' : 'Needs work'}
        </span>
      </div>
    </div>
  );
}
