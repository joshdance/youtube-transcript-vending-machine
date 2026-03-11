"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

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
      {!session && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link
            href="/signin"
            className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Sign in for additional features
          </Link>
        </div>
      )}
      {children(session)}
    </div>
  );
}
