import { useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function UploadForm({ onSubmit, submitting }) {
  const [file, setFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [templateKind, setTemplateKind] = useState('sde');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop(acceptedFiles) {
      if (acceptedFiles[0]) {
        setFile(acceptedFiles[0]);
        setError('');
      }
    },
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) { setError('Upload a PDF resume first.'); return; }
    if (!jdText.trim()) { setError('Paste the target job description to continue.'); return; }
    setError('');
    await onSubmit({ file, jdText: jdText.trim(), templateKind });
  }

  return (
    <section className="glass-card p-5.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3.5 pb-4.5 mb-4.5 border-b border-slate-200 max-md:flex-col max-md:items-start">
        <div>
          <p className="m-0 mb-2.5 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">New run</p>
          <h3 className="text-xl leading-tight tracking-tight font-bold text-slate-900 m-0">Upload the resume and target job description</h3>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
            Keep everything in one pass: source resume, target brief, then generate a sharper ATS-aligned draft.
          </p>
        </div>
        <span className="inline-flex items-center justify-center min-h-[28px] px-2.5 rounded-full text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 shrink-0">
          PDF only, max 5 MB
        </span>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">{error}</div>
      )}

      <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
        {/* Upload grid */}
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)] gap-4 max-md:grid-cols-1">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col justify-center items-center gap-2.5 rounded-2xl border-[1.5px] border-dashed p-8 text-center min-h-[220px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] ${
              isDragActive
                ? 'border-blue-300 bg-blue-50/50'
                : 'border-slate-300 bg-gradient-to-b from-white/90 to-slate-50/95'
            }`}
          >
            <input {...getInputProps()} />
            {file ? (
              <>
                <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Resume ready</p>
                <strong className="text-slate-800">{file.name}</strong>
                <p className="m-0 text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB uploaded</p>
              </>
            ) : (
              <>
                <p className="m-0 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Resume upload</p>
                <strong className="text-slate-800">{isDragActive ? 'Release to upload the PDF' : 'Drop your resume here'}</strong>
                <p className="m-0 text-slate-500 text-sm">or click to browse from your computer</p>
              </>
            )}
          </div>

          {/* Hints */}
          <div className="grid gap-3">
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/80">
              <span className="inline-flex mb-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase text-indigo-600">01</span>
              <strong className="block text-slate-800 text-sm">Upload a current resume</strong>
              <p className="mt-1 mb-0 text-sm text-slate-500">Use the version you would send today, even if it still needs tailoring.</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/80">
              <span className="inline-flex mb-2.5 text-[11px] font-extrabold tracking-[0.12em] uppercase text-indigo-600">02</span>
              <strong className="block text-slate-800 text-sm">Paste the full brief</strong>
              <p className="mt-1 mb-0 text-sm text-slate-500">Include responsibilities and requirements so the score reflects real keyword coverage.</p>
            </div>
          </div>
        </div>

        {/* Template select */}
        <label className="flex flex-col gap-2.5">
          <span className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Resume template</span>
          <select
            value={templateKind}
            onChange={(e) => setTemplateKind(e.target.value)}
            id="template-select"
            className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)] focus:border-blue-300 focus:ring-4 focus:ring-blue-500/12 transition-all duration-200 cursor-pointer"
          >
            <option value="sde">Software Engineering</option>
            <option value="ai">AI / ML</option>
            <option value="etc">Other professional</option>
          </select>
        </label>

        {/* JD textarea */}
        <label className="flex flex-col gap-2.5">
          <span className="text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">Target job description</span>
          <textarea
            rows="12"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the complete job description here so HireForge can score the match accurately."
            id="jd-textarea"
            className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-white text-slate-900 resize-y outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)] focus:border-blue-300 focus:ring-4 focus:ring-blue-500/12 transition-all duration-200"
          />
        </label>

        {/* Submit */}
        <div className="flex items-center justify-between gap-3.5">
          <button
            type="submit"
            disabled={submitting}
            id="analyze-btn"
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-700 text-white font-bold shadow-[0_10px_24px_rgba(99,102,241,0.22)] hover:shadow-[0_16px_32px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-65 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitting ? 'Submitting analysis...' : 'Analyze and optimize'}
          </button>
        </div>
      </form>
    </section>
  );
}
