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
    if (!job?.rewrittenResume) {
      return;
    }

    await navigator.clipboard.writeText(job.rewrittenResume);
  }

  if (loading && !job) {
    return (
      <section className="panel">
        <p className="muted">Loading the analysis...</p>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="panel">
        <p className="muted">Pick an analysis from the left or create a new one.</p>
      </section>
    );
  }

  return (
    <div className="results-layout">
      <section className="panel status-panel run-summary-card">
        <div>
          <div className="run-status-meta">
            <p className="section-label">Run status</p>
            <span className={`status-pill status-${job.status}`}>{job.status}</span>
          </div>
          <h3>{getHeading(job.status)}</h3>
          <p className="muted">Review match movement, rewrite output, and optimization guidance.</p>
          <p className="muted">
            Template: <strong>{formatTemplate(job.templateKind)}</strong>
            {' · '}
            Target ATS: <strong>{job.targetScore || 90}</strong>
          </p>
          <p className="muted mono">{jobId}</p>
        </div>

        <div className="run-summary-actions">
          {job.generatedResumeUrl && (
            <a className="primary-button" href={job.generatedResumeUrl} target="_blank" rel="noreferrer">
              Open Final Resume PDF
            </a>
          )}
          <button type="button" className="ghost-button" onClick={onReset}>
            New analysis
          </button>
        </div>
      </section>

      {(job.originalScore != null || job.finalScore != null) && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Score movement</p>
              <h3>ATS performance snapshot</h3>
            </div>
            <div className="score-delta">
              <span className="score-delta-label">Net change</span>
              <strong>{formatDelta(job.originalScore, job.finalScore)}</strong>
            </div>
          </div>

          <div className="score-grid">
            <ScoreRing score={job.originalScore} label="Before Optimization" tone="before" />
            <div className="score-arrow">→</div>
            <ScoreRing score={job.finalScore} label="After Optimization" tone="after" />
          </div>
        </section>
      )}

      {(job.status === 'queued' || job.status === 'processing' || progress.length > 0) && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Agent progress</p>
              <h3>Current processing timeline</h3>
            </div>
          </div>
          <ProgressFeed steps={progress} status={job.status} />
        </section>
      )}

      {job.generatedResumeUrl && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Final output</p>
              <h3>Generated resume in your LaTeX template</h3>
            </div>
            <a className="ghost-button" href={job.generatedResumeUrl} target="_blank" rel="noreferrer">
              Download PDF
            </a>
          </div>
          <p className="muted">
            This is the final compiled resume PDF using your template layout. The text draft below is only an intermediate artifact.
          </p>
        </section>
      )}

      {job.rewrittenResume && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="section-label">Intermediate draft</p>
              <h3>Optimization content used to build the PDF</h3>
            </div>
            <button type="button" className="ghost-button" onClick={copyResume}>
              Copy text
            </button>
          </div>

          <textarea className="result-textarea" readOnly value={job.rewrittenResume} rows="18" />
        </section>
      )}

      {keywordMap && Object.keys(keywordMap).length > 0 && (
        <section className="panel">
          <KeywordHeatmap keywordMap={keywordMap} />
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="panel">
          <SuggestionCards suggestions={suggestions} />
        </section>
      )}

      {job.status === 'failed' && (
        <div className="alert alert-error">
          {job.errorMessage || 'The worker encountered an error while processing this resume.'}
        </div>
      )}
    </div>
  );
}

function formatTemplate(templateKind) {
  if (templateKind === 'ai') {
    return 'AI / ML';
  }

  if (templateKind === 'etc') {
    return 'Other professional';
  }

  return 'Software engineering';
}

function formatDelta(originalScore, finalScore) {
  if (originalScore == null || finalScore == null) {
    return 'Pending';
  }

  const delta = finalScore - originalScore;

  if (delta === 0) {
    return 'No change';
  }

  return `${delta > 0 ? '+' : ''}${delta} pts`;
}

function getHeading(status) {
  if (status === 'done') {
    return 'Analysis complete';
  }

  if (status === 'processing') {
    return 'Optimizing resume content';
  }

  if (status === 'failed') {
    return 'Analysis failed';
  }

  return 'Queued for processing';
}
