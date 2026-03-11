'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';

function buildCallbackUrl(nextPath = '/') {
  if (typeof window === 'undefined') return undefined;
  const safePath = nextPath.startsWith('/') ? nextPath : '/';
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`;
}

export default function SignInPage() {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState('magic');
  const [magicEmail, setMagicEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) {
        router.replace('/');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (params.get('reset') === 'success') {
      setMessage('Password updated. Sign in with your new password.');
      setError('');
      setActiveMethod('password-signin');
    }

    if (params.get('error') === 'auth_callback_failed') {
      setError('The sign-in link expired or is invalid. Try again.');
      setMessage('');
    }
  }, []);

  const isPasswordSignIn = activeMethod === 'password-signin';
  const isPasswordSignUp = activeMethod === 'password-signup';

  const clearFeedback = () => {
    setError('');
    setMessage('');
  };

  const handleMagicLinkSignIn = async (event) => {
    event.preventDefault();
    clearFeedback();

    const email = magicEmail.trim();
    if (!email) {
      setError('Enter your email address.');
      return;
    }

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildCallbackUrl('/'),
      },
    });
    setIsLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setMessage('Magic link sent. Check your inbox to finish signing in.');
  };

  const handlePasswordAuth = async (event) => {
    event.preventDefault();
    clearFeedback();

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Enter your email.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setIsLoading(true);

    if (isPasswordSignIn) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      setIsLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace('/');
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: buildCallbackUrl('/'),
      },
    });

    setIsLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.replace('/');
      return;
    }

    setMessage('Account created. Check your email to confirm and complete sign in.');
  };

  const handleResetRequest = async (event) => {
    event.preventDefault();
    clearFeedback();

    const email = resetEmail.trim();
    if (!email) {
      setError('Enter your email address.');
      return;
    }

    setIsLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildCallbackUrl('/reset-password'),
    });
    setIsLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Password reset email sent. Open the link in your inbox.');
  };

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold">Sign In</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Use a magic link or email + password. Forgot your password? Start reset here.
        </p>

        <div className="mt-6 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveMethod('magic');
              clearFeedback();
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeMethod === 'magic'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMethod('password-signin');
              clearFeedback();
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isPasswordSignIn
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Email + Password
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMethod('password-signup');
              clearFeedback();
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isPasswordSignUp
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMethod('reset');
              clearFeedback();
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeMethod === 'reset'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Reset
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {message}
          </p>
        )}

        {activeMethod === 'magic' && (
          <form onSubmit={handleMagicLinkSignIn} className="mt-5 space-y-4">
            <div>
              <label htmlFor="magic-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="magic-email"
                type="email"
                autoComplete="email"
                value={magicEmail}
                onChange={(event) => setMagicEmail(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}

        {(isPasswordSignIn || isPasswordSignUp) && (
          <form onSubmit={handlePasswordAuth} className="mt-5 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isPasswordSignIn ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isLoading ? 'Working...' : isPasswordSignIn ? 'Sign In' : 'Create Account'}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setActiveMethod(isPasswordSignIn ? 'password-signup' : 'password-signin');
                  clearFeedback();
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isPasswordSignIn ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMethod('reset');
                  clearFeedback();
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {activeMethod === 'reset' && (
          <form onSubmit={handleResetRequest} className="mt-5 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
