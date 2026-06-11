import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import UploadForm from '../components/UploadForm';
import ResultsPanel from '../components/ResultsPanel';
import { useAuth } from '../context/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const jobStatus = job?.status;

  const loadJobs = useCallback(async (preferredJobId) => {
    try {
      const { data } = await api.get('/jobs');
      const nextJobs = normalizeJobs(data);
      setJobs(nextJobs);
      if (preferredJobId) {
        setSelectedJobId(preferredJobId);
        return;
      }
      setSelectedJobId((current) => current || nextJobs[0]?._id || null);
    } catch (err) {
      setError(extractApiError(err, 'Could not load previous analyses.'));
    }
  }, []);

  const loadJob = useCallback(async (jobId) => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setLoadingJob(true);
    try {
      const { data } = await api.get(`/jobs/${jobId}`);
      setJob(normalizeJob(data));
      setError('');
    } catch (err) {
      setError(extractApiError(err, 'Could not load this analysis.'));
    } finally {
      setLoadingJob(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    loadJob(selectedJobId);
  }, [loadJob, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId || !['queued', 'processing'].includes(jobStatus || '')) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/jobs/${selectedJobId}`);
        const nextJob = normalizeJob(data);
        setJob(nextJob);

        if (!['queued', 'processing'].includes(nextJob?.status)) {
          loadJobs(selectedJobId);
        }
      } catch {
        // Keep polling quiet; the panel already handles visible errors.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobStatus, loadJobs, selectedJobId]);

  useWebSocket(selectedJobId, (message) => {
    const progress = normalizeProgress(message?.progress);
    if (progress.length === 0) {
      return;
    }

    setJob((current) => (
      current
        ? { ...current, progress }
        : current
    ));
  });

  async function handleCreateAnalysis({ file, jdText, templateKind }) {
    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jdText', jdText);
      formData.append('templateKind', templateKind);
      formData.append('targetScore', '90');

      const { data } = await api.post('/upload', formData);
      const optimisticJob = {
        _id: data.jobId,
        status: data.status,
        templateKind: data.templateKind,
        targetScore: data.targetScore,
        progress: [],
        createdAt: new Date().toISOString(),
      };

      setSelectedJobId(data.jobId);
      setJob(optimisticJob);
      setJobs((current) => [optimisticJob, ...normalizeJobs(current).filter((item) => item._id !== data.jobId)]);
    } catch (err) {
      setError(extractApiError(err, 'Upload failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleNewAnalysis() {
    setSelectedJobId(null);
    setJob(null);
    setError('');
  }

  async function handleRefresh() {
    await loadJobs(selectedJobId);
    await loadJob(selectedJobId);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-card sidebar-brand">
          <div className="brand-mark">HF</div>
          <div>
            <p className="eyebrow">HireForge</p>
            <h1>Resume intelligence for focused job applications.</h1>
          </div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-section">
            <p className="section-label">Workspace</p>
            <div className="workspace-card">
              <div className="workspace-avatar">
                {user?.email?.slice(0, 1)?.toUpperCase() || 'H'}
              </div>
              <div>
                <strong>Personal studio</strong>
                <p className="muted">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <button type="button" className="primary-button full-width" onClick={handleNewAnalysis}>
              New analysis
            </button>
            <button type="button" className="ghost-button full-width" onClick={logout}>
              Sign out
            </button>
          </div>

          <div className="sidebar-section">
            <div className="history-header">
              <div>
                <p className="section-label">Recent runs</p>
                <p className="sidebar-helper">Open a previous optimization session.</p>
              </div>
              <button type="button" className="text-button" onClick={handleRefresh}>
                Refresh
              </button>
            </div>

            <div className="history-list">
              {jobs.length === 0 && (
                <p className="empty-state">Your previous analyses will appear here.</p>
              )}

              {jobs.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  className={`history-item${selectedJobId === item._id ? ' active' : ''}`}
                  onClick={() => setSelectedJobId(item._id)}
                >
                  <div className="history-item-accent" />
                  <div className="history-item-content">
                    <div className="history-topline">
                      <span className={`status-pill status-${item.status}`}>{item.status}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <strong>{item.finalScore ?? item.originalScore ?? 'Pending'} ATS</strong>
                    <span className="muted mono">{item._id.slice(0, 12)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <div className="content-frame">
          <section className="hero-card">
            <div className="hero-copy">
              <p className="eyebrow">Analysis Studio</p>
              <h2>Refine every application with a cleaner, more strategic workflow.</h2>
              <p className="muted hero-text">
                Upload a resume, compare ATS movement, track processing steps, and review rewrite guidance
                in one focused workspace.
              </p>
            </div>

            <div className="hero-metrics">
              <div className="hero-metric">
                <span className="hero-metric-label">Runs</span>
                <strong>{jobs.length}</strong>
              </div>
              <div className="hero-metric">
                <span className="hero-metric-label">Selected</span>
                <strong>{selectedJobId ? 'Active' : 'New'}</strong>
              </div>
            </div>
          </section>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {!selectedJobId ? (
            <UploadForm onSubmit={handleCreateAnalysis} submitting={submitting} />
          ) : (
            <ResultsPanel
              job={job}
              jobId={selectedJobId}
              loading={loadingJob}
              onReset={handleNewAnalysis}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function normalizeJobs(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.jobs)) {
    return payload.jobs;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeProgress(progress) {
  return Array.isArray(progress) ? progress : [];
}

function normalizeJob(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return {
    ...payload,
    progress: normalizeProgress(payload.progress),
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
    keywordMap: payload.keywordMap && typeof payload.keywordMap === 'object' && !Array.isArray(payload.keywordMap)
      ? payload.keywordMap
      : {},
  };
}

function extractApiError(err, fallback) {
  return err.response?.data?.error || err.message || fallback;
}

function formatDate(value) {
  if (!value) {
    return 'now';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
