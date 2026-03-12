"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import AuthProvider from "../components/AuthProvider";
import { supabase } from "../utils/supabase";

function TranscriptListContent({ session }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTranscripts() {
      if (!session?.user?.id) {
        if (active) {
          setItems([]);
          setError("");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError("");

      const { data: usageRows, error: usageError } = await supabase
        .from("credits_usage")
        .select("id, youtube_url, video_id, created_at")
        .eq("action", "transcript")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (usageError) {
        setError(usageError.message || "Unable to load transcript history.");
        setItems([]);
        setIsLoading(false);
        return;
      }

      const groupedByUrl = new Map();
      for (const row of usageRows || []) {
        const key = row.youtube_url || row.video_id || row.id;
        if (!groupedByUrl.has(key)) {
          groupedByUrl.set(key, {
            key,
            youtubeUrl: row.youtube_url,
            videoId: row.video_id,
            lastTranscribedAt: row.created_at,
            count: 1,
            transcriptId: null,
          });
        } else {
          const current = groupedByUrl.get(key);
          current.count += 1;
        }
      }

      const uniqueItems = Array.from(groupedByUrl.values());
      const urls = uniqueItems
        .map((item) => item.youtubeUrl)
        .filter(Boolean);

      if (urls.length === 0) {
        setItems(uniqueItems);
        setIsLoading(false);
        return;
      }

      const { data: transcriptRows, error: transcriptError } = await supabase
        .from("transcripts")
        .select("id, youtube_url")
        .in("youtube_url", urls);

      if (!active) return;

      if (transcriptError) {
        setError(transcriptError.message || "Unable to load transcript records.");
        setItems(uniqueItems);
        setIsLoading(false);
        return;
      }

      const transcriptIdByUrl = new Map();
      for (const transcript of transcriptRows || []) {
        transcriptIdByUrl.set(transcript.youtube_url, transcript.id);
      }

      const merged = uniqueItems.map((item) => ({
        ...item,
        transcriptId: item.youtubeUrl ? transcriptIdByUrl.get(item.youtubeUrl) || null : null,
      }));

      setItems(merged);
      setIsLoading(false);
    }

    loadTranscripts();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  if (!session) {
    return (
      <main className="min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
            <Header session={session} />
            <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
              <div className="rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                <h1 className="text-2xl font-semibold">My Transcripts</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Sign in to see your transcript history.
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
              <h1 className="text-2xl font-semibold">My Transcripts</h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Open any transcript to use the same tools (view modes, copy, and AI summary).
              </p>

              {isLoading && (
                <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">Loading transcripts...</p>
              )}
              {error && (
                <p className="mt-5 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              {!isLoading && !error && items.length === 0 && (
                <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
                  No transcripts yet.
                </p>
              )}

              {!isLoading && !error && items.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.key}
                      className="rounded-md border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="flex flex-col gap-2">
                        <a
                          href={item.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
                        >
                          {item.youtubeUrl || `Video ID: ${item.videoId || "unknown"}`}
                        </a>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Transcribed {item.count} time{item.count === 1 ? "" : "s"} • Last on{" "}
                          {new Date(item.lastTranscribedAt).toLocaleString()}
                        </div>
                        {item.transcriptId ? (
                          <Link
                            href={`/transcript/${item.transcriptId}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Open transcript
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-500">
                            Transcript not found in cache yet.
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </main>
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function TranscriptListPage() {
  return <AuthProvider>{(session) => <TranscriptListContent session={session} />}</AuthProvider>;
}
