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
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-7 max-w-[1380px] mx-auto min-h-screen p-7 max-sm:p-4.5 max-sm:gap-4.5">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="flex flex-col gap-5 sticky top-0 self-start max-h-screen overflow-y-auto scrollbar-thin pb-6 max-lg:static max-lg:max-h-none">
        {/* Brand */}
        <div className="glass-card p-5 flex items-start gap-3.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-[14px] bg-gradient-to-b from-indigo-50 to-indigo-100 text-indigo-700 text-[13px] font-extrabold tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] shrink-0">
            HF
          </div>
          <div>
            <p className="m-0 mb-2 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">HireForge</p>
            <h1 className="text-lg leading-snug tracking-tight font-bold text-slate-900 m-0">Resume intelligence for focused job applications.</h1>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-5">
          {/* Workspace */}
          <div>
            <p className="m-0 mb-2.5 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Workspace</p>
            <div className="flex items-center gap-3 p-3.5 border border-slate-200 rounded-2xl bg-slate-50/80">
              <div className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-amber-50 text-amber-600 font-bold shrink-0">
                {user?.email?.slice(0, 1)?.toUpperCase() || 'H'}
              </div>
              <div className="min-w-0">
                <strong className="block text-slate-800 text-sm">Personal studio</strong>
                <p className="m-0 text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 pt-5 border-t border-slate-200 flex flex-col gap-2.5">
            <button type="button" onClick={handleNewAnalysis} id="new-analysis-btn"
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-700 text-white font-bold shadow-[0_10px_24px_rgba(99,102,241,0.22)] hover:shadow-[0_16px_32px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 active:scale-[0.985] transition-all duration-200">
              New analysis
            </button>
            <button type="button" onClick={logout} id="sign-out-btn"
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-slate-600 border border-slate-200 font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 active:scale-[0.985] transition-all duration-200">
              Sign out
            </button>
          </div>

          {/* History */}
          <div className="mt-5 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Recent runs</p>
                <p className="m-0 mt-1 text-sm text-slate-500">Open a previous optimization session.</p>
              </div>
              <button type="button" onClick={handleRefresh} id="refresh-btn"
                className="px-0 py-0 bg-transparent border-none text-indigo-600 font-bold text-sm cursor-pointer hover:text-indigo-700 transition-colors">
                Refresh
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto scrollbar-thin pr-1">
              {jobs.length === 0 && (
                <p className="m-0 p-4.5 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-500 text-sm">
                  Your previous analyses will appear here.
                </p>
              )}

              {jobs.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => setSelectedJobId(item._id)}
                  className={`relative w-full p-0 overflow-hidden border text-left rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:border-slate-300 ${
                    selectedJobId === item._id
                      ? 'border-blue-200 bg-blue-50/30 shadow-[0_12px_28px_rgba(99,102,241,0.08)]'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Active accent bar */}
                  <div className={`absolute inset-y-0 left-0 w-[3px] bg-indigo-600 transition-opacity duration-200 ${selectedJobId === item._id ? 'opacity-100' : 'opacity-0'}`} />
                  <div className="py-3.5 px-4 pl-[18px]">
                    <div className="flex justify-between gap-3 mb-2 text-xs text-slate-500">
                      <StatusPill status={item.status} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <strong className="block text-slate-800">{item.finalScore ?? item.originalScore ?? 'Pending'} ATS</strong>
                    <span className="text-slate-500 font-mono text-xs">{item._id.slice(0, 12)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────── */}
      <main className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 w-full max-w-[980px]">
          {/* Hero */}
          <section className="glass-card relative overflow-hidden flex justify-between gap-5 p-7.5 max-md:flex-col max-md:items-start max-sm:p-4.5">
            <div className="max-w-[620px]">
              <p className="m-0 mb-2.5 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Analysis Studio</p>
              <h2 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-tight font-bold text-slate-900 m-0">
                Refine every application with a cleaner, more strategic workflow.
              </h2>
              <p className="mt-3 text-slate-500 max-w-[56ch]">
                Upload a resume, compare ATS movement, track processing steps, and review rewrite guidance in one focused workspace.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 self-start max-md:grid-cols-1 max-md:w-full">
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl min-w-[110px]">
                <span className="block text-xs font-semibold text-slate-500">Runs</span>
                <strong className="block mt-1 text-2xl tracking-tight text-slate-900">{jobs.length}</strong>
              </div>
              <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl min-w-[110px]">
                <span className="block text-xs font-semibold text-slate-500">Selected</span>
                <strong className="block mt-1 text-2xl tracking-tight text-slate-900">{selectedJobId ? 'Active' : 'New'}</strong>
              </div>
            </div>
            {/* Decorative gradient orb */}
            <div className="absolute -right-12 -bottom-15 w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.08),transparent_68%)] pointer-events-none" />
          </section>

          {error && (
            <div className="px-4 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
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

/* ── Tiny inline component ─────────────────────────────────────────────────── */
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

function normalizeJobs(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeProgress(progress) {
  return Array.isArray(progress) ? progress : [];
}

function normalizeJob(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return {
    ...payload,
    progress: normalizeProgress(payload.progress),
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : [],
    keywordMap: payload.keywordMap && typeof payload.keywordMap === 'object' && !Array.isArray(payload.keywordMap) ? payload.keywordMap : {},
  };
}

function extractApiError(err, fallback) {
  return err.response?.data?.error || err.message || fallback;
}

function formatDate(value) {
  if (!value) return 'now';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}
