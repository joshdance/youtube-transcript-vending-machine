"use client";

import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ErrorMessage from "../components/ErrorMessage";
import AuthProvider from "../components/AuthProvider";

// Helper to extract video IDs from YouTube URLs
function extractVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1);
    }
    if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2];
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2];
      }
    }
  } catch {
    return null;
  }
  return null;
}

function MainContent({ session }) {
  const [urls, setUrls] = useState("");
  const [results, setResults] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFetchInfo = async () => {
    setIsLoading(true);
    setError(null);
    setResults("");
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urlList.length === 0) {
      setError("Please enter at least one YouTube URL.");
      setIsLoading(false);
      return;
    }
    const videoIds = urlList.map(extractVideoId).filter(Boolean);
    if (videoIds.length === 0) {
      setError("No valid YouTube video URLs found.");
      setIsLoading(false);
      return;
    }
    try {
      // Use the public oEmbed endpoint for each video
      const infoList = await Promise.all(
        videoIds.map(async (id, idx) => {
          const url = `https://www.youtube.com/watch?v=${id}`;
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          try {
            const resp = await fetch(oembedUrl);
            if (!resp.ok) throw new Error("Not found");
            const data = await resp.json();
            return `#${idx + 1}\nTitle: ${data.title}\nAuthor: ${data.author_name}\nChannel: ${data.author_url}\nURL: ${url}\n---`;
          } catch {
            return `#${idx + 1}\nURL: ${url}\nError: Could not fetch info.`;
          }
        })
      );
      setResults(infoList.join("\n\n"));
    } catch (err) {
      setError("Failed to fetch video info.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (results) {
      navigator.clipboard.writeText(results);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center min-h-screen gap-6 font-[family-name:var(--font-geist-sans)]">
          <Header session={session} />
          <main className="w-full max-w-4xl flex flex-col gap-6 px-4">
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold mb-2">Get YouTube Video Info</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Paste a list of YouTube video URLs (one per line) to fetch their public info.
              </p>
            </div>
            <textarea
              className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[120px]"
              placeholder="https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={isLoading}
            />
            <button
              onClick={handleFetchInfo}
              disabled={isLoading}
              className="py-3 px-6 rounded-md bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors font-medium disabled:opacity-50"
            >
              {isLoading ? "Loading..." : "Get Info"}
            </button>
            <ErrorMessage message={error} />
            {results && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleCopy}
                  className="self-end py-2 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
                >
                  Copy All
                </button>
                <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-700 text-sm overflow-x-auto">
                  {results}
                </pre>
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    </main>
  );
}

export default function GetYouTubeInfoPage() {
  return (
    <AuthProvider>
      {(session) => <MainContent session={session} />}
    </AuthProvider>
  );
} 