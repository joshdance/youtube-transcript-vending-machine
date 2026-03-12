"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthProvider from "../components/AuthProvider";
import { supabase } from "../utils/supabase";

function buildCallbackUrl(nextPath = "/") {
  if (typeof window === "undefined") return undefined;
  const safePath = nextPath.startsWith("/") ? nextPath : "/";
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(safePath)}`;
}

function ProfileContent({ session }) {
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handleSendReset = async () => {
    setResetError("");
    setResetMessage("");

    const email = session?.user?.email;
    if (!email) {
      setResetError("No email found for this account.");
      return;
    }

    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildCallbackUrl("/reset-password"),
    });
    setIsSendingReset(false);

    if (error) {
      setResetError(error.message || "Failed to send reset email.");
      return;
    }

    setResetMessage("Reset email sent. Open the link in your inbox.");
  };

  if (!session) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
            <Header session={session} />
            <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
              <div className="rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                <h1 className="text-2xl font-semibold">Profile</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Sign in to manage your account and transcripts.
                </p>
                <Link
                  href="/signin"
                  className="inline-block mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Go to Sign In
                </Link>
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
          <Header session={session} />
          <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
            <section className="rounded-lg border border-gray-300 dark:border-gray-700 p-6">
              <h1 className="text-2xl font-semibold">Profile</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Signed in as <span className="font-medium">{session.user.email}</span>
              </p>
              <button
                onClick={handleSendReset}
                disabled={isSendingReset}
                className="mt-5 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {isSendingReset ? "Sending..." : "Send Password Reset Email"}
              </button>
              {resetError && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{resetError}</p>
              )}
              {resetMessage && (
                <p className="mt-3 text-sm text-green-600 dark:text-green-400">{resetMessage}</p>
              )}
            </section>

            <section className="rounded-lg border border-gray-300 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold">Transcripts</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Open your full transcript list on the dedicated page.
              </p>
              <Link
                href="/transcripts"
                className="inline-block mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition-colors"
              >
                Go to /transcripts
              </Link>
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return <AuthProvider>{(session) => <ProfileContent session={session} />}</AuthProvider>;
}
