'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = ({ session }) => {
  const pathname = usePathname();
  const [creditsUsed, setCreditsUsed] = useState(null);
  const [creditsBalance, setCreditsBalance] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState(10);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const creditOptions = useMemo(() => [10, 25, 50], []);
  const creditsRemaining =
    typeof creditsBalance === 'number' && typeof creditsUsed === 'number'
      ? Math.max(creditsBalance - creditsUsed, 0)
      : null;

  useEffect(() => {
    let cancelled = false;
    async function loadCredits() {
      if (!session?.access_token) {
        setCreditsUsed(null);
        setCreditsBalance(null);
        return;
      }

      try {
        const res = await fetch('/api/credits', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setCreditsUsed(data.creditsUsed ?? 0);
          setCreditsBalance(data.creditsBalance ?? 0);
        }
      } catch {
        // ignore
      }
    }

    loadCredits();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const openPaymentModal = () => {
    setPaymentError('');
    setPaymentSuccess('');
    setIsPaymentOpen(true);
  };

  const closePaymentModal = () => {
    if (isSubmittingPayment) return;
    setIsPaymentOpen(false);
    setPaymentError('');
    setPaymentSuccess('');
  };

  const handleAddCredits = async () => {
    if (!session?.access_token) {
      setPaymentError('Please sign in to add credits.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');
    setPaymentSuccess('');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ credits: selectedPack }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setPaymentError(data.error || 'Unable to start checkout.');
        return;
      }

      if (data?.bypassed) {
        setCreditsUsed(data.creditsUsed ?? creditsUsed ?? 0);
        setCreditsBalance(data.creditsBalance ?? creditsBalance ?? 0);
        setPaymentSuccess(
          `Added ${data.creditsAdded ?? 5} credits (bypass mode).`
        );
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setPaymentError('Unable to start checkout.');
    } catch {
      setPaymentError('Unable to start checkout.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };
  
  return (
    <div className="w-full border-b-2 border-gray-300 dark:border-gray-600">
      <div className="flex justify-between items-center py-2 px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Vending Machine Apps</h1>
          <nav className="flex gap-4">
            <Link 
              href="/" 
              className={`px-3 py-1 rounded-md transition-colors ${
                pathname === '/' 
                  ? 'bg-gray-200 dark:bg-gray-700 font-medium' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Home
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session &&
            typeof creditsUsed === 'number' &&
            typeof creditsBalance === 'number' && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Credits available:{' '}
              <span className="font-medium">{creditsRemaining}</span>
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                Used {creditsUsed}
              </span>
            </div>
          )}
          {session && (
            <button
              onClick={openPaymentModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
            >
              Add Credits
            </button>
          )}
          {session && (
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
      {isPaymentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closePaymentModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-credits-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 id="add-credits-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Add credits
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  This is a fake payment modal. No real charge is made.
                </p>
              </div>
              <button
                onClick={closePaymentModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close add credits modal"
              >
                X
              </button>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Choose a credits pack
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {creditOptions.map((credits) => (
                  <button
                    key={credits}
                    onClick={() => setSelectedPack(credits)}
                    className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedPack === credits
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-indigo-400 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-400'
                    }`}
                  >
                    {credits} credits
                  </button>
                ))}
              </div>
            </div>

            {typeof creditsRemaining === 'number' && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Current credits available: <span className="font-medium">{creditsRemaining}</span>
              </div>
            )}

            {paymentError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {paymentError}
              </div>
            )}
            {paymentSuccess && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {paymentSuccess}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closePaymentModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                disabled={isSubmittingPayment}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredits}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? 'Processing...' : 'Continue to checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
