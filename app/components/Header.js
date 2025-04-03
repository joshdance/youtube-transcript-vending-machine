'use client';

import React from 'react';
import { supabase } from '../utils/supabase';

const Header = ({ session }) => {
  return (
    <div className="w-full border-b-2 border-gray-300 dark:border-gray-600">
      <div className="flex justify-between items-center py-2 px-4">
        <h1 className="text-2xl font-bold">Vending Machine Apps</h1>
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