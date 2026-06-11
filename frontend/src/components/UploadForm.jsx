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

    if (!file) {
      setError('Upload a PDF resume first.');
      return;
    }

    if (!jdText.trim()) {
      setError('Paste the target job description to continue.');
      return;
    }

    setError('');
    await onSubmit({ file, jdText: jdText.trim(), templateKind });
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="section-label">New run</p>
          <h3>Upload the resume and target job description</h3>
          <p className="muted section-subcopy">
            Keep everything in one pass: source resume, target brief, then generate a sharper ATS-aligned draft.
          </p>
        </div>
        <span className="meta-badge">PDF only, max 5 MB</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="upload-grid">
          <div
            {...getRootProps()}
            className={`dropzone${isDragActive ? ' dropzone-active' : ''}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <>
                <p className="section-label">Resume ready</p>
                <strong>{file.name}</strong>
                <p className="muted">{(file.size / 1024).toFixed(1)} KB uploaded</p>
              </>
            ) : (
              <>
                <p className="section-label">Resume upload</p>
                <strong>{isDragActive ? 'Release to upload the PDF' : 'Drop your resume here'}</strong>
                <p className="muted">or click to browse from your computer</p>
              </>
            )}
          </div>

          <div className="upload-hints">
            <div className="hint-card">
              <span className="hint-kicker">01</span>
              <strong>Upload a current resume</strong>
              <p className="muted">Use the version you would send today, even if it still needs tailoring.</p>
            </div>
            <div className="hint-card">
              <span className="hint-kicker">02</span>
              <strong>Paste the full brief</strong>
              <p className="muted">Include responsibilities and requirements so the score reflects real keyword coverage.</p>
            </div>
          </div>
        </div>

        <label className="field">
          <span className="section-label">Resume template</span>
          <select
            className="input-field"
            value={templateKind}
            onChange={(event) => setTemplateKind(event.target.value)}
          >
            <option value="sde">Software Engineering</option>
            <option value="ai">AI / ML</option>
            <option value="etc">Other professional</option>
          </select>
        </label>

        <label className="field">
          <span className="section-label">Target job description</span>
          <textarea
            rows="12"
            value={jdText}
            onChange={(event) => setJdText(event.target.value)}
            placeholder="Paste the complete job description here so HireForge can score the match accurately."
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Submitting analysis...' : 'Analyze and optimize'}
          </button>
        </div>
      </form>
    </section>
  );
}
