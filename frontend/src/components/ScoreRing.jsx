export default function ScoreRing({ score, label, tone = 'before' }) {
  const safeScore = score ?? 0;
  const scoreTone = score >= 85 ? 'excellent' : score >= 70 ? 'good' : 'attention';

  const valueColor = {
    excellent: 'text-emerald-600',
    good:      'text-indigo-700',
    attention: 'text-amber-600',
  }[scoreTone];

  const barGradient = tone === 'before'
    ? 'bg-gradient-to-r from-slate-400 to-slate-500'
    : 'bg-gradient-to-r from-blue-400 to-indigo-600';

  const chipStyles = {
    excellent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    good:      'text-indigo-700 bg-indigo-50 border-indigo-200',
    attention: 'text-red-700 bg-red-50 border-red-200',
  }[scoreTone];

  const cardBg = tone === 'before'
    ? 'bg-gradient-to-b from-white to-slate-50'
    : 'bg-gradient-to-b from-white to-blue-50/30';

  return (
    <div className={`p-4.5 border border-slate-200 rounded-2xl ${cardBg}`}>
      <div className="flex items-center justify-between gap-3.5">
        <span className="text-[13px] font-semibold text-slate-600">{label}</span>
        <strong className={`text-3xl tracking-tight ${valueColor}`}>{score ?? '-'}</strong>
      </div>

      {/* Score bar */}
      <div className="mt-4 mb-3.5 w-full h-2.5 rounded-full overflow-hidden bg-slate-200" aria-hidden="true">
        <div
          className={`h-full rounded-full animate-[grow-bar_820ms_ease_both] ${barGradient}`}
          style={{ width: `${safeScore}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-3.5">
        <span className="text-slate-500 text-sm">ATS match score</span>
        <span className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-xs font-bold border ${chipStyles}`}>
          {score >= 85 ? 'Strong' : score >= 70 ? 'Competitive' : 'Needs work'}
        </span>
      </div>
    </div>
  );
}
