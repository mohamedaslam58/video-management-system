import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Invalid email or password',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-2xl font-bold tracking-wide text-slate-100">
            SENTRY<span className="text-signal-amber">VMS</span>
          </div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">
            Video Management System
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-base-900 border border-base-700 rounded p-6 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100 focus:border-signal-amber outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-base-800 border border-base-600 rounded px-3 py-2 text-sm text-slate-100 focus:border-signal-amber outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-xs text-signal-red bg-signal-red/10 border border-signal-red/30 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal-amber text-base-950 font-semibold text-sm rounded py-2.5 hover:brightness-110 transition disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
