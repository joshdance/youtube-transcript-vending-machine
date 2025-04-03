"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import AuthComponent from "./Auth";

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      {showAuth && !session ? (
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Sign In (Optional)</h1>
            <button
              onClick={() => setShowAuth(false)}
              className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
          </div>
          <AuthComponent />
        </div>
      ) : (
        <>
          {!session && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sign in for additional features
              </button>
            </div>
          )}
          {children(session)}
        </>
      )}
    </div>
  );
} 