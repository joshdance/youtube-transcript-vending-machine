"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import AuthProvider from "../../components/AuthProvider";
import TranscriptDisplay from "../../components/TranscriptDisplay";
import AiSummary from "../../components/AiSummary";
import { supabase } from "../../utils/supabase";

function TranscriptDetailsContent({ session }) {
  const params = useParams();
  const transcriptId = params?.id;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcriptRow, setTranscriptRow] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadTranscript() {
      if (!session?.user?.id || !transcriptId) {
        if (active) {
          setTranscriptRow(null);
          setIsLoading(false);
          setError("");
        }
        return;
      }

      setIsLoading(true);
      setError("");

      const { data: transcript, error: transcriptError } = await supabase
        .from("transcripts")
        .select("id, youtube_url, transcript_content, created_at, updated_at")
        .eq("id", transcriptId)
        .maybeSingle();

      if (!active) return;

      if (transcriptError || !transcript) {
        setError(transcriptError?.message || "Transcript not found.");
        setTranscriptRow(null);
        setIsLoading(false);
        return;
      }

      const { data: usageRows, error: usageError } = await supabase
        .from("credits_usage")
        .select("id")
        .eq("action", "transcript")
        .eq("youtube_url", transcript.youtube_url)
        .limit(1);

      if (!active) return;

      if (usageError) {
        setError(usageError.message || "Unable to verify access to this transcript.");
        setTranscriptRow(null);
        setIsLoading(false);
        return;
      }

      if (!usageRows || usageRows.length === 0) {
        setError("This transcript is not in your personal history.");
        setTranscriptRow(null);
        setIsLoading(false);
        return;
      }

      setTranscriptRow(transcript);
      setIsLoading(false);
    }

    loadTranscript();

    return () => {
      active = false;
    };
  }, [session?.user?.id, transcriptId]);

  if (!session) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
            <Header session={session} />
            <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
              <div className="rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                <h1 className="text-2xl font-semibold">Transcript</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Sign in to open your transcript.
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
              <div className="flex flex-col gap-2">
                <Link
                  href="/transcripts"
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Back to My Transcripts
                </Link>
                <h1 className="text-2xl font-semibold">Transcript Details</h1>
              </div>

              {isLoading && (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading transcript...</p>
              )}
              {error && (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              {!isLoading && !error && transcriptRow && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p>
                    YouTube URL:{" "}
                    <a
                      href={transcriptRow.youtube_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                    >
                      {transcriptRow.youtube_url}
                    </a>
                  </p>
                  <p>Last updated: {new Date(transcriptRow.updated_at).toLocaleString()}</p>
                </div>
              )}
            </section>

            {!isLoading && !error && transcriptRow?.transcript_content && (
              <TranscriptDisplay
                transcript={transcriptRow.transcript_content}
                transcriptType="cached"
              />
            )}

            {!isLoading && !error && transcriptRow?.transcript_content && (
              <AiSummary transcript={transcriptRow.transcript_content} />
            )}
          </main>
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function TranscriptDetailsPage() {
  return <AuthProvider>{(session) => <TranscriptDetailsContent session={session} />}</AuthProvider>;
}
