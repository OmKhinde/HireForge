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
    <div className="min-h-screen grid place-items-center p-7 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-[1120px] grid grid-cols-1 lg:grid-cols-[1.1fr_420px] gap-6">

        {/* Showcase */}
        <section className="glass-card flex flex-col justify-center gap-5 min-h-[620px] p-9 max-lg:min-h-auto max-lg:p-7">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-[14px] bg-gradient-to-b from-indigo-50 to-indigo-100 text-indigo-700 text-[13px] font-extrabold tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            HF
          </div>
          <p className="mb-0 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">HireForge</p>
          <h1 className="text-[clamp(1.75rem,3vw,2.3rem)] leading-[1.12] tracking-tight font-extrabold text-slate-900">
            A sharper application workflow for every role you target.
          </h1>
          <p className="text-slate-500 max-w-[52ch] leading-relaxed">
            Compare ATS movement, review rewrite suggestions, and keep every resume iteration in a clean workspace.
          </p>
          <div className="flex flex-col gap-3.5">
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/80">
              <strong className="text-slate-800">Structured analysis</strong>
              <p className="mt-1 mb-0 text-sm text-slate-500">Track each optimization run with clear status, score movement, and rewrite output.</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-2xl bg-slate-50/80">
              <strong className="text-slate-800">Designed for clarity</strong>
              <p className="mt-1 mb-0 text-sm text-slate-500">A focused light interface that feels more like a real SaaS product than a demo tool.</p>
            </div>
          </div>
        </section>

        {/* Auth Form */}
        <section className="glass-card flex flex-col justify-center p-8">
          <p className="mb-2.5 text-[11px] font-extrabold tracking-[0.14em] uppercase text-orange-800">
            {isRegister ? 'Create account' : 'Welcome back'}
          </p>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight tracking-tight font-bold text-slate-900">
            {isRegister ? 'Set up your workspace' : 'Sign in to continue'}
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-[52ch] leading-relaxed">
            {isRegister ? 'Create a new account to start managing resume optimization runs.' : 'Access your dashboard and reopen previous analyses.'}
          </p>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="login-email"
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)] focus:border-blue-300 focus:ring-4 focus:ring-blue-500/12 transition-all duration-200"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              id="login-password"
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-900 outline-none shadow-[inset_0_1px_2px_rgba(15,23,42,0.02)] focus:border-blue-300 focus:ring-4 focus:ring-blue-500/12 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={loading}
              id="login-submit"
              className="w-full inline-flex items-center justify-center px-4 py-3.5 rounded-2xl bg-gradient-to-b from-indigo-600 to-indigo-700 text-white font-bold shadow-[0_10px_24px_rgba(99,102,241,0.25)] hover:shadow-[0_16px_32px_rgba(99,102,241,0.3)] hover:-translate-y-0.5 active:scale-[0.985] disabled:opacity-65 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-slate-500 text-[13px]">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <span
              onClick={() => setIsRegister(!isRegister)}
              className="text-indigo-600 underline cursor-pointer hover:text-indigo-700 transition-colors"
            >
              {isRegister ? 'Sign in' : 'Register'}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
