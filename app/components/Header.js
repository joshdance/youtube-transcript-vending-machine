'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = ({ session }) => {
  const pathname = usePathname();
  const [creditsUsed, setCreditsUsed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCredits() {
      if (!session?.access_token) {
        setCreditsUsed(null);
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
          {session && typeof creditsUsed === 'number' && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Credits used: <span className="font-medium">{creditsUsed}</span>
            </div>
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
    </div>
  );
};

export default Header;
