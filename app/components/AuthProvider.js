"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import AuthComponent from "./Auth";

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

  if (!session) {
    return (
      <div className="min-h-screen p-4">
        <h1 className="text-2xl font-bold text-center mb-8">YouTube Transcript Tool</h1>
        <AuthComponent />
      </div>
    );
  }

  return children(session);
} 