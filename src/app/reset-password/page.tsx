'use client';

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase/createClient';
import type { AuthChangeEvent } from '@supabase/supabase-js';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent) => {
        if (event === 'PASSWORD_RECOVERY') {
          setReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {!ready && !success && (
          <p className="text-sm text-gray-400 text-center">
            Validating reset link…
          </p>
        )}

        {ready && !success && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border-2 border-gray-400 bg-[#111] p-6"
          >
            <h1 className="mb-4 text-xl font-semibold text-white">
              Reset password
            </h1>

            <div className="mb-3">
              <label className="mb-1 block text-sm text-gray-300">
                New password
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-500 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm text-gray-300">
                Confirm password
              </label>
              <input
                type="password"
                className="w-full rounded-md border border-gray-500 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="mb-3 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        {success && (
          <div className="rounded-lg border-2 border-gray-400 bg-[#111] p-6 text-center">
            <h1 className="mb-2 text-lg font-semibold text-white">
              Password updated
            </h1>
            <p className="text-sm text-gray-400">
              You can now log in with your new password.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
