import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const { login, register } = useAuth();
  const navigate             = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (isRegister) await register(email, password);
      else            await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-showcase">
          <div className="brand-mark">HF</div>
          <p className="eyebrow">HireForge</p>
          <h1 className="auth-title">A sharper application workflow for every role you target.</h1>
          <p className="muted auth-copy">
            Compare ATS movement, review rewrite suggestions, and keep every resume iteration in a clean workspace.
          </p>
          <div className="auth-feature-list">
            <div className="auth-feature-card">
              <strong>Structured analysis</strong>
              <p className="muted">Track each optimization run with clear status, score movement, and rewrite output.</p>
            </div>
            <div className="auth-feature-card">
              <strong>Designed for clarity</strong>
              <p className="muted">A focused light interface that feels more like a real SaaS product than a demo tool.</p>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <p className="eyebrow">{isRegister ? 'Create account' : 'Welcome back'}</p>
          <h2 className="auth-form-title">{isRegister ? 'Set up your workspace' : 'Sign in to continue'}</h2>
          <p className="muted auth-form-copy">
            {isRegister ? 'Create a new account to start managing resume optimization runs.' : 'Access your dashboard and reopen previous analyses.'}
          </p>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="input-field"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="input-field"
            />
            <button type="submit" disabled={loading} className="primary-button full-width">
              {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <span
              onClick={() => setIsRegister(!isRegister)}
              className="auth-switch-link"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
