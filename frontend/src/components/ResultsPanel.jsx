import KeywordHeatmap from './KeywordHeatmap';
import ProgressFeed from './ProgressFeed';
import ScoreRing from './ScoreRing';
import SuggestionCards from './SuggestionCards';

export default function ResultsPanel({ job, jobId, loading, onReset }) {
  const progress = Array.isArray(job?.progress) ? job.progress : [];
  const suggestions = Array.isArray(job?.suggestions) ? job.suggestions : [];
  const keywordMap = job?.keywordMap && typeof job.keywordMap === 'object' && !Array.isArray(job.keywordMap)
    ? job.keywordMap
    : null;

  async function copyResume() {
    if (!job?.rewrittenResume) return;
    await navigator.clipboard.writeText(job.rewrittenResume);
  }

  if (loading && !job) {
    return (
      <section className="glass-card p-5.5">
        <p className="text-slate-500 m-0">Loading the analysis...</p>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="glass-card p-5.5">
        <p className="text-slate-500 m-0">Pick an analysis from the left or create a new one.</p>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Run Summary */}
      <section className="glass-card p-5.5 flex items-start justify-between gap-5 max-md:flex-col max-md:items-start">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Run status</p>
            <StatusPill status={job.status} />
          </div>
          <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">{getHeading(job.status)}</h3>
          <p className="mt-1 text-sm text-slate-500">Review match movement, rewrite output, and optimization guidance.</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Template: <strong className="text-slate-700">{formatTemplate(job.templateKind)}</strong>
            {' · '}
            Target ATS: <strong className="text-slate-700">{job.targetScore || 90}</strong>
          </p>
          <span className="text-slate-500 font-mono text-xs">{jobId}</span>
        </div>

        <div className="flex items-start gap-2.5 shrink-0">
          {job.generatedResumeUrl && (
            <a href={job.generatedResumeUrl} target="_blank" rel="noreferrer" id="open-pdf-btn"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-700 text-white font-bold text-sm shadow-[0_10px_24px_rgba(99,102,241,0.22)] hover:shadow-[0_16px_32px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200 no-underline">
              Open Final Resume PDF
            </a>
          )}
          <button type="button" onClick={onReset}
            className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white text-slate-600 border border-slate-200 font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 active:scale-[0.985] transition-all duration-200">
            New analysis
          </button>
        </div>
      </section>

      {/* Score Movement */}
      {(job.originalScore != null || job.finalScore != null) && (
        <section className="glass-card p-5.5">
          <div className="flex items-center justify-between gap-3.5 pb-4.5 mb-4.5 border-b border-slate-200 max-md:flex-col max-md:items-start">
            <div>
              <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Score movement</p>
              <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">ATS performance snapshot</h3>
            </div>
            <div className="text-right">
              <span className="block text-xs text-slate-500">Net change</span>
              <strong className="text-slate-800">{formatDelta(job.originalScore, job.finalScore)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4 items-center max-md:grid-cols-1">
            <ScoreRing score={job.originalScore} label="Before Optimization" tone="before" />
            <div className="hidden md:inline-flex items-center justify-center w-[42px] h-[42px] rounded-full bg-slate-100 text-slate-600 text-xl">→</div>
            <ScoreRing score={job.finalScore} label="After Optimization" tone="after" />
          </div>
        </section>
      )}

      {/* Progress timeline */}
      {(job.status === 'queued' || job.status === 'processing' || progress.length > 0) && (
        <section className="glass-card p-5.5">
          <div className="pb-4.5 mb-4.5 border-b border-slate-200">
            <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Agent progress</p>
            <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Current processing timeline</h3>
          </div>
          <ProgressFeed steps={progress} status={job.status} />
        </section>
      )}

      {/* Generated PDF link */}
      {job.generatedResumeUrl && (
        <section className="glass-card p-5.5">
          <div className="flex items-center justify-between gap-3.5 pb-4.5 mb-4.5 border-b border-slate-200 max-md:flex-col max-md:items-start">
            <div>
              <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Final output</p>
              <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Generated resume in your LaTeX template</h3>
            </div>
            <a href={job.generatedResumeUrl} target="_blank" rel="noreferrer"
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white text-slate-600 border border-slate-200 font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 active:scale-[0.985] transition-all duration-200 no-underline shrink-0">
              Download PDF
            </a>
          </div>
          <p className="m-0 text-sm text-slate-500">
            This is the final compiled resume PDF using your template layout. The text draft below is only an intermediate artifact.
          </p>
        </section>
      )}

      {/* Rewritten resume text */}
      {job.rewrittenResume && (
        <section className="glass-card p-5.5">
          <div className="flex items-center justify-between gap-3.5 pb-4.5 mb-4.5 border-b border-slate-200 max-md:flex-col max-md:items-start">
            <div>
              <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Intermediate draft</p>
              <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Optimization content used to build the PDF</h3>
            </div>
            <button type="button" onClick={copyResume}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white text-slate-600 border border-slate-200 font-bold text-sm hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 active:scale-[0.985] transition-all duration-200 shrink-0">
              Copy text
            </button>
          </div>
          <textarea
            readOnly
            value={job.rewrittenResume}
            rows="18"
            className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 font-mono text-sm leading-relaxed min-h-[360px] resize-y outline-none"
          />
        </section>
      )}

      {/* Keyword heatmap */}
      {keywordMap && Object.keys(keywordMap).length > 0 && (
        <section className="glass-card p-5.5">
          <KeywordHeatmap keywordMap={keywordMap} />
        </section>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <section className="glass-card p-5.5">
          <SuggestionCards suggestions={suggestions} />
        </section>
      )}

      {/* Error */}
      {job.status === 'failed' && (
        <div className="px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
          {job.errorMessage || 'The worker encountered an error while processing this resume.'}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const styles = {
    done:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    processing: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    queued:     'text-indigo-700 bg-indigo-50 border-indigo-200',
    failed:     'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <span className={`inline-flex items-center justify-center min-h-[26px] px-2.5 rounded-full text-[11px] font-bold capitalize border ${styles[status] || styles.queued}`}>
      {status}
    </span>
  );
}

function formatTemplate(templateKind) {
  if (templateKind === 'ai') return 'AI / ML';
  if (templateKind === 'etc') return 'Other professional';
  return 'Software engineering';
}

function formatDelta(originalScore, finalScore) {
  if (originalScore == null || finalScore == null) return 'Pending';
  const delta = finalScore - originalScore;
  if (delta === 0) return 'No change';
  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getHeading(status) {
  if (status === 'done') return 'Analysis complete';
  if (status === 'processing') return 'Optimizing resume content';
  if (status === 'failed') return 'Analysis failed';
  return 'Queued for processing';
}
