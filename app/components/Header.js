'use client';

import React from 'react';
import { supabase } from '../utils/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Header = ({ session }) => {
  const pathname = usePathname();
  
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
            <Link 
              href="/sievetranscripturl" 
              className={`px-3 py-1 rounded-md transition-colors ${
                pathname === '/sievetranscripturl' 
                  ? 'bg-gray-200 dark:bg-gray-700 font-medium' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Sieve Transcript URL
            </Link>
          </nav>
        </div>
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
  );
};

export default Header; 